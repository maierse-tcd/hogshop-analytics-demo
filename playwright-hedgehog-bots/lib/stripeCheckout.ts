import { Page } from '@playwright/test';
import { generateAddress } from './addressGenerator.js';
import { randomDelay, randomChoice } from './helpers.js';
import { HumanMouseSimulator, HumanTimingSimulator } from './humanBehavior.js';

export type PaymentMethod = 'card' | 'bancontact' | 'eps';
export type Currency = 'USD' | 'EUR';

export class StripeCheckoutHandler {
  private mouseSimulator: HumanMouseSimulator;
  private timingSimulator: HumanTimingSimulator;

  constructor() {
    this.mouseSimulator = new HumanMouseSimulator();
    this.timingSimulator = new HumanTimingSimulator();
  }

  /**
   * Select payment method (80% card, 10% bancontact, 10% eps)
   */
  getRandomPaymentMethod(): PaymentMethod {
    const random = Math.random();
    if (random < 0.8) return 'card';
    if (random < 0.9) return 'bancontact';
    return 'eps';
  }

  /**
   * Select currency (50% USD, 50% EUR)
   */
  getRandomCurrency(): Currency {
    return Math.random() < 0.5 ? 'USD' : 'EUR';
  }

  /**
   * Fill Stripe checkout form
   */
  async fillStripeCheckout(page: Page, paymentMethod: PaymentMethod = 'card'): Promise<boolean> {
    try {
      // Wait for Stripe iframe to load
      await randomDelay(2000, 3000);

      const region = Math.random() < 0.6 ? 'EU' : 'US';
      const address = generateAddress(region);

      if (paymentMethod === 'card') {
        return await this.fillCardPayment(page, address);
      } else if (paymentMethod === 'bancontact') {
        return await this.fillBancontactPayment(page, address);
      } else {
        return await this.fillEPSPayment(page, address);
      }
    } catch (error) {
      console.error('Stripe checkout error:', error);
      return false;
    }
  }

  /**
   * Fill card payment details
   */
  private async fillCardPayment(page: Page, address: any): Promise<boolean> {
    try {
      // Wait for Stripe embedded checkout to load
      await page.waitForLoadState('networkidle');
      await randomDelay(1500, 2500);

      // Look for email input first (if not logged in)
      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isVisible().catch(() => false)) {
        await this.timingSimulator.hesitateBeforeClick(page, emailInput, 300, 800);
        await emailInput.click();
        await this.typeHumanLike(page, emailInput, address.name.toLowerCase().replace(' ', '.') + '@example.com');
      }

      // Card number
      const cardInput = page.frameLocator('iframe[title*="Secure payment input"]').locator('input[name="number"]').first();
      await this.timingSimulator.hesitateBeforeClick(page, cardInput, 500, 1200);
      await cardInput.fill('4242424242424242');
      await randomDelay(300, 600);

      // Expiry
      const expiryInput = page.frameLocator('iframe[title*="Secure payment input"]').locator('input[name="expiry"]').first();
      await expiryInput.fill('1228');
      await randomDelay(200, 400);

      // CVC
      const cvcInput = page.frameLocator('iframe[title*="Secure payment input"]').locator('input[name="cvc"]').first();
      await cvcInput.fill('123');
      await randomDelay(300, 600);

      // Billing details
      const nameInput = page.locator('input[name="billingDetails.name"]').first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill(address.name);
        await randomDelay(200, 400);
      }

      // Country
      const countrySelect = page.locator('select[name="billingDetails.address.country"]').first();
      if (await countrySelect.isVisible().catch(() => false)) {
        await countrySelect.selectOption(address.country);
        await randomDelay(300, 600);
      }

      // Postal code
      const postalInput = page.locator('input[name="billingDetails.address.postalCode"]').first();
      if (await postalInput.isVisible().catch(() => false)) {
        await postalInput.fill(address.postalCode);
        await randomDelay(300, 600);
      }

      // Click Pay button
      const payButton = page.locator('button[type="submit"]').filter({ hasText: /pay|submit/i }).first();
      await this.timingSimulator.hesitateBeforeClick(page, payButton, 800, 2000);
      await payButton.click();

      // Wait for redirect
      await page.waitForURL(/\/success/, { timeout: 30000 });
      return true;
    } catch (error) {
      console.error('Card payment error:', error);
      return false;
    }
  }

  /**
   * Fill Bancontact payment
   */
  private async fillBancontactPayment(page: Page, address: any): Promise<boolean> {
    try {
      // Select Bancontact payment method
      const bancontactButton = page.locator('button', { hasText: /bancontact/i }).first();
      await this.timingSimulator.hesitateBeforeClick(page, bancontactButton, 500, 1000);
      await bancontactButton.click();
      await randomDelay(1000, 2000);

      // Fill name
      const nameInput = page.locator('input[name="billingDetails.name"]').first();
      await nameInput.fill(address.name);
      await randomDelay(500, 1000);

      // Submit
      const submitButton = page.locator('button[type="submit"]').first();
      await this.timingSimulator.hesitateBeforeClick(page, submitButton, 800, 2000);
      await submitButton.click();

      // Wait for redirect to Bancontact test page, then auto-approve
      await randomDelay(3000, 5000);
      
      return true;
    } catch (error) {
      console.error('Bancontact payment error:', error);
      return false;
    }
  }

  /**
   * Fill EPS payment
   */
  private async fillEPSPayment(page: Page, address: any): Promise<boolean> {
    try {
      // Select EPS payment method
      const epsButton = page.locator('button', { hasText: /eps/i }).first();
      await this.timingSimulator.hesitateBeforeClick(page, epsButton, 500, 1000);
      await epsButton.click();
      await randomDelay(1000, 2000);

      // Select bank
      const banks = ['Erste Bank', 'BAWAG', 'Raiffeisen', 'Bank Austria'];
      const bankSelect = page.locator('select[name="bank"]').first();
      await bankSelect.selectOption(randomChoice(banks));
      await randomDelay(500, 1000);

      // Submit
      const submitButton = page.locator('button[type="submit"]').first();
      await this.timingSimulator.hesitateBeforeClick(page, submitButton, 800, 2000);
      await submitButton.click();

      await randomDelay(3000, 5000);
      
      return true;
    } catch (error) {
      console.error('EPS payment error:', error);
      return false;
    }
  }

  /**
   * Type like a human (100-200ms per character)
   */
  private async typeHumanLike(page: Page, element: any, text: string): Promise<void> {
    for (const char of text) {
      await element.type(char);
      await randomDelay(100, 200);
    }
  }
}
