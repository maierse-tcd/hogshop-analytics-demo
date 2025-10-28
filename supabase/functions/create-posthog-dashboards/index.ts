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

    // ==================== TEST: CREATE SINGLE INSIGHT ====================
    console.log('[CREATE-DASHBOARDS] Creating test insight with new query schema...');

    const testInsight = {
      name: 'Product Views Trend',
      description: 'Simple trend query to test insight creation',
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
          date_from: '-7d'
        }
      }
    };

    const response = await fetch(`${POSTHOG_HOST}/api/projects/${projectId}/insights/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${POSTHOG_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testInsight),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CREATE-DASHBOARDS] Failed to create insight. Status:', response.status);
      console.error('[CREATE-DASHBOARDS] Response:', errorText);
      console.error('[CREATE-DASHBOARDS] Request body:', JSON.stringify(testInsight, null, 2));
      throw new Error(`Failed to create insight (${response.status}): ${errorText}`);
    }

    const createdInsight = await response.json();
    console.log('[CREATE-DASHBOARDS] ✓ Successfully created insight:', createdInsight.name, createdInsight.id);
    console.log('[CREATE-DASHBOARDS] Insight URL:', `${POSTHOG_HOST}/project/${projectId}/insights/${createdInsight.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Successfully created test insight',
        insight: {
          id: createdInsight.id,
          name: createdInsight.name,
          url: `${POSTHOG_HOST}/project/${projectId}/insights/${createdInsight.id}`,
        },
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
