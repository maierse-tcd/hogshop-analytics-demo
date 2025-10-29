import { Page, Locator } from '@playwright/test';
import { randomDelay, randomInt } from './helpers.js';

export class HumanMouseSimulator {
  /**
   * Move mouse in Bezier curve (not straight line) for natural movement
   */
  async moveMouseNaturally(
    page: Page,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    duration: number = 800
  ): Promise<void> {
    const steps = 20;
    const stepDelay = duration / steps;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const bezierT = this.cubicBezier(t);
      
      // Add slight randomness to path
      const jitterX = (Math.random() - 0.5) * 10;
      const jitterY = (Math.random() - 0.5) * 10;
      
      const x = fromX + (toX - fromX) * bezierT + jitterX;
      const y = fromY + (toY - fromY) * bezierT + jitterY;
      
      await page.mouse.move(x, y);
      await page.waitForTimeout(stepDelay);
    }
  }

  /**
   * Cubic Bezier easing for natural acceleration/deceleration
   */
  private cubicBezier(t: number): number {
    return t * t * (3 - 2 * t); // Smoothstep function
  }

  /**
   * Random micro-jitter (2-5px movements)
   */
  async addMouseJitter(page: Page, duration: number = 3000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < duration) {
      const viewport = page.viewportSize();
      if (!viewport) break;
      
      const currentPos = await page.evaluate(() => ({
        x: (window as any).mouseX || window.innerWidth / 2,
        y: (window as any).mouseY || window.innerHeight / 2
      }));
      
      const jitterX = (Math.random() - 0.5) * 10;
      const jitterY = (Math.random() - 0.5) * 10;
      
      await page.mouse.move(currentPos.x + jitterX, currentPos.y + jitterY);
      await randomDelay(1000, 3000);
    }
  }

  /**
   * Hover over element with natural entrance/exit
   */
  async hoverElement(page: Page, selector: string, hoverDuration: number = 1500): Promise<void> {
    try {
      const element = page.locator(selector).first();
      const box = await element.boundingBox();
      
      if (box) {
        const targetX = box.x + box.width / 2;
        const targetY = box.y + box.height / 2;
        
        const viewport = page.viewportSize();
        const currentX = viewport ? viewport.width / 2 : 960;
        const currentY = viewport ? viewport.height / 2 : 540;
        
        await this.moveMouseNaturally(page, currentX, currentY, targetX, targetY, 800);
        await randomDelay(hoverDuration - 200, hoverDuration + 200);
      }
    } catch (error) {
      // Element might not exist or be visible, continue silently
    }
  }

  /**
   * Move mouse to random viewport position (simulate distraction)
   */
  async moveToRandomPosition(page: Page): Promise<void> {
    const viewport = page.viewportSize();
    if (!viewport) return;
    
    const targetX = randomInt(100, viewport.width - 100);
    const targetY = randomInt(100, viewport.height - 100);
    
    const currentX = viewport.width / 2;
    const currentY = viewport.height / 2;
    
    await this.moveMouseNaturally(page, currentX, currentY, targetX, targetY, 1000);
  }
}

export class HumanScrollSimulator {
  /**
   * Scroll in chunks with pauses (simulate reading)
   */
  async scrollNaturally(page: Page, direction: 'down' | 'up' = 'down', chunks: number = 3): Promise<void> {
    const scrollAmount = direction === 'down' ? 300 : -300;
    
    for (let i = 0; i < chunks; i++) {
      await page.mouse.wheel(0, scrollAmount);
      await randomDelay(800, 2000);
    }
  }

  /**
   * Scroll to element with overshoot then correct (human behavior)
   */
  async scrollToElementNaturally(page: Page, selector: string): Promise<void> {
    try {
      const element = page.locator(selector).first();
      await element.scrollIntoViewIfNeeded();
      
      // Overshoot slightly
      await page.mouse.wheel(0, 100);
      await randomDelay(200, 400);
      
      // Correct back
      await page.mouse.wheel(0, -50);
      await randomDelay(300, 600);
    } catch (error) {
      // Element might not exist, continue silently
    }
  }

  /**
   * Random scroll-up (backtrack to re-read)
   */
  async occasionalScrollBack(page: Page, probability: number = 0.2): Promise<void> {
    if (Math.random() < probability) {
      await page.mouse.wheel(0, -200);
      await randomDelay(1000, 2000);
    }
  }

  /**
   * Viewport-specific scroll (stop at content)
   */
  async scrollWithContentAwareness(page: Page): Promise<void> {
    const viewportHeight = page.viewportSize()?.height || 1080;
    const scrollSteps = 3;
    
    for (let i = 0; i < scrollSteps; i++) {
      await page.mouse.wheel(0, viewportHeight * 0.6);
      await randomDelay(2000, 5000); // Read content
      
      // Occasional backtrack
      if (Math.random() < 0.3) {
        await page.mouse.wheel(0, -150);
        await randomDelay(1000, 2000);
      }
    }
  }
}

export class HumanTimingSimulator {
  /**
   * Variable delays based on content type
   */
  getReadingDelay(contentType: 'headline' | 'paragraph' | 'product_card' | 'button'): number {
    const delays = {
      headline: [2000, 4000],
      paragraph: [5000, 15000],
      product_card: [8000, 20000],
      button: [500, 1500]
    };
    
    const [min, max] = delays[contentType];
    return randomInt(min, max);
  }

  /**
   * Simulate "decision hesitation" before clicks
   */
  async hesitateBeforeClick(page: Page, locator: Locator, minDelay: number = 500, maxDelay: number = 3000): Promise<void> {
    const delay = randomInt(minDelay, maxDelay);
    
    // Move mouse to element first
    try {
      const box = await locator.boundingBox();
      if (box) {
        const mouseSimulator = new HumanMouseSimulator();
        const targetX = box.x + box.width / 2;
        const targetY = box.y + box.height / 2;
        
        const viewport = page.viewportSize();
        const currentX = viewport ? viewport.width / 2 : 960;
        const currentY = viewport ? viewport.height / 2 : 540;
        
        await mouseSimulator.moveMouseNaturally(page, currentX, currentY, targetX, targetY, 600);
      }
    } catch (error) {
      // Continue if element not found
    }
    
    await page.waitForTimeout(delay);
  }

  /**
   * Random pauses (simulate thinking/distraction)
   */
  async randomPause(minMs: number = 2000, maxMs: number = 8000): Promise<void> {
    await randomDelay(minMs, maxMs);
  }
}
