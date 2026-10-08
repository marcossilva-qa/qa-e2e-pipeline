import { defineConfig, devices } from '@playwright/test';
import { URLS } from './shared/caminhos.ts';

export default defineConfig({
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  // Cada massa tem o próprio usuário, então os cenários não disputam sessão entre si.
  workers: process.env.CI ? 2 : 3,
  forbidOnly: !!process.env.CI,
  // Retry só em CI: teste que passa no retry aparece como "flaky" no relatório, não some.
  retries: process.env.CI ? 1 : 0,

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'reports/playwright' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
  ],
  outputDir: 'test-results',

  use: {
    baseURL: URLS.front,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: !process.env.HEADED,
  },

  projects: [
    {
      // Regras de negócio, catálogo, collection e relatório: sem navegador, em segundos.
      name: 'unit',
      testDir: './tests-unit',
      use: { trace: 'off', screenshot: 'off' },
    },
    {
      name: 'ui',
      testDir: './ui/tests',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
});
