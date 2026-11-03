import {defineConfig, devices} from '@playwright/test';

// runs against the production build at every layout the app supports (see docs/plans/implementation-plan.md › Layouts)
const port = Number(process.env.FQ_PORT ?? 4173), out = port === 4173 ? 'dist' : `dist-${port}`;
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120000,
  use: {baseURL: `http://localhost:${port}`, launchOptions: {args: ['--mute-audio']}},
  projects: [
    {name: 'duo-landscape', use: {viewport: {width: 890, height: 626}, hasTouch: true}},
    {name: 'phone', use: {...devices['iPhone 13'], browserName: 'chromium', defaultBrowserType: 'chromium'}},
    {name: 'duo-outer', use: {viewport: {width: 466, height: 678}, hasTouch: true}},
    {name: 'duo-upright', use: {viewport: {width: 626, height: 890}, hasTouch: true}},
  ],
  // FQ_PORT gives a parallel agent its own build and port so test runs don't collide
  webServer: {
    command: process.env.CI ? 'npm run preview' : port === 4173 ? 'npm run build && npm run preview' : `npx vite build --outDir ${out} && npx vite preview --outDir ${out} --port ${port} --strictPort`,
    url: `http://localhost:${port}`, reuseExistingServer: !process.env.CI && port === 4173, timeout: 180000,
  },
});
