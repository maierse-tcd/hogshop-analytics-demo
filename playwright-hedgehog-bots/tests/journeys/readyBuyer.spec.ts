import { test } from '@playwright/test';
import { HumanMouseSimulator, HumanScrollSimulator, HumanTimingSimulator } from '../../lib/humanBehavior.js';
import { StripeCheckoutHandler } from '../../lib/stripeCheckout.js';
import { randomDelay, randomInt } from '../../lib/helpers.js';

test('Ready Buyer Journey', async ({ page }) => {
  const mouseSimulator = new HumanMouseSimulator();
  const scrollSimulator = new HumanScrollSimulator();
  const timingSimulator = new HumanTimingSimulator();
  const stripeHandler = new StripeCheckoutHandler();

  // Navigate to homepage
  await page.goto('/');
  await randomDelay(1000, 1500);

  // Quick scroll to products
  await scrollSimulator.scrollNaturally(page, 'down', 2);
  await randomDelay(1500, 2500);

  // View 1-3 products with quick decision-making
  const productsToView = randomInt(1, 3);
  
  for (let i = 0; i < productsToView; i++) {
    const productCards = await page.locator('article').all();
    if (productCards.length === 0) break;
    
    const randomIndex = Math.floor(Math.random() * Math.min(productCards.length, 10));
    const productCard = productCards[randomIndex];
    
    await timingSimulator.hesitateBeforeClick(page, productCard, 400, 800);
    await productCard.click();
    await randomDelay(1500, 2500);
    
    // Quick scroll to add to cart button
    await scrollSimulator.scrollNaturally(page, 'down', 1);
    await randomDelay(1000, 2000);
    
    // Add to cart (95% chance)
    if (Math.random() < 0.95) {
      const addToCartButton = page.locator('button:has-text("Add to Cart")').first();
      if (await addToCartButton.isVisible().catch(() => false)) {
        await timingSimulator.hesitateBeforeClick(page, addToCartButton, 600, 1200);
        await addToCartButton.click();
        await randomDelay(1000, 1500);
      }
    }
    
    await page.goto('/');
    await randomDelay(800, 1200);
  }

  // Open cart
  const cartIcon = page.locator('button[aria-label*="cart" i], button:has-text("Cart")').first();
  if (await cartIcon.isVisible().catch(() => false)) {
    await timingSimulator.hesitateBeforeClick(page, cartIcon, 400, 800);
    await cartIcon.click();
    await randomDelay(2000, 3000);
  }

  // Proceed to checkout (85% chance)
  if (Math.random() < 0.85) {
    const checkoutButton = page.locator('button:has-text("Checkout"), button:has-text("Proceed")').first();
    if (await checkoutButton.isVisible().catch(() => false)) {
      await timingSimulator.hesitateBeforeClick(page, checkoutButton, 800, 1500);
      await checkoutButton.click();
      await randomDelay(2000, 3000);

      // Fill registration dialog if it appears
      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        const testEmail = `buyer_${Date.now()}@hogflix-demo.dev`;
        await emailInput.fill(testEmail);
        await randomDelay(200, 400);
        
        const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
        if (await nameInput.isVisible().catch(() => false)) {
          await nameInput.fill('Test Buyer');
          await randomDelay(200, 400);
        }
        
        const continueButton = page.locator('button:has-text("Continue"), button[type="submit"]').first();
        await timingSimulator.hesitateBeforeClick(page, continueButton, 1000, 2000);
        await continueButton.click();
        await randomDelay(2000, 3000);
      }

      // Complete purchase (80% chance)
      if (Math.random() < 0.8) {
        const paymentMethod = stripeHandler.getRandomPaymentMethod();
        const success = await stripeHandler.fillStripeCheckout(page, paymentMethod);
        
        if (success) {
          console.log('✅ Purchase completed successfully');
        }
      } else {
        console.log('❌ Abandoned at payment form (20% abandonment)');
      }
    }
  }

  await timingSimulator.randomPause(1000, 2000);
});
