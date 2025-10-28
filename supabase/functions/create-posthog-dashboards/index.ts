import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const POSTHOG_API_KEY = Deno.env.get('POSTHOG_PROJECT_API_KEY');
    const POSTHOG_HOST = Deno.env.get('POSTHOG_HOST') || 'https://ph.hogflix.dev';

    if (!POSTHOG_API_KEY) {
      throw new Error('POSTHOG_PROJECT_API_KEY is not configured');
    }

    console.log('[CREATE-DASHBOARDS] Starting dashboard creation process');

    // Get project ID from PostHog
    const projectResponse = await fetch(`${POSTHOG_HOST}/api/projects/@current/`, {
      headers: {
        'Authorization': `Bearer ${POSTHOG_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!projectResponse.ok) {
      const errorText = await projectResponse.text();
      console.error('[CREATE-DASHBOARDS] Failed to get project:', errorText);
      throw new Error(`Failed to get project: ${errorText}`);
    }

    const project = await projectResponse.json();
    const projectId = project.id;
    console.log('[CREATE-DASHBOARDS] Project ID:', projectId);

    // ==================== CREATE DASHBOARD ====================
    console.log('[CREATE-DASHBOARDS] Creating dashboard...');

    const dashboardResponse = await fetch(`${POSTHOG_HOST}/api/projects/${projectId}/dashboards/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${POSTHOG_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'E-Commerce Analytics',
        description: 'Key metrics for hedgehog product sales',
      }),
    });

    if (!dashboardResponse.ok) {
      const errorText = await dashboardResponse.text();
      console.error('[CREATE-DASHBOARDS] Failed to create dashboard:', errorText);
      throw new Error(`Failed to create dashboard: ${errorText}`);
    }

    const dashboard = await dashboardResponse.json();
    console.log('[CREATE-DASHBOARDS] ✓ Created dashboard:', dashboard.id);

    // ==================== CREATE INSIGHTS ====================
    const insights = [
      {
        name: 'Product Views Trend',
        description: 'Daily product views over time',
        query: {
          kind: 'TrendsQuery',
          series: [
            {
              kind: 'EventsNode',
              event: 'product_viewed',
              name: 'Product Viewed'
            }
          ],
          dateRange: {
            date_from: '-30d'
          }
        }
      },
      {
        name: 'Purchase Funnel',
        description: 'Conversion from view to purchase',
        query: {
          kind: 'FunnelsQuery',
          series: [
            {
              kind: 'EventsNode',
              event: 'product_viewed',
              name: 'Product Viewed'
            },
            {
              kind: 'EventsNode',
              event: 'add_to_cart',
              name: 'Added to Cart'
            },
            {
              kind: 'EventsNode',
              event: 'purchase_completed',
              name: 'Purchase Completed'
            }
          ],
          dateRange: {
            date_from: '-30d'
          },
          funnelsFilter: {
            funnelVizType: 'steps'
          }
        }
      },
      {
        name: 'Cart Additions',
        description: 'Items added to cart',
        query: {
          kind: 'TrendsQuery',
          series: [
            {
              kind: 'EventsNode',
              event: 'add_to_cart',
              name: 'Add to Cart'
            }
          ],
          dateRange: {
            date_from: '-30d'
          }
        }
      }
    ];

    const createdInsights = [];
    
    for (const insight of insights) {
      console.log(`[CREATE-DASHBOARDS] Creating insight: ${insight.name}`);
      
      const insightResponse = await fetch(`${POSTHOG_HOST}/api/projects/${projectId}/insights/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${POSTHOG_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(insight),
      });

      if (!insightResponse.ok) {
        const errorText = await insightResponse.text();
        console.error(`[CREATE-DASHBOARDS] Failed to create insight ${insight.name}:`, errorText);
        continue;
      }

      const createdInsight = await insightResponse.json();
      createdInsights.push(createdInsight);
      console.log(`[CREATE-DASHBOARDS] ✓ Created insight: ${createdInsight.name} (${createdInsight.id})`);
    }

    // ==================== ADD INSIGHTS TO DASHBOARD ====================
    console.log('[CREATE-DASHBOARDS] Adding insights to dashboard...');

    for (let i = 0; i < createdInsights.length; i++) {
      const insight = createdInsights[i];
      
      const tileResponse = await fetch(`${POSTHOG_HOST}/api/projects/${projectId}/dashboards/${dashboard.id}/tiles/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${POSTHOG_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          insight: insight.id,
        }),
      });

      if (!tileResponse.ok) {
        const errorText = await tileResponse.text();
        console.error(`[CREATE-DASHBOARDS] Failed to add insight ${insight.name} to dashboard:`, errorText);
      } else {
        console.log(`[CREATE-DASHBOARDS] ✓ Added ${insight.name} to dashboard`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Successfully created dashboard with insights',
        dashboard: {
          id: dashboard.id,
          name: dashboard.name,
          url: `${POSTHOG_HOST}/project/${projectId}/dashboard/${dashboard.id}`,
        },
        insights: createdInsights.map(i => ({
          id: i.id,
          name: i.name,
        })),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[CREATE-DASHBOARDS] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
