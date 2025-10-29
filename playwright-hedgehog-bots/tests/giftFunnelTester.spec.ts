import { test, expect } from '@playwright/test';
import { HumanMouseSimulator, HumanScrollSimulator, HumanTimingSimulator } from '../../lib/humanBehavior.js';
import { randomDelay, randomInt } from '../../lib/helpers.js';

test('Gift Funnel Tester Journey (404 Test)', async ({ page }) => {
  const mouseSimulator = new HumanMouseSimulator();
  const scrollSimulator = new HumanScrollSimulator();
  const timingSimulator = new HumanTimingSimulator();

  // Navigate to homepage
  await page.goto('/');
  await randomDelay(1500, 2500);

  // Scroll down slightly to see gift banner
  await scrollSimulator.scrollNaturally(page, 'down', 1);
  await randomDelay(2000, 3000);

  // Look for "Claim Free Gift" button
  const giftButton = page.locator('button:has-text("Claim Free Gift"), button:has-text("Claim")').first();
  
  if (await giftButton.isVisible().catch(() => false)) {
    // Hover over button
    await mouseSimulator.hoverElement(page, 'button:has-text("Claim Free Gift")', 2000);
    await randomDelay(1000, 1500);
    
    // Click gift CTA
    await timingSimulator.hesitateBeforeClick(page, giftButton, 1000, 2000);
    await giftButton.click();
    
    console.log('🎁 Clicked gift CTA');
    
    // Wait for navigation
    await page.waitForLoadState('networkidle');
    await randomDelay(2000, 3000);
    
    // Verify we landed on 404 or gift page
    const currentURL = page.url();
    console.log(`📍 Landed on: ${currentURL}`);
    
    // Look for 404 indicators or "Back to Shop" button
    const backButton = page.locator('button:has-text("Back"), a:has-text("Back to Shop")').first();
    if (await backButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await mouseSimulator.hoverElement(page, 'button:has-text("Back"), a:has-text("Back to Shop")', 1500);
      await randomDelay(2000, 3000);
      
      console.log('❌ Gift funnel 404 confirmed');
    }
  } else {
    console.log('⚠️ Gift CTA button not found');
  }

  // Maybe signup for newsletter (15% chance)
  if (Math.random() < 0.15) {
    await page.goto('/');
    await randomDelay(1000, 1500);
    
    await scrollSimulator.scrollNaturally(page, 'down', 3);
    await randomDelay(2000, 3000);
    
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible().catch(() => false)) {
      const testEmail = `gift_tester_${Date.now()}@hogflix-demo.dev`;
      await emailInput.fill(testEmail);
      await randomDelay(500, 1000);
      
      const subscribeButton = page.locator('button:has-text("Subscribe")').first();
      if (await subscribeButton.isVisible().catch(() => false)) {
        await timingSimulator.hesitateBeforeClick(page, subscribeButton, 800, 1500);
        await subscribeButton.click();
        await randomDelay(2000, 3000);
        
        console.log('✅ Newsletter signup after 404');
      }
    }
  }

  // Maybe browse 1-2 products (30% chance)
  if (Math.random() < 0.3) {
    await page.goto('/');
    await randomDelay(1000, 1500);
    
    const productsToView = randomInt(1, 2);
    for (let i = 0; i < productsToView; i++) {
      const productCards = await page.locator('article').all();
      if (productCards.length === 0) break;
      
      const randomIndex = Math.floor(Math.random() * Math.min(productCards.length, 5));
      const productCard = productCards[randomIndex];
      
      await timingSimulator.hesitateBeforeClick(page, productCard, 600, 1200);
      await productCard.click();
      await randomDelay(2000, 3000);
      
      await scrollSimulator.scrollNaturally(page, 'down', 1);
      await randomDelay(2000, 4000);
      
      await page.goBack();
      await randomDelay(1000, 1500);
    }
  }

  await timingSimulator.randomPause(1000, 2000);
});
