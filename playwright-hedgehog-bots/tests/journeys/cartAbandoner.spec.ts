import { test } from '@playwright/test';
import { HumanMouseSimulator, HumanScrollSimulator, HumanTimingSimulator } from '../../lib/humanBehavior.js';
import { randomDelay, randomInt, randomChoice } from '../../lib/helpers.js';

test('Cart Abandoner Journey', async ({ page }) => {
  const mouseSimulator = new HumanMouseSimulator();
  const scrollSimulator = new HumanScrollSimulator();
  const timingSimulator = new HumanTimingSimulator();

  // Navigate to homepage
  await page.goto('/');
  await randomDelay(1500, 2500);

  // View 2-4 product pages
  const productsToView = randomInt(2, 4);
  
  for (let i = 0; i < productsToView; i++) {
    await scrollSimulator.scrollNaturally(page, 'down', 2);
    await randomDelay(2000, 3000);
    
    const productCards = await page.locator('article').all();
    if (productCards.length === 0) break;
    
    const randomIndex = Math.floor(Math.random() * Math.min(productCards.length, 10));
    const productCard = productCards[randomIndex];
    
    await timingSimulator.hesitateBeforeClick(page, productCard, 800, 1500);
    await productCard.click();
    await randomDelay(2000, 3000);
    
    // Read product details
    await scrollSimulator.scrollNaturally(page, 'down', 2);
    await randomDelay(4000, 7000);
    
    await page.goto('/');
    await randomDelay(1000, 1500);
  }

  // Add 1-3 items to cart
  const itemsToAdd = randomInt(1, 3);
  
  for (let i = 0; i < itemsToAdd; i++) {
    const productCards = await page.locator('article').all();
    if (productCards.length === 0) break;
    
    const randomIndex = Math.floor(Math.random() * Math.min(productCards.length, 10));
    const productCard = productCards[randomIndex];
    
    await timingSimulator.hesitateBeforeClick(page, productCard, 600, 1200);
    await productCard.click();
    await randomDelay(1500, 2500);
    
    const addToCartButton = page.locator('button:has-text("Add to Cart")').first();
    if (await addToCartButton.isVisible().catch(() => false)) {
      await timingSimulator.hesitateBeforeClick(page, addToCartButton, 1000, 2000);
      await addToCartButton.click();
      await randomDelay(1500, 2500);
    }
    
    await page.goto('/');
    await randomDelay(1000, 1500);
  }

  // Open cart drawer
  const cartIcon = page.locator('button[aria-label*="cart" i], button:has-text("Cart")').first();
  if (await cartIcon.isVisible().catch(() => false)) {
    await timingSimulator.hesitateBeforeClick(page, cartIcon, 500, 1000);
    await cartIcon.click();
    await randomDelay(3000, 5000);
  }

  // Click "Proceed to Checkout"
  const checkoutButton = page.locator('button:has-text("Checkout"), button:has-text("Proceed")').first();
  if (await checkoutButton.isVisible().catch(() => false)) {
    await timingSimulator.hesitateBeforeClick(page, checkoutButton, 1000, 2000);
    await checkoutButton.click();
    await randomDelay(2000, 3000);

    // Fill registration dialog but abandon before submitting
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      const testEmail = `abandoner_${Date.now()}@hogflix-demo.dev`;
      await emailInput.fill(testEmail);
      await randomDelay(300, 600);
      
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('Test Abandoner');
        await randomDelay(300, 600);
      }
      
      // Hesitate longer before abandoning
      await timingSimulator.randomPause(2000, 4000);
      
      // Close dialog (abandon)
      const closeButton = page.locator('button[aria-label*="close" i], button:has(svg)').first();
      if (await closeButton.isVisible().catch(() => false)) {
        await timingSimulator.hesitateBeforeClick(page, closeButton, 500, 1000);
        await closeButton.click();
        console.log('❌ Abandoned at registration dialog');
      } else {
        // Try pressing Escape
        await page.keyboard.press('Escape');
        console.log('❌ Abandoned by pressing Escape');
      }
      
      await randomDelay(2000, 3000);
    }
  }

  // Respond to exit survey (80% chance)
  if (Math.random() < 0.8) {
    await randomDelay(1000, 2000);
    
    // Look for exit survey
    const surveyVisible = await page.locator('text=/before you go/i').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (surveyVisible) {
      await randomDelay(1000, 2000);
      
      // Select random reason
      const reasons = ['price_too_high', 'shipping_cost', 'changed_mind', 'just_browsing'];
      const selectedReason = randomChoice(reasons);
      
      const radioButton = page.locator(`input[value="${selectedReason}"]`).first();
      if (await radioButton.isVisible().catch(() => false)) {
        await timingSimulator.hesitateBeforeClick(page, radioButton, 800, 1500);
        await radioButton.click();
        await randomDelay(1000, 2000);
        
        const submitButton = page.locator('button:has-text("Submit")').first();
        await timingSimulator.hesitateBeforeClick(page, submitButton, 1000, 2000);
        await submitButton.click();
        
        console.log(`✅ Exit survey completed: ${selectedReason}`);
      }
    }
  }

  await timingSimulator.randomPause(1000, 2000);
});
