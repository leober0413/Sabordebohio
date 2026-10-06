import { defineConfig, devices } from '@playwright/test'

const port = 4173
// En las sesiones en la nube se usa el Chromium preinstalado (scripts/session-start.sh).
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined

export default defineConfig({
  testDir: './e2e',
  // Las pruebas comparten la base local con seed: una a la vez.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    locale: 'es-DO',
    timezoneId: 'America/Santo_Domingo',
    trace: 'on-first-retry',
    launchOptions: { executablePath },
  },
  projects: [
    // Celular primero (360 px, docs/ui-ux.md) y PC.
    { name: 'celular', use: { ...devices['Pixel 7'], viewport: { width: 360, height: 780 } } },
    { name: 'pc', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
