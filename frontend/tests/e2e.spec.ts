import { test, expect } from '@playwright/test';

test.describe('Nirliptha E2E Tests', () => {
  test('should load homepage and check title', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page).toHaveURL('http://localhost:3000/');
    const title = await page.title();
    console.log('Page Title:', title);
    expect(title).toBe('Nirlipta');
  });

  test('should navigate to investor page', async ({ page }) => {
    await page.goto('http://localhost:3000/investor');
    await expect(page).toHaveURL('http://localhost:3000/investor');
    const buttons = await page.locator('button').count();
    console.log('Investor page buttons count:', buttons);
    expect(buttons).toBeGreaterThan(0);
  });

  test('should navigate to issuer page', async ({ page }) => {
    await page.goto('http://localhost:3000/issuer');
    await expect(page).toHaveURL('http://localhost:3000/issuer');
  });

  test('should navigate to issuer-login page', async ({ page }) => {
    await page.goto('http://localhost:3000/issuer-login');
    await expect(page).toHaveURL('http://localhost:3000/issuer-login');
  });

  test('should navigate to login-investor page', async ({ page }) => {
    await page.goto('http://localhost:3000/login-investor');
    await expect(page).toHaveURL('http://localhost:3000/login-investor');
  });
});
