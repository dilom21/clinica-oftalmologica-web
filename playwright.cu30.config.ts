import { defineConfig } from '@playwright/test';
import path from 'node:path';

const apiRoot = path.resolve(__dirname, '../clinica-oftalmologica-api');
const python = process.env['CU30_TEST_PYTHON'] || path.join(
  apiRoot, 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
);

export default defineConfig({
  testDir: './e2e',
  testMatch: 'cu30.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: 'line',
  outputDir: '.cu30-e2e-results',
  use: {
    baseURL: 'http://127.0.0.1:4202',
    browserName: 'chromium',
    channel: process.env['CU30_TEST_BROWSER'] || 'msedge',
    headless: true,
    viewport: { width: 1365, height: 900 },
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'off',
  },
  webServer: [
    {
      command: `"${python}" -m uvicorn tests.cu30_entorno_aislado:crear_app --factory --host 127.0.0.1 --port 8001`,
      cwd: apiRoot,
      url: 'http://127.0.0.1:8001/__cu30_test/status',
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: `${process.platform === 'win32' ? 'npm.cmd' : 'npm'} run start -- --configuration cu30-e2e --host 127.0.0.1 --port 4202`,
      url: 'http://127.0.0.1:4202/login',
      reuseExistingServer: false,
      timeout: 90_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
