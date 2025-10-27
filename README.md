# HogShop - PostHog Analytics Demo

A modern, premium e-commerce platform showcasing PostHog's product analytics, feature flags, and experimentation capabilities. Built with React, TypeScript, Tailwind CSS, and powered by Lovable Cloud.

## 🎯 Purpose

HogShop is a fully functional demo environment designed to demonstrate:
- **Product Analytics**: Track user behavior, conversions, and product performance
- **Feature Flags**: A/B test product layouts, banners, and checkout flows
- **Experiments**: Run controlled experiments to optimize conversion rates
- **Session Replay**: Watch user sessions and debug issues
- **Event Tracking**: Comprehensive event tracking across the user journey

## 🛍️ Features

- **Product Catalog**: Browse hedgehog-themed merchandise and PostHog subscriptions
- **Shopping Cart**: Add products and subscriptions with quantities
- **Stripe Checkout**: Process payments via Stripe (test mode)
- **Subscriptions**: Monthly/annual subscription plans with proper billing
- **Responsive Design**: Beautiful UI with light/dark mode
- **PostHog Integration**: Pre-configured event tracking and analytics

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Lovable account (for backend/database)
- PostHog account (for analytics - optional but recommended)
- Stripe account (for payments - test mode keys provided)

### Installation

1. **Clone the repository**
```bash
git clone <YOUR_GIT_URL>
cd hogshop
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` and add your PostHog API key:
```env
VITE_POSTHOG_KEY=phc_your_project_api_key_here
VITE_POSTHOG_HOST=https://app.posthog.com
```

4. **Start development server**
```bash
npm run dev
```

Visit `http://localhost:8080` to see the store!

## 📊 PostHog Configuration

### Getting Your PostHog API Key

1. Sign up at [PostHog](https://app.posthog.com)
2. Create a new project
3. Go to Project Settings → API Keys
4. Copy your Project API Key
5. Add it to your `.env` file

### Events Being Tracked

The following events are automatically tracked:

| Event | Description | Properties |
|-------|-------------|------------|
| `page_view` | Page navigation | `page` |
| `products_viewed` | Product catalog viewed | `product_count` |
| `add_to_cart` | Product added to cart | `product_id`, `product_name`, `price`, `is_subscription` |
| `purchase_completed` | Checkout successful | `session_id`, `total_amount` |

### Setting Up Feature Flags

1. In PostHog, go to Feature Flags
2. Create flags for experimentation:
   - `new_product_card_layout`
   - `discount_banner`
   - `premium_checkout_flow`
3. Use the flags in your code (implementation ready)

## 💳 Stripe Configuration

The demo uses Stripe test mode. Current test products:

| Product | Type | Price | Stripe Price ID |
|---------|------|-------|----------------|
| Hedgehog Plushie | One-time | $29.99 | `price_1SMnmLLVW76jxQhl2ZTnrB7P` |
| PostHog Pro Analytics | Monthly subscription | $49.99/mo | `price_1SMnlSLVW76jxQhlqJcKYAsU` |
| Feature Flags Enterprise | Monthly subscription | $99.99/mo | `price_1SMnmBLLVW76jxQhlJRoK93jN` |
| PostHog Team Plan | Monthly subscription | $149.99/mo | `price_1SMnmLLVW76jxQhlx8MBNgyL` |

### Test Card Numbers

Use these for testing checkout:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires authentication**: `4000 0025 0000 3155`

Any future expiry date and random CVC will work.

## 🏗️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Lovable Cloud (Supabase)
- **Database**: PostgreSQL (managed by Lovable Cloud)
- **Payments**: Stripe Checkout
- **Analytics**: PostHog
- **State Management**: React Context API, TanStack Query

## 📁 Project Structure

```
hogshop/
├── src/
│   ├── components/
│   │   ├── Header.tsx           # Navigation with cart
│   │   ├── ProductCard.tsx      # Product display
│   │   ├── CartDrawer.tsx       # Shopping cart UI
│   │   └── ThemeProvider.tsx    # Dark/light mode
│   ├── contexts/
│   │   └── CartContext.tsx      # Cart state management
│   ├── pages/
│   │   ├── Index.tsx            # Product catalog
│   │   ├── Success.tsx          # Checkout success
│   │   └── NotFound.tsx         # 404 page
│   ├── lib/
│   │   └── posthog.ts           # PostHog initialization
│   └── integrations/
│       └── supabase/            # Auto-generated Supabase client
├── supabase/
│   └── functions/
│       └── create-checkout/     # Stripe checkout handler
└── .env.example                 # Environment template
```

## 🧪 Testing with Playwright

Generate synthetic user traffic for analytics:

```bash
# Install Playwright
npm install -D @playwright/test

# Run synthetic user scenarios
npx playwright test
```

Synthetic users will:
- Browse product catalog
- Add items to cart
- Complete checkout flow
- Trigger PostHog events with `synthetic=true` property

## 🎨 Design System

HogShop uses a sophisticated design system with:

- **Primary Color**: Purple (#8B5CF6) - The PostHog brand color
- **Typography**: Clean, modern sans-serif
- **Spacing**: Consistent 8px grid
- **Animations**: Subtle hover effects and transitions
- **Dark Mode**: Full support with theme toggle

### Customizing Design

Edit `src/index.css` and `tailwind.config.ts` to adjust:
- Color palette
- Typography scale
- Border radius
- Shadows and effects

## 🔐 Security Notes

- All Stripe operations happen server-side via edge functions
- Database has Row Level Security (RLS) enabled
- Product catalog is public (read-only)
- Admin features require authentication (coming soon)

## 🚢 Deployment

Deploy to production with one click:

1. Click "Publish" in Lovable
2. Your site will be live at `yoursite.lovable.app`
3. Configure custom domain in Project Settings (optional)

## 📝 License

This is a demo project for PostHog analytics demonstration.

## 🤝 Contributing

This is a demo project, but suggestions are welcome!

## 📞 Support

- [Lovable Documentation](https://docs.lovable.dev/)
- [PostHog Documentation](https://posthog.com/docs)
- [Stripe Documentation](https://stripe.com/docs)

---

Built with ❤️ using [Lovable](https://lovable.dev)
