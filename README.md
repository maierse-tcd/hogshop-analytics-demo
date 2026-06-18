# Hogshop - PostHog Analytics Technical Demo

A comprehensive e-commerce demonstration platform built to showcase PostHog's product analytics, AI analytics, feature flags, experiments, and session replay capabilities. This technical demo implements advanced tracking patterns and real-world experimentation scenarios.

**Mascot**: Max the Hedgehog

## Technical Overview

Hogshop serves as a production-grade reference implementation for PostHog integration, demonstrating:
- **Product Analytics**: Complete event taxonomy with structured properties and custom metrics
- **AI/LLM Analytics**: Full AI trace tracking with token usage, cost, and quality metrics
- **Feature Flags**: Dynamic feature toggling with variant-based A/B testing
- **Web Experiments**: No-code experiment support with proper flag evaluation
- **Session Replay**: Full session recording with console logs and network requests
- **Error Tracking**: Exception capture with stack traces and user context
- **Survey Implementation**: Exit intent and NPS surveys with proper event formatting

## Architecture

### Frontend Stack
- **Framework**: React 18.3 with TypeScript 5.x
- **Build Tool**: Vite 6.x with ESM modules
- **Styling**: Tailwind CSS 3.x with shadcn/ui component library
- **State Management**: React Context API + TanStack Query v5
- **Routing**: React Router v6 with nested routes

### Backend Infrastructure
- **Platform**: Lovable Cloud (Supabase infrastructure)
- **Database**: PostgreSQL 15 with Row Level Security
- **Edge Functions**: Deno runtime on Supabase Edge Network
- **AI Integration**: Lovable AI Gateway (Google Gemini 2.5 Flash)
- **Payment Processing**: Stripe Checkout with webhook validation

### Analytics Configuration
- **PostHog SDK**: posthog-js v1.280+
- **Capture Mode**: Autocapture enabled + custom events
- **Session Replay**: Enabled with canvas recording
- **Feature Flags**: React hooks integration with SSR support
- **Person Profiles**: Automatic identification on events

## Product Catalog

Hogshop features 18 hedgehog care products across 6 categories:

### Food & Nutrition (3)
- Premium Hedgehog Food (Subscription) - $29.99/month
- Hedgehog Treat Pack - $14.99
- Freeze-Dried Mealworms - $12.99

### Housing (3)
- Deluxe Hedgehog Habitat - $129.99
- Hedgehog Travel Carrier - $44.99
- Luxury Hedgehog Mansion - $249.99

### Toys & Exercise (3)
- Hedgehog Exercise Wheel - $39.99
- Climbing Adventure Set - $59.99
- Interactive Play Set - $34.99

### Care & Grooming (3)
- Care Starter Kit - $79.99
- Ceramic Food & Water Bowls - $19.99
- Premium Grooming Kit - $29.99

### Bedding & Comfort (3)
- Cozy Hedgehog Hideout - $24.99
- Hedgehog Sleeping Bag - $34.99
- Soft Fleece Bedding - $22.99

### Merchandise (3)
- Hedgehog Plushie - $29.99
- Hedgehog Lover T-Shirt - $24.99
- Hedgehog Coffee Mug - $16.99

## Event Taxonomy

### Core E-commerce Events

```typescript
// Page view tracking
page_view: {
  page: string
  path: string
  referrer: string
}

// Product catalog
products_viewed: {
  product_count: number
  category_filter?: string
}

// Product interaction
product_viewed: {
  product_id: string
  product_name: string
  price: number
  category: string
}

// Cart operations
add_to_cart: {
  product_id: string
  product_name: string
  price: number
  quantity: number
  is_subscription: boolean
}

remove_from_cart: {
  product_id: string
  product_name: string
  quantity: number
}

// Checkout flow
checkout_started: {
  cart_total: number
  item_count: number
  contains_subscription: boolean
}

purchase_completed: {
  session_id: string
  total_amount: number
  items: Array<{id, name, price, quantity}>
  customer_lifetime_value: number
}
```

### AI/LLM Analytics Events

```typescript
// AI chat interaction
$ai_generation: {
  $ai_trace_id: string          // Unique trace identifier
  $ai_conversation_id: string   // Conversation grouping
  $ai_model: string             // "google/gemini-2.5-flash"
  $ai_input: string             // User prompt
  $ai_output: string            // Complete AI response
  $ai_output_choices: string[]  // Response variants
  $ai_total_cost_usd: number    // Cost in USD
  $ai_input_tokens: number      // Prompt token count
  $ai_output_tokens: number     // Completion token count
  $ai_total_tokens: number      // Total token usage
}

// AI trace lifecycle
$ai_trace: {
  $ai_trace_id: string
  trace_started_at: number
  trace_ended_at: number
  total_interactions: number
  total_cost_usd: number
  total_tokens: number
}

// AI interaction tracking
ai_chat_opened: {
  source: string
  session_id: string
}

ai_message_sent: {
  message_length: number
  conversation_id: string
}
```

### Survey Events

```typescript
// Exit intent survey
survey_shown: {
  $survey_id: string
  $survey_name: string
  $survey_response: object
}

// NPS survey
survey_shown: {
  $survey_id: string
  $survey_name: string
  $survey_response: number  // 0-10 score
}
```

### Error Tracking

```typescript
$exception: {
  $exception_message: string
  $exception_type: string
  $exception_source: string
  $exception_personURL: string
}
```

## Feature Flags Configuration

### Required Flags

Create these flags in PostHog for full demo functionality:

| Flag Key | Type | Purpose |
|----------|------|---------|
| `show_chatbot` | Boolean | Enable AI chat widget |
| `show_newsletter` | Boolean | Display newsletter signup modal |
| `newsletter_sub` | Multivariate | A/B test newsletter CTA (control/test) |
| `product-card-design-v2` | Boolean | Horizontal product card layout |
| `seasonal-discount-banner` | Boolean | Show promotional banner |
| `hero_banner_halloween` | Boolean | Halloween seasonal theme |
| `hero_banner_christmas` | Boolean | Christmas seasonal theme |
| `hero_banner_easter` | Boolean | Easter seasonal theme |
| `hero_banner_summer` | Boolean | Summer seasonal theme |

### Flag Evaluation

```typescript
// React hooks usage
const showChatbot = useFeatureFlagEnabled('show_chatbot');
const newsletterVariant = useFeatureFlagVariantKey('newsletter_sub');

// Feature interaction tracking
posthog.capture('$feature_interaction', {
  feature_flag: 'newsletter_sub',
  $set: { [`$feature_interaction/newsletter_sub`]: true }
});
```

## PostHog Configuration

### Initialization

```typescript
posthog.init('YOUR_PROJECT_API_KEY', {
  api_host: 'https://app.posthog.com',
  person_profiles: 'identified_only',
  capture_pageview: false, // Manual control
  capture_pageleave: true,
  autocapture: true,
  session_recording: {
    maskAllInputs: false,
    maskInputOptions: {},
    recordCanvas: true,
    recordCrossOriginIframes: true
  },
  disable_web_experiments: false, // Enable no-code experiments
  persistence: 'localStorage+cookie'
});
```

### User Identification

```typescript
// Identify on meaningful events
posthog.identify(
  user.id,
  {
    email: user.email,
    name: user.name,
    subscription_status: 'active'
  }
);
```

## AI Integration

### Edge Function: `ai-chat`

Implements streaming chat using Lovable AI Gateway:

```typescript
// Request format
POST /functions/v1/ai-chat
{
  "messages": [
    { "role": "user", "content": "What products do you have?" }
  ]
}

// Streaming response (SSE)
data: {"choices":[{"delta":{"content":"token"}}]}
```

**Features**:
- Server-side prompt engineering with full product catalog
- Streaming responses via Server-Sent Events (SSE)
- Comprehensive error handling (429 rate limits, 402 payment required)
- Full conversation context management
- Token counting and cost tracking

**Training Data**: AI is trained on complete product catalog, hedgehog care knowledge, and subscription benefits.

## Stripe Integration

### Edge Function: `create-checkout`

```typescript
POST /functions/v1/create-checkout
{
  "items": [
    {
      "id": "product-uuid",
      "title": "Premium Hedgehog Food",
      "price": 29.99,
      "quantity": 1,
      "is_subscription": true
    }
  ],
  "customer_email": "user@example.com",
  "customer_name": "John Doe"
}
```

**Response**: Returns Stripe checkout session URL

### Payment Success Tracking

```typescript
POST /functions/v1/track-success
{
  "session_id": "cs_test_...",
  "user_id": "user-uuid"
}
```

Calculates and tracks Customer Lifetime Value (CLTV) in PostHog.

## Subscription Management

### Edge Functions

- `check-subscription`: Verify active subscriptions
- `cancel-subscription`: Handle cancellation requests

**Database Schema**:
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL,
  price_id TEXT NOT NULL,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false
);
```

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

```bash
# Clone repository
git clone <repository-url>
cd hogshop

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your keys

# Start development server
npm run dev
```

### Source maps

Production builds emit hidden source maps (no public `sourceMappingURL`) so PostHog can symbolicate stack traces in the error-tracking inbox. To ship a deploy with maps uploaded, run `npm run build:with-sourcemaps` locally, or set `POSTHOG_CLI_TOKEN` and `POSTHOG_CLI_ENV_ID` in your CI environment and have it run that same script after install. The bare `npm run build` still works for previews — it just won't update the symbol store. See https://posthog.com/docs/error-tracking/upload-source-maps.

### Environment Variables

```env
# PostHog Analytics
VITE_POSTHOG_KEY=phc_your_project_api_key
VITE_POSTHOG_HOST=https://app.posthog.com

# Supabase (auto-configured by Lovable Cloud)
VITE_SUPABASE_URL=auto
VITE_SUPABASE_PUBLISHABLE_KEY=auto
```

## Funnel Drop-off Demo

Hogshop includes a **deliberate funnel drop-off demonstration** to showcase PostHog's error tracking, session replay, and funnel analysis capabilities. This demo simulates a real-world scenario where users encounter a broken checkout page.

### Demo Flow

1. **Homepage CTA**: Full-width banner promoting "Max's Starter Kit" free gift
2. **Gift Landing Page** (`/gift`): Product showcase with benefits and "Claim Your Free Gift" button
3. **Broken Checkout** (`/checkout/gift`): Intentionally non-existent route that triggers custom 404
4. **Enhanced 404 Page**: Custom error page with full tracking and recovery options

### User Journey

```
Homepage → Gift CTA Click → Gift Landing → Order Button → 404 Page → Recovery
```

### Tracking Events

```typescript
// Step 1: Homepage banner interaction
gift_cta_clicked: {
  location: "homepage_banner",
  cta_text: string,
  timestamp: string
}

// Step 2: Gift page view
gift_page_viewed: {
  referrer: string,
  product_name: "Max's Starter Kit",
  timestamp: string
}

// Step 3: Order attempt (before drop-off)
gift_order_attempted: {
  product_name: "Max's Starter Kit",
  intended_destination: "/checkout/gift",
  retail_value: 45,
  timestamp: string
}

// Step 4: Funnel drop-off (on 404)
funnel_drop_off: {
  stage: "gift_checkout",
  route: "/checkout/gift",
  referrer: string,
  session_replay_url: string,
  error_type: "404_not_found",
  timestamp: string
}

// Additional: Generic 404 tracking
404_error: {
  route: string,
  referrer: string,
  session_replay_url: string,
  timestamp: string
}

// Recovery tracking
404_recovery_attempted: {
  recovery_action: "home" | "products" | "back",
  from_page: string,
  timestamp: string
}
```

### PostHog Analysis

This demo enables demonstration of:

1. **Funnel Analysis**:
   - Create funnel: `gift_cta_clicked` → `gift_page_viewed` → `gift_order_attempted` → `order_completed`
   - Identify 100% drop-off at checkout step
   - Analyze time spent on each step

2. **Session Replay**:
   - Watch user sessions that encountered the 404
   - See exact user actions leading to error
   - Access via `session_replay_url` in event properties

3. **Error Tracking**:
   - All 404 errors captured as `$exception` events
   - Full stack traces and context
   - User properties and session data attached

4. **User Paths**:
   - Identify common paths leading to 404
   - Analyze recovery behavior (which CTA users clicked)
   - Track successful recovery vs bounce

### Testing the Demo

1. Navigate to homepage
2. Click "Claim Free Gift" banner
3. View gift landing page
4. Click "Claim Your Free Gift Now"
5. Observe custom 404 page
6. Check PostHog for all tracked events
7. Review session replay for full journey

### Implementation Details

**Files**:
- `/src/pages/GiftLanding.tsx` - Gift product showcase
- `/src/pages/GiftCheckoutNotFound.tsx` - Custom 404 for gift funnel
- `/src/pages/NotFound.tsx` - Enhanced general 404 page
- `/src/pages/Index.tsx` - Homepage with gift CTA banner

**Error Capture**:
```typescript
captureException(error, "gift_funnel_drop_off", {
  attempted_route: location.pathname,
  referrer: document.referrer,
  session_replay_url: posthog.get_session_replay_url(),
  user_agent: navigator.userAgent,
  timestamp: new Date().toISOString(),
});
```

## Testing

### Stripe Test Cards

- **Successful payment**: `4242 4242 4242 4242`
- **Payment declined**: `4000 0000 0000 0002`
- **Requires SCA**: `4000 0025 0000 3155`

Use any future expiry date and random CVC.

### Playwright Test Suite

```bash
# Install Playwright
npm install -D @playwright/test

# Run E2E tests
npx playwright test

# Generate synthetic traffic
npx playwright test --grep synthetic
```

**Test Scenarios**:
- Product browsing and filtering
- Cart operations
- Checkout flow
- AI chat interaction
- Survey completion
- Feature flag experiments

## Deployment

### Lovable Cloud Deployment

```bash
# Automatic deployment on push
git push origin main

# Manual deployment
lovable deploy
```

**Production URL**: `your-project.lovable.app`

### Custom Domain Setup

1. Go to Project Settings → Domains
2. Add your domain (e.g., `shop.example.com`)
3. Configure DNS with provided CNAME
4. SSL certificate auto-provisioned

## Database Schema

### Products Table

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  image_url TEXT,
  stock INTEGER DEFAULT 0,
  category TEXT,
  is_subscription BOOLEAN DEFAULT false,
  subscription_interval TEXT,
  subscription_interval_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- RLS Policy
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  USING (true);
```

## Performance Metrics

- **Initial Load**: < 2s (LCP)
- **Time to Interactive**: < 3s (TTI)
- **Bundle Size**: ~250KB (gzipped)
- **Lighthouse Score**: 95+ (Performance)

## Security

- Row Level Security (RLS) enabled on all tables
- Server-side payment processing (no client secrets)
- Environment variables secured in Supabase secrets
- CORS properly configured for edge functions
- Input sanitization on all user inputs

## Monitoring

- **Error Rate**: Tracked via PostHog exception capture
- **Session Replay**: Available for debugging
- **Console Logs**: Captured in session recordings
- **Network Requests**: Monitored in replay
- **AI Costs**: Tracked per conversation

## Contributing

This is a reference demo. For issues or suggestions:
1. Open an issue on GitHub
2. Submit a PR with tests
3. Ensure Playwright tests pass

## Documentation Links

- [PostHog Documentation](https://posthog.com/docs)
- [Lovable Documentation](https://docs.lovable.dev)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Supabase Documentation](https://supabase.com/docs)

## License

MIT License - Demo project for educational purposes.

---

**Built with**: [Lovable](https://lovable.dev) | **Analytics**: [PostHog](https://posthog.com) | **Payments**: [Stripe](https://stripe.com)
