import { spawn } from 'child_process';
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

        // Execute journey test using Playwright
        const journeyFile = this.getJourneyFile(persona);
        await this.runPlaywrightTest(journeyFile, botIndex);

        const sessionDuration = randomInt(behavior.sessionDuration[0], behavior.sessionDuration[1]);

        // Update session
        updateSession(sessionId, {
          ended_at: new Date().toISOString(),
          duration_seconds: sessionDuration,
        });

        updateUser(user.id!, {
          last_activity_at: new Date().toISOString(),
          session_count: (user.session_count || 0) + 1,
        });

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

  private runPlaywrightTest(testFile: string, botIndex: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const testProcess = spawn('npx', ['playwright', 'test', testFile, '--headed', '--workers=1'], {
        cwd: process.cwd(),
        stdio: 'pipe',
        env: { ...process.env, BASE_URL }
      });

      testProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Test failed with code ${code}`));
        }
      });

      testProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  private getJourneyFile(persona: string): string {
    const journeyFiles: Record<string, string> = {
      CASUAL_BROWSER: 'tests/casualBrowser.spec.ts',
      ENGAGED_SHOPPER: 'tests/engagedShopper.spec.ts',
      READY_BUYER: 'tests/readyBuyer.spec.ts',
      NEWSLETTER_SUBSCRIBER: 'tests/newsletterSubscriber.spec.ts',
      CART_ABANDONER: 'tests/cartAbandoner.spec.ts',
      GIFT_FUNNEL_TESTER: 'tests/giftFunnelTester.spec.ts',
    };
    return journeyFiles[persona] || journeyFiles.CASUAL_BROWSER;
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
