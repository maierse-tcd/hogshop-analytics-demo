import { test } from '@playwright/test';
import { HumanMouseSimulator, HumanScrollSimulator, HumanTimingSimulator } from '../../lib/humanBehavior.js';
import { StripeCheckoutHandler } from '../../lib/stripeCheckout.js';
import { randomDelay, randomInt } from '../../lib/helpers.js';

test('Churned User Reactivation Journey', async ({ page, context }) => {
  const mouseSimulator = new HumanMouseSimulator();
  const scrollSimulator = new HumanScrollSimulator();
  const timingSimulator = new HumanTimingSimulator();
  const stripeHandler = new StripeCheckoutHandler();

  // This test expects UTM parameters to be passed via test.use() or environment
  // Example: utm_source=email&utm_medium=reactivation&utm_campaign=spring_comeback_2025
  
  // Navigate with UTM params (will be set by backgroundBots.ts)
  const baseURL = process.env.BASE_URL || 'https://shop.hogflix.dev';
  await page.goto(baseURL);
  
  console.log('🔄 Reactivation visit started with UTM params');
  
  await randomDelay(2000, 3000);

  // Engaged browsing (higher intent than casual)
  await scrollSimulator.scrollNaturally(page, 'down', 3);
  await randomDelay(3000, 5000);

  // View 2-4 products
  const productsToView = randomInt(2, 4);
  
  for (let i = 0; i < productsToView; i++) {
    const productCards = await page.locator('article').all();
    if (productCards.length === 0) break;
    
    const randomIndex = Math.floor(Math.random() * Math.min(productCards.length, 10));
    const productCard = productCards[randomIndex];
    
    await timingSimulator.hesitateBeforeClick(page, productCard, 600, 1200);
    await productCard.click();
    await randomDelay(2000, 3000);
    
    // Read product details
    await scrollSimulator.scrollNaturally(page, 'down', 2);
    await randomDelay(4000, 8000);
    
    // Add to cart (60% chance per product)
    if (Math.random() < 0.6) {
      const addToCartButton = page.locator('button:has-text("Add to Cart")').first();
      if (await addToCartButton.isVisible().catch(() => false)) {
        await timingSimulator.hesitateBeforeClick(page, addToCartButton, 1000, 2000);
        await addToCartButton.click();
        await randomDelay(1500, 2500);
        console.log('✅ Added product to cart');
      }
    }
    
    await page.goto(baseURL);
    await randomDelay(1000, 1500);
  }

  // Open cart
  const cartIcon = page.locator('button[aria-label*="cart" i], button:has-text("Cart")').first();
  if (await cartIcon.isVisible().catch(() => false)) {
    await timingSimulator.hesitateBeforeClick(page, cartIcon, 500, 1000);
    await cartIcon.click();
    await randomDelay(3000, 5000);
  }

  // Proceed to checkout (70% chance for reactivated users)
  if (Math.random() < 0.7) {
    const checkoutButton = page.locator('button:has-text("Checkout"), button:has-text("Proceed")').first();
    if (await checkoutButton.isVisible().catch(() => false)) {
      await timingSimulator.hesitateBeforeClick(page, checkoutButton, 1000, 2000);
      await checkoutButton.click();
      await randomDelay(2000, 3000);

      // Fill registration
      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        const testEmail = `reactivated_${Date.now()}@hogflix-demo.dev`;
        await emailInput.fill(testEmail);
        await randomDelay(300, 600);
        
        const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
        if (await nameInput.isVisible().catch(() => false)) {
          await nameInput.fill('Reactivated Customer');
          await randomDelay(300, 600);
        }
        
        const continueButton = page.locator('button:has-text("Continue"), button[type="submit"]').first();
        await timingSimulator.hesitateBeforeClick(page, continueButton, 1000, 2000);
        await continueButton.click();
        await randomDelay(2000, 3000);
      }

      // Complete purchase (65% chance for reactivated)
      if (Math.random() < 0.65) {
        const paymentMethod = stripeHandler.getRandomPaymentMethod();
        const success = await stripeHandler.fillStripeCheckout(page, paymentMethod);
        
        if (success) {
          console.log('✅ Reactivation purchase completed - revenue attributed to campaign');
        }
      } else {
        console.log('❌ Reactivated user abandoned at payment');
      }
    }
  }

  await timingSimulator.randomPause(1000, 2000);
});
