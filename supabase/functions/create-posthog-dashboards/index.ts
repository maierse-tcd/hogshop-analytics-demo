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

    // ==================== CLEANUP FUNCTIONS ====================
    
    // Helper function to delete all existing dashboards
    const deleteAllDashboards = async () => {
      console.log('[CREATE-DASHBOARDS] Fetching existing dashboards...');
      const response = await fetch(`${POSTHOG_HOST}/api/projects/${projectId}/dashboards/`, {
        headers: {
          'Authorization': `Bearer ${POSTHOG_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('[CREATE-DASHBOARDS] Failed to fetch dashboards');
        return;
      }

      const data = await response.json();
      const dashboards = data.results || [];
      console.log(`[CREATE-DASHBOARDS] Found ${dashboards.length} existing dashboards to delete`);

      for (const dashboard of dashboards) {
        console.log(`[CREATE-DASHBOARDS] Deleting dashboard: ${dashboard.name} (${dashboard.id})`);
        const deleteResponse = await fetch(`${POSTHOG_HOST}/api/projects/${projectId}/dashboards/${dashboard.id}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${POSTHOG_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (deleteResponse.ok) {
          console.log(`[CREATE-DASHBOARDS] ✓ Deleted dashboard: ${dashboard.name}`);
        } else {
          console.error(`[CREATE-DASHBOARDS] ✗ Failed to delete dashboard: ${dashboard.name}`);
        }
      }
    };

    // Helper function to delete all existing insights
    const deleteAllInsights = async () => {
      console.log('[CREATE-DASHBOARDS] Fetching existing insights...');
      const response = await fetch(`${POSTHOG_HOST}/api/projects/${projectId}/insights/?limit=300`, {
        headers: {
          'Authorization': `Bearer ${POSTHOG_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('[CREATE-DASHBOARDS] Failed to fetch insights');
        return;
      }

      const data = await response.json();
      const insights = data.results || [];
      console.log(`[CREATE-DASHBOARDS] Found ${insights.length} existing insights to delete`);

      for (const insight of insights) {
        console.log(`[CREATE-DASHBOARDS] Deleting insight: ${insight.name} (${insight.id})`);
        const deleteResponse = await fetch(`${POSTHOG_HOST}/api/projects/${projectId}/insights/${insight.id}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${POSTHOG_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (deleteResponse.ok) {
          console.log(`[CREATE-DASHBOARDS] ✓ Deleted insight: ${insight.name}`);
        } else {
          console.error(`[CREATE-DASHBOARDS] ✗ Failed to delete insight: ${insight.name}`);
        }
      }
    };

    // Execute cleanup before creating new dashboards/insights
    console.log('[CREATE-DASHBOARDS] Starting cleanup process...');
    await deleteAllDashboards();
    await deleteAllInsights();
    console.log('[CREATE-DASHBOARDS] Cleanup complete. Starting creation process...');

    // ==================== HELPER FUNCTIONS ====================

    // Helper function to create insights
    const createInsight = async (insightData: any) => {
      const response = await fetch(`${POSTHOG_HOST}/api/projects/${projectId}/insights/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${POSTHOG_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(insightData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CREATE-DASHBOARDS] Failed to create insight:', insightData.name, errorText);
        throw new Error(`Failed to create insight: ${errorText}`);
      }

      const insight = await response.json();
      console.log('[CREATE-DASHBOARDS] Created insight:', insight.name, insight.id);
      return insight;
    };

    // Helper function to create dashboard with tiles
    const createDashboard = async (name: string, description: string, insights: any[]) => {
      // Create dashboard with tiles in one call
      const tiles = insights.map((insight, index) => ({
        insight: insight.id,
        layouts: {},
        color: null,
      }));

      const response = await fetch(`${POSTHOG_HOST}/api/projects/${projectId}/dashboards/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${POSTHOG_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          pinned: true,
          tiles,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CREATE-DASHBOARDS] Failed to create dashboard:', name, errorText);
        throw new Error(`Failed to create dashboard: ${errorText}`);
      }

      const dashboard = await response.json();
      console.log(`[CREATE-DASHBOARDS] Created dashboard with ${tiles.length} tiles:`, dashboard.name, dashboard.id);
      return dashboard;
    };

    const createdInsights: any[] = [];
    const createdDashboards: any[] = [];

    // ==================== REVENUE & CONVERSIONS INSIGHTS ====================
    console.log('[CREATE-DASHBOARDS] Creating Revenue & Conversions insights...');

    // Purchase Funnel
    const purchaseFunnel = await createInsight({
      name: 'Purchase Funnel',
      description: 'Conversion rates from product view to purchase',
      filters: {
        insight: 'FUNNELS',
        events: [
          { id: 'product_viewed', name: 'Product Viewed', type: 'events', order: 0 },
          { id: 'add_to_cart', name: 'Add to Cart', type: 'events', order: 1 },
          { id: 'checkout_initiated', name: 'Checkout Initiated', type: 'events', order: 2 },
          { id: 'purchase_completed', name: 'Purchase Completed', type: 'events', order: 3 },
        ],
        funnel_viz_type: 'steps',
        date_from: '-30d',
      },
    });
    createdInsights.push(purchaseFunnel);

    // Purchase Completed Over Time
    const purchaseTrend = await createInsight({
      name: 'Purchases Over Time',
      description: 'Daily purchases trend',
      filters: {
        insight: 'TRENDS',
        events: [{ id: 'purchase_completed', name: 'Purchase Completed', type: 'events' }],
        interval: 'day',
        date_from: '-30d',
        display: 'ActionsLineGraph',
      },
    });
    createdInsights.push(purchaseTrend);

    // Revenue Over Time (if using Stripe)
    const revenueTrend = await createInsight({
      name: 'Revenue Over Time',
      description: 'Total revenue from purchases',
      filters: {
        insight: 'TRENDS',
        events: [{
          id: 'purchase_completed',
          name: 'Purchase Completed',
          type: 'events',
          math: 'sum',
          math_property: 'total_amount',
        }],
        interval: 'day',
        date_from: '-30d',
        display: 'ActionsLineGraph',
      },
    });
    createdInsights.push(revenueTrend);

    // Average Order Value
    const avgOrderValue = await createInsight({
      name: 'Average Order Value',
      description: 'Average purchase amount over time',
      filters: {
        insight: 'TRENDS',
        events: [{
          id: 'purchase_completed',
          name: 'Purchase Completed',
          type: 'events',
          math: 'avg',
          math_property: 'total_amount',
        }],
        interval: 'day',
        date_from: '-30d',
        display: 'ActionsLineGraph',
      },
    });
    createdInsights.push(avgOrderValue);

    // Cart Abandonment Rate
    const cartAbandonment = await createInsight({
      name: 'Cart Abandonment Rate',
      description: 'Users who added to cart but did not purchase',
      filters: {
        insight: 'FUNNELS',
        events: [
          { id: 'add_to_cart', name: 'Add to Cart', type: 'events', order: 0 },
          { id: 'purchase_completed', name: 'Purchase Completed', type: 'events', order: 1 },
        ],
        funnel_viz_type: 'steps',
        date_from: '-30d',
      },
    });
    createdInsights.push(cartAbandonment);

    // Create Revenue & Conversions Dashboard
    const revenueDashboard = await createDashboard(
      '💰 Revenue & Conversions',
      'Track purchase funnel, revenue trends, and conversion metrics',
      createdInsights.slice(0, 5)
    );
    createdDashboards.push(revenueDashboard);

    // ==================== USER ENGAGEMENT INSIGHTS ====================
    console.log('[CREATE-DASHBOARDS] Creating User Engagement insights...');

    // Daily Active Users
    const dau = await createInsight({
      name: 'Daily Active Users',
      description: 'Number of unique users per day',
      filters: {
        insight: 'TRENDS',
        events: [{ id: '$pageview', name: 'Pageview', type: 'events', math: 'dau' }],
        interval: 'day',
        date_from: '-30d',
        display: 'ActionsLineGraph',
      },
    });
    createdInsights.push(dau);

    // Page Views Over Time
    const pageviews = await createInsight({
      name: 'Page Views',
      description: 'Total pageviews over time',
      filters: {
        insight: 'TRENDS',
        events: [{ id: '$pageview', name: 'Pageview', type: 'events' }],
        interval: 'day',
        date_from: '-30d',
        display: 'ActionsLineGraph',
      },
    });
    createdInsights.push(pageviews);

    // User Retention
    const retention = await createInsight({
      name: 'User Retention',
      description: 'How many users come back after their first visit',
      filters: {
        insight: 'RETENTION',
        target_entity: { id: '$pageview', name: 'Pageview', type: 'events' },
        returning_entity: { id: '$pageview', name: 'Pageview', type: 'events' },
        retention_type: 'retention_first_time',
        date_from: '-8w',
        period: 'Week',
      },
    });
    createdInsights.push(retention);

    // Top Pages
    const topPages = await createInsight({
      name: 'Top Pages',
      description: 'Most visited pages',
      filters: {
        insight: 'TRENDS',
        events: [{ id: '$pageview', name: 'Pageview', type: 'events' }],
        breakdown: '$current_url',
        date_from: '-30d',
        display: 'ActionsBar',
      },
    });
    createdInsights.push(topPages);

    // Session Duration
    const sessionDuration = await createInsight({
      name: 'Session Duration',
      description: 'Average time users spend on site',
      filters: {
        insight: 'TRENDS',
        events: [{
          id: '$pageview',
          name: 'Pageview',
          type: 'events',
          math: 'avg',
          math_property: '$session_duration',
        }],
        interval: 'day',
        date_from: '-30d',
        display: 'ActionsLineGraph',
      },
    });
    createdInsights.push(sessionDuration);

    // Create User Engagement Dashboard
    const engagementDashboard = await createDashboard(
      '📊 User Engagement',
      'Monitor user activity, retention, and engagement metrics',
      createdInsights.slice(5, 10)
    );
    createdDashboards.push(engagementDashboard);

    // ==================== PRODUCT ANALYTICS INSIGHTS ====================
    console.log('[CREATE-DASHBOARDS] Creating Product Analytics insights...');

    // Most Viewed Products
    const mostViewedProducts = await createInsight({
      name: 'Most Viewed Products',
      description: 'Products with the most views',
      filters: {
        insight: 'TRENDS',
        events: [{ id: 'product_viewed', name: 'Product Viewed', type: 'events' }],
        breakdown: 'product_name',
        date_from: '-30d',
        display: 'ActionsBar',
      },
    });
    createdInsights.push(mostViewedProducts);

    // Add to Cart Rate
    const addToCartRate = await createInsight({
      name: 'Add to Cart Rate',
      description: 'Percentage of product views that result in cart adds',
      filters: {
        insight: 'FUNNELS',
        events: [
          { id: 'product_viewed', name: 'Product Viewed', type: 'events', order: 0 },
          { id: 'add_to_cart', name: 'Add to Cart', type: 'events', order: 1 },
        ],
        funnel_viz_type: 'steps',
        date_from: '-30d',
      },
    });
    createdInsights.push(addToCartRate);

    // Product Performance
    const productPerformance = await createInsight({
      name: 'Product Purchase Performance',
      description: 'Products by purchase count',
      filters: {
        insight: 'TRENDS',
        events: [{ id: 'purchase_completed', name: 'Purchase Completed', type: 'events' }],
        breakdown: 'product_name',
        date_from: '-30d',
        display: 'ActionsBar',
      },
    });
    createdInsights.push(productPerformance);

    // Newsletter Signups
    const newsletterSignups = await createInsight({
      name: 'Newsletter Signups',
      description: 'Newsletter subscription trend',
      filters: {
        insight: 'TRENDS',
        events: [{ id: 'newsletter_signup', name: 'Newsletter Signup', type: 'events' }],
        interval: 'day',
        date_from: '-30d',
        display: 'ActionsLineGraph',
      },
    });
    createdInsights.push(newsletterSignups);

    // Create Product Analytics Dashboard
    const productDashboard = await createDashboard(
      '🛍️ Product Analytics',
      'Analyze product views, conversions, and performance',
      createdInsights.slice(10, 14)
    );
    createdDashboards.push(productDashboard);

    // ==================== SUBSCRIPTION METRICS INSIGHTS ====================
    console.log('[CREATE-DASHBOARDS] Creating Subscription Metrics insights...');

    // Active Subscriptions
    const activeSubscriptions = await createInsight({
      name: 'Active Subscriptions',
      description: 'Users with active subscriptions over time',
      filters: {
        insight: 'TRENDS',
        events: [{ id: 'purchase_completed', name: 'Purchase Completed', type: 'events' }],
        properties: [{ key: 'has_subscription', value: ['true'], operator: 'exact', type: 'event' }],
        interval: 'day',
        date_from: '-30d',
        display: 'ActionsLineGraph',
      },
    });
    createdInsights.push(activeSubscriptions);

    // Subscription Cancellations
    const subscriptionCancellations = await createInsight({
      name: 'Subscription Cancellations',
      description: 'Subscription cancellation events',
      filters: {
        insight: 'TRENDS',
        events: [{ id: 'subscription_cancelled', name: 'Subscription Cancelled', type: 'events' }],
        interval: 'day',
        date_from: '-30d',
        display: 'ActionsLineGraph',
      },
    });
    createdInsights.push(subscriptionCancellations);

    // Subscription vs One-Time Purchases
    const purchaseTypes = await createInsight({
      name: 'Subscription vs One-Time',
      description: 'Breakdown of purchase types',
      filters: {
        insight: 'TRENDS',
        events: [{ id: 'purchase_completed', name: 'Purchase Completed', type: 'events' }],
        breakdown: 'has_subscription',
        date_from: '-30d',
        display: 'ActionsBar',
      },
    });
    createdInsights.push(purchaseTypes);

    // Customer Lifecycle Groups
    const lifecycleGroups = await createInsight({
      name: 'Customer Lifecycle Distribution',
      description: 'Breakdown of customers by lifecycle stage',
      filters: {
        insight: 'TRENDS',
        events: [{ id: 'purchase_completed', name: 'Purchase Completed', type: 'events' }],
        breakdown: '$groups',
        breakdown_group_type_index: 0,
        date_from: '-30d',
        display: 'ActionsBar',
      },
    });
    createdInsights.push(lifecycleGroups);

    // Create Subscription Metrics Dashboard
    const subscriptionDashboard = await createDashboard(
      '🔄 Subscription Metrics',
      'Track subscription lifecycle, churn, and recurring revenue',
      createdInsights.slice(14, 18)
    );
    createdDashboards.push(subscriptionDashboard);

    // ==================== USER BEHAVIOR INSIGHTS ====================
    console.log('[CREATE-DASHBOARDS] Creating User Behavior insights...');

    // User Paths
    const userPaths = await createInsight({
      name: 'User Navigation Paths',
      description: 'Common paths users take through the site',
      filters: {
        insight: 'PATHS',
        start_point: '/',
        date_from: '-30d',
      },
    });
    createdInsights.push(userPaths);

    // Stickiness (DAU/MAU)
    const stickiness = await createInsight({
      name: 'User Stickiness',
      description: 'How often users return (DAU/MAU ratio)',
      filters: {
        insight: 'STICKINESS',
        events: [{ id: '$pageview', name: 'Pageview', type: 'events' }],
        date_from: '-30d',
      },
    });
    createdInsights.push(stickiness);

    // Lifecycle Analysis
    const lifecycle = await createInsight({
      name: 'User Lifecycle',
      description: 'New, returning, resurrecting, and dormant users',
      filters: {
        insight: 'LIFECYCLE',
        events: [{ id: '$pageview', name: 'Pageview', type: 'events' }],
        date_from: '-30d',
        interval: 'day',
      },
    });
    createdInsights.push(lifecycle);

    // Browser Distribution
    const browsers = await createInsight({
      name: 'Browser Distribution',
      description: 'Users by browser type',
      filters: {
        insight: 'TRENDS',
        events: [{ id: '$pageview', name: 'Pageview', type: 'events', math: 'dau' }],
        breakdown: '$browser',
        date_from: '-30d',
        display: 'ActionsPie',
      },
    });
    createdInsights.push(browsers);

    // Device Type Distribution
    const devices = await createInsight({
      name: 'Device Type Distribution',
      description: 'Users by device type (desktop/mobile)',
      filters: {
        insight: 'TRENDS',
        events: [{ id: '$pageview', name: 'Pageview', type: 'events', math: 'dau' }],
        breakdown: '$device_type',
        date_from: '-30d',
        display: 'ActionsPie',
      },
    });
    createdInsights.push(devices);

    // Create User Behavior Dashboard
    const behaviorDashboard = await createDashboard(
      '🎯 User Behavior',
      'Understand user paths, stickiness, and lifecycle patterns',
      createdInsights.slice(18, 23)
    );
    createdDashboards.push(behaviorDashboard);

    console.log('[CREATE-DASHBOARDS] Dashboard creation complete!');
    console.log('[CREATE-DASHBOARDS] Created', createdInsights.length, 'insights');
    console.log('[CREATE-DASHBOARDS] Created', createdDashboards.length, 'dashboards');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${createdInsights.length} insights across ${createdDashboards.length} dashboards`,
        dashboards: createdDashboards.map(d => ({
          id: d.id,
          name: d.name,
          url: `${POSTHOG_HOST}/project/${projectId}/dashboard/${d.id}`,
        })),
        insights_count: createdInsights.length,
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
