import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'cu34.visual.spec.ts',
  outputDir: './tmp/cu34-visual',
  reporter: 'list',
  workers: 1,
  use: {
    channel: 'msedge',
    baseURL: 'http://127.0.0.1:4210',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm start -- --host 127.0.0.1 --port 4210',
    url: 'http://127.0.0.1:4210',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
