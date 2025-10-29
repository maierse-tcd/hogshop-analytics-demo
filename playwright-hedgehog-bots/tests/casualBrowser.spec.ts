import { test } from '@playwright/test';
import { HumanMouseSimulator, HumanScrollSimulator, HumanTimingSimulator } from '../../lib/humanBehavior.js';
import { randomDelay, randomInt } from '../../lib/helpers.js';

test('Casual Browser Journey', async ({ page }) => {
  const mouseSimulator = new HumanMouseSimulator();
  const scrollSimulator = new HumanScrollSimulator();
  const timingSimulator = new HumanTimingSimulator();

  // Navigate to homepage
  await page.goto('/');
  await randomDelay(1000, 2000);

  // Mouse movement across hero section
  await mouseSimulator.moveToRandomPosition(page);
  await randomDelay(2000, 4000);

  // Scroll down to see products
  await scrollSimulator.scrollNaturally(page, 'down', 3);
  await randomDelay(3000, 5000);

  // Hover over 2-3 product cards (no click)
  const productCards = page.locator('[data-testid="product-card"], .product-card, article').all();
  const cards = await productCards;
  const cardsToHover = Math.min(randomInt(2, 3), cards.length);
  
  for (let i = 0; i < cardsToHover; i++) {
    const randomIndex = Math.floor(Math.random() * cards.length);
    try {
      await mouseSimulator.hoverElement(page, `article:nth-child(${randomIndex + 1})`, 2000);
      await randomDelay(1500, 3000);
    } catch (error) {
      // Continue if element not found
    }
  }

  // Occasional scroll back
  await scrollSimulator.occasionalScrollBack(page, 0.3);

  // View FAQ page
  if (Math.random() < 0.3) {
    const faqLink = page.locator('a[href*="/faq"]').first();
    if (await faqLink.isVisible().catch(() => false)) {
      await timingSimulator.hesitateBeforeClick(page, faqLink, 500, 1500);
      await faqLink.click();
      await randomDelay(3000, 5000);
      
      // Read FAQ sections
      await scrollSimulator.scrollNaturally(page, 'down', 2);
      await randomDelay(5000, 8000);
    }
  }

  // View About page
  if (Math.random() < 0.2) {
    const aboutLink = page.locator('a[href*="/about"]').first();
    if (await aboutLink.isVisible().catch(() => false)) {
      await timingSimulator.hesitateBeforeClick(page, aboutLink, 500, 1500);
      await aboutLink.click();
      await randomDelay(3000, 5000);
      
      await scrollSimulator.scrollNaturally(page, 'down', 2);
      await randomDelay(4000, 7000);
    }
  }

  // Maybe add item to cart (15% chance)
  if (Math.random() < 0.15) {
    await page.goto('/');
    await randomDelay(1000, 2000);
    
    const productCard = page.locator('article').first();
    await timingSimulator.hesitateBeforeClick(page, productCard, 800, 1500);
    await productCard.click();
    await randomDelay(2000, 4000);
    
    const addToCartButton = page.locator('button:has-text("Add to Cart")').first();
    if (await addToCartButton.isVisible().catch(() => false)) {
      await timingSimulator.hesitateBeforeClick(page, addToCartButton, 1000, 2000);
      await addToCartButton.click();
      await randomDelay(1000, 2000);
    }
  }

  // Final pause before exit
  await timingSimulator.randomPause(2000, 5000);
});
