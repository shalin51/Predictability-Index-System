import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          redirect: resolve(__dirname, 'redirect.html'),
        },
      },
    },
    resolve: {
      alias: {
        '@amfpi/shared': resolve(__dirname, '../packages/shared/src/index.ts'),
      },
    },
    server: {
      port: parseInt(env.DASHBOARD_PORT ?? '3000', 10),
      open: false,
      cors: true,
    },
  };
});
