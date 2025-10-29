import { chromium, Browser, BrowserContext } from '@playwright/test';
import { getRandomPersona, getPersonaBehavior } from '../lib/userPersonas.js';
import { createUser, getUserByEmail, updateUser, createSession, updateSession, getRandomUser } from '../database/db.js';
import { randomDelay, randomInt, log } from '../lib/helpers.js';
import { faker } from '@faker-js/faker';

const BASE_URL = process.env.BASE_URL || 'https://shop.hogflix.dev';
const BOT_COUNT = randomInt(
  parseInt(process.env.BOT_COUNT_MIN || '3'),
  parseInt(process.env.BOT_COUNT_MAX || '5')
);

class BackgroundBotScheduler {
  private browsers: Browser[] = [];
  private isRunning = false;

  async start() {
    this.isRunning = true;
    log(`🤖 Starting ${BOT_COUNT} concurrent bots`);

    for (let i = 0; i < BOT_COUNT; i++) {
      this.launchBot(i);
    }
  }

  private async launchBot(botIndex: number) {
    while (this.isRunning) {
      try {
        const browser = await chromium.launch({
          headless: false,
          slowMo: 500,
          args: ['--start-maximized'],
        });

        const context = await browser.newContext({
          viewport: { width: 1920, height: 1080 },
        });

        const page = await context.newPage();
        
        // Select persona and get/create user
        const persona = getRandomPersona();
        const behavior = getPersonaBehavior(persona);
        
        let user = getRandomUser(persona);
        if (!user) {
          const email = faker.internet.email();
          const name = faker.person.fullName();
          const userId = createUser({ email, name, persona });
          user = { id: userId, email, name, persona };
        }

        log(`Bot ${botIndex}: ${persona} journey started`, { user: user.email });

        // Create session
        const sessionId = createSession({ user_id: user.id! });

        // Execute journey based on persona
        const journeyScript = this.getJourneyScript(persona);
        await page.goto(`${BASE_URL}${journeyScript}`);

        const sessionDuration = randomInt(behavior.sessionDuration[0], behavior.sessionDuration[1]);
        await randomDelay(sessionDuration * 1000, sessionDuration * 1000 + 5000);

        // Update session
        updateSession(sessionId, {
          ended_at: new Date().toISOString(),
          duration_seconds: sessionDuration,
        });

        updateUser(user.id!, {
          last_activity_at: new Date().toISOString(),
          session_count: (user.session_count || 0) + 1,
        });

        await browser.close();
        log(`Bot ${botIndex}: Journey completed`);

        // Wait before next journey
        const nextJourneyDelay = randomInt(
          parseInt(process.env.MIN_JOURNEY_INTERVAL || '10'),
          parseInt(process.env.MAX_JOURNEY_INTERVAL || '20')
        );
        await randomDelay(nextJourneyDelay * 60 * 1000, nextJourneyDelay * 60 * 1000 + 60000);
      } catch (error) {
        log(`Bot ${botIndex} error:`, error);
        await randomDelay(60000, 120000);
      }
    }
  }

  private getJourneyScript(persona: string): string {
    const scripts: Record<string, string> = {
      CASUAL_BROWSER: '/tests/journeys/casualBrowser.spec.ts',
      ENGAGED_SHOPPER: '/tests/journeys/engagedShopper.spec.ts',
      READY_BUYER: '/tests/journeys/readyBuyer.spec.ts',
      NEWSLETTER_SUBSCRIBER: '/tests/journeys/newsletterSubscriber.spec.ts',
      CART_ABANDONER: '/tests/journeys/cartAbandoner.spec.ts',
      GIFT_FUNNEL_TESTER: '/tests/journeys/giftFunnelTester.spec.ts',
    };
    return scripts[persona] || scripts.CASUAL_BROWSER;
  }

  stop() {
    this.isRunning = false;
    log('Stopping all bots...');
  }
}

const scheduler = new BackgroundBotScheduler();
scheduler.start();

process.on('SIGINT', () => {
  scheduler.stop();
  process.exit(0);
});
