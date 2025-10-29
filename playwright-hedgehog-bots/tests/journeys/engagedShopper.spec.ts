import { test } from '@playwright/test';
import { HumanMouseSimulator, HumanScrollSimulator, HumanTimingSimulator } from '../../lib/humanBehavior.js';
import { randomDelay, randomInt } from '../../lib/helpers.js';

test('Engaged Shopper Journey', async ({ page }) => {
  const mouseSimulator = new HumanMouseSimulator();
  const scrollSimulator = new HumanScrollSimulator();
  const timingSimulator = new HumanTimingSimulator();

  // Navigate to homepage
  await page.goto('/');
  await randomDelay(1500, 2500);

  // Browse and hover over multiple products
  await scrollSimulator.scrollNaturally(page, 'down', 2);
  await randomDelay(2000, 3000);

  // View 3-6 product detail pages
  const productsToView = randomInt(3, 6);
  for (let i = 0; i < productsToView; i++) {
    const productCards = await page.locator('article').all();
    if (productCards.length === 0) break;
    
    const randomIndex = Math.floor(Math.random() * Math.min(productCards.length, 10));
    const productCard = productCards[randomIndex];
    
    await timingSimulator.hesitateBeforeClick(page, productCard, 800, 1500);
    await productCard.click();
    await randomDelay(2000, 3000);
    
    // Read product description
    await scrollSimulator.scrollNaturally(page, 'down', 2);
    await randomDelay(5000, 10000);
    
    // Go back to browse more
    await page.goBack();
    await randomDelay(1500, 2500);
  }

  // Add 1-3 items to cart (70% chance)
  if (Math.random() < 0.7) {
    const itemsToAdd = randomInt(1, 3);
    
    for (let i = 0; i < itemsToAdd; i++) {
      const productCards = await page.locator('article').all();
      if (productCards.length === 0) break;
      
      const randomIndex = Math.floor(Math.random() * Math.min(productCards.length, 10));
      const productCard = productCards[randomIndex];
      
      await timingSimulator.hesitateBeforeClick(page, productCard, 500, 1000);
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
  }

  // View cart (80% chance if items added)
  if (Math.random() < 0.8) {
    const cartIcon = page.locator('button[aria-label*="cart" i], button:has-text("Cart")').first();
    if (await cartIcon.isVisible().catch(() => false)) {
      await timingSimulator.hesitateBeforeClick(page, cartIcon, 500, 1000);
      await cartIcon.click();
      await randomDelay(3000, 5000);
    }
  }

  // Proceed to checkout (40% chance)
  if (Math.random() < 0.4) {
    const checkoutButton = page.locator('button:has-text("Checkout"), button:has-text("Proceed")').first();
    if (await checkoutButton.isVisible().catch(() => false)) {
      await timingSimulator.hesitateBeforeClick(page, checkoutButton, 1000, 2000);
      await checkoutButton.click();
      await randomDelay(2000, 3000);
    }
  } else {
    // View FAQ before leaving (40% chance)
    if (Math.random() < 0.4) {
      await page.goto('/faq');
      await randomDelay(2000, 3000);
      await scrollSimulator.scrollNaturally(page, 'down', 2);
      await randomDelay(3000, 5000);
    }
  }

  await timingSimulator.randomPause(2000, 4000);
});
