import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    headless: true,
    video: 'on',
  },
});
