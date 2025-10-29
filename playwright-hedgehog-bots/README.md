# Playwright Hedgehog Bots - HogShop Demo

Realistic Playwright automation suite simulating human e-commerce behavior with PostHog analytics tracking.

## Features

- 🎭 **6 User Personas**: Casual browsers, engaged shoppers, ready buyers, newsletter subscribers, cart abandoners, gift funnel testers
- 🖱️ **Human-like Interactions**: Bezier curve mouse movements, natural scrolling, reading pauses, micro-jitter
- 💳 **Stripe Checkout Automation**: Card, Bancontact, EPS payments with realistic form filling
- 📊 **UTM Campaign Tracking**: Reactivation campaigns with revenue attribution
- 🔄 **Churn & Reactivation Engine**: Automatic identification and reactivation of churned users
- 🤖 **Background Bot Scheduler**: 3-5 concurrent headed browsers running indefinitely
- 📈 **SQLite Database**: Track users, sessions, purchases, UTM campaigns

## Quick Start (MacBook)

```bash
# Install dependencies
npm install

# Initialize database
npm run db:init

# Create test users
npm run users:create -- --count=20

# Configure environment
cp .env.example .env
# Edit .env: Set BASE_URL and POSTHOG_KEY

# Start bots (headed browsers)
npm run bots:start
```

## Ubuntu VM Deployment

```bash
# Copy project to VM
scp -r ./playwright-hedgehog-bots ubuntu@your-vm-ip:/home/ubuntu/

# SSH into VM
ssh ubuntu@your-vm-ip

# Run setup script
cd /home/ubuntu/playwright-hedgehog-bots
chmod +x deploy/setup-ubuntu.sh
./deploy/setup-ubuntu.sh

# Bots will start automatically via systemd
```

## Project Structure

- `lib/` - Human behavior simulators, personas, UTM campaigns, Stripe automation
- `tests/journeys/` - 7 Playwright test specs (one per persona + reactivation)
- `scripts/` - Background bot scheduler, user generator, churn engine
- `database/` - SQLite schema, seeds, DB helpers
- `deploy/` - Ubuntu VM setup scripts, systemd service, cron jobs

## Success Metrics (After 4 Weeks)

- 800-1,200 synthetic users
- 3,000-5,000 PostHog sessions
- 200-400 Stripe purchases
- Realistic session replays with mouse/scroll behavior
- Measurable UTM campaign revenue uplift

## License

MIT
