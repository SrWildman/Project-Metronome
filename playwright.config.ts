import { defineConfig } from '@playwright/test';

const launchOptions = {
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--no-sandbox'],
};

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    timeout: 120_000,
  },
  use: { baseURL: 'http://localhost:4173', serviceWorkers: 'block', launchOptions },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
});
