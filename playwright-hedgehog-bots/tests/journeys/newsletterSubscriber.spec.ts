import { test } from '@playwright/test';
import { HumanMouseSimulator, HumanScrollSimulator, HumanTimingSimulator } from '../../lib/humanBehavior.js';
import { randomDelay, randomInt } from '../../lib/helpers.js';

test('Newsletter Subscriber Journey', async ({ page }) => {
  const mouseSimulator = new HumanMouseSimulator();
  const scrollSimulator = new HumanScrollSimulator();
  const timingSimulator = new HumanTimingSimulator();

  // Navigate to homepage
  await page.goto('/');
  await randomDelay(1000, 1500);

  // Quick scroll down to newsletter section (usually at bottom)
  await scrollSimulator.scrollNaturally(page, 'down', 4);
  await randomDelay(2000, 3000);

  // Look for newsletter input
  const emailInput = page.locator('input[type="email"]').filter({ hasText: '' }).first();
  
  if (await emailInput.isVisible().catch(() => false)) {
    // Generate test email
    const testEmail = `subscriber_${Date.now()}_${randomInt(1000, 9999)}@hogflix-demo.dev`;
    
    // Move mouse to input
    await timingSimulator.hesitateBeforeClick(page, emailInput, 500, 1000);
    await emailInput.click();
    await randomDelay(300, 600);
    
    // Type email with human-like speed
    for (const char of testEmail) {
      await emailInput.type(char);
      await randomDelay(100, 200);
    }
    
    await randomDelay(500, 1000);
    
    // Click Subscribe button
    const subscribeButton = page.locator('button:has-text("Subscribe"), button:has-text("Get")').first();
    if (await subscribeButton.isVisible().catch(() => false)) {
      await timingSimulator.hesitateBeforeClick(page, subscribeButton, 800, 1500);
      await subscribeButton.click();
      await randomDelay(2000, 3000);
      
      console.log('✅ Newsletter subscription completed');
    }
  } else {
    // If newsletter not visible, try clicking hero CTA
    const newsletterCTA = page.locator('button:has-text("newsletter"), button:has-text("sign up")').first();
    if (await newsletterCTA.isVisible().catch(() => false)) {
      await timingSimulator.hesitateBeforeClick(page, newsletterCTA, 500, 1000);
      await newsletterCTA.click();
      await randomDelay(2000, 3000);
      
      // Fill modal if it appears
      const modalEmailInput = page.locator('input[type="email"]').first();
      if (await modalEmailInput.isVisible().catch(() => false)) {
        const testEmail = `subscriber_${Date.now()}_${randomInt(1000, 9999)}@hogflix-demo.dev`;
        await modalEmailInput.fill(testEmail);
        await randomDelay(500, 1000);
        
        const modalSubmit = page.locator('button[type="submit"]').first();
        await timingSimulator.hesitateBeforeClick(page, modalSubmit, 800, 1500);
        await modalSubmit.click();
        await randomDelay(2000, 3000);
      }
    }
  }

  // Maybe view 1-2 products before leaving (20% chance)
  if (Math.random() < 0.2) {
    await page.goto('/');
    await randomDelay(1000, 1500);
    
    const productsToView = randomInt(1, 2);
    for (let i = 0; i < productsToView; i++) {
      const productCards = await page.locator('article').all();
      if (productCards.length === 0) break;
      
      const randomIndex = Math.floor(Math.random() * Math.min(productCards.length, 5));
      const productCard = productCards[randomIndex];
      
      await timingSimulator.hesitateBeforeClick(page, productCard, 500, 1000);
      await productCard.click();
      await randomDelay(2000, 3000);
      
      await scrollSimulator.scrollNaturally(page, 'down', 1);
      await randomDelay(2000, 4000);
      
      await page.goBack();
      await randomDelay(800, 1200);
    }
  }

  // Quick exit
  await timingSimulator.randomPause(1000, 2000);
});
