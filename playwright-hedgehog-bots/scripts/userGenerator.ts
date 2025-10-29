import { createUser } from '../database/db.js';
import { getRandomPersona } from '../lib/userPersonas.js';
import { faker } from '@faker-js/faker';
import { randomInt, log } from '../lib/helpers.js';

const runOnce = process.argv.includes('--run-once');
const userCount = parseInt(process.argv.find(arg => arg.startsWith('--count='))?.split('=')[1] || '10');

async function generateUsers(count: number = 10) {
  log(`👤 Generating ${count} new users...`);

  for (let i = 0; i < count; i++) {
    const persona = getRandomPersona();
    const email = `user_${Date.now()}_${randomInt(1000, 9999)}@hogflix-demo.dev`;
    const name = faker.person.fullName();

    try {
      const userId = createUser({ email, name, persona });
      log(`Created user ${i + 1}/${count}:`, { id: userId, email, persona });
    } catch (error) {
      log(`Error creating user:`, error);
    }
  }

  log(`✅ User generation complete`);
}

if (runOnce) {
  generateUsers(userCount).then(() => process.exit(0));
} else {
  // Daily cron job mode
  generateUsers(randomInt(7, 10)).then(() => process.exit(0));
}
