/**
 * E2E Tests for Semester Scheduler Electron App
 * Tests core user flows with Playwright
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';

let electronApp: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  // Launch Electron app
  electronApp = await electron.launch({
    args: [path.join(__dirname, '..', 'dist', 'main', 'main.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });
  
  // Get the first window
  page = await electronApp.firstWindow();
  
  // Wait for app to be ready
  await page.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  await electronApp.close();
});

test.describe('Application Launch', () => {
  test('should display the main window', async () => {
    const title = await page.title();
    expect(title).toBe('Semester Scheduler');
  });

  test('should show the Import tab by default', async () => {
    const importTab = page.locator('[role="tab"][aria-selected="true"]');
    await expect(importTab).toContainText('Import');
  });

  test('should have accessible skip link', async () => {
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toHaveText('Skip to main content');
  });
});

test.describe('Tab Navigation', () => {
  test('should navigate between tabs', async () => {
    // Click Staff tab
    await page.click('text=Staff');
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Staff');
    
    // Click Departments tab
    await page.click('text=Departments');
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Departments');
    
    // Click Flags tab
    await page.click('text=Flags');
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Flags');
    
    // Return to Import
    await page.click('text=Import');
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Import');
  });

  test('should support keyboard navigation', async () => {
    // Focus first tab
    await page.click('text=Import');
    
    // Press Right Arrow to move to next tab
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[role="tab"]:focus')).toContainText('Staff');
  });
});

test.describe('Settings Panel', () => {
  test('should open and close settings', async () => {
    // Open settings
    await page.click('[aria-label*="Settings"]');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Close settings
    await page.click('[aria-label="Close settings"]');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should open settings with keyboard shortcut', async () => {
    // Press Cmd+, (or Ctrl+, on Windows)
    await page.keyboard.press('Meta+,');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });
});

test.describe('Import Tab', () => {
  test.beforeEach(async () => {
    await page.click('text=Import');
  });

  test('should display drop zones for CSV files', async () => {
    await expect(page.locator('text=Drop Staff CSV Here')).toBeVisible();
    await expect(page.locator('text=Drop Department CSV Here')).toBeVisible();
  });

  test('should have download sample buttons', async () => {
    await expect(page.locator('text=Download Sample').first()).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should have proper ARIA labels', async () => {
    // Check main navigation
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    
    // Check main content area
    await expect(page.locator('[role="main"]')).toBeVisible();
  });

  test('should support high contrast mode', async () => {
    // Open settings
    await page.click('[aria-label*="Settings"]');
    
    // Toggle high contrast
    await page.click('#highContrast');
    
    // Save settings
    await page.click('text=Save Changes');
    
    // Verify class is applied
    await expect(page.locator('.high-contrast')).toBeVisible();
  });
});
