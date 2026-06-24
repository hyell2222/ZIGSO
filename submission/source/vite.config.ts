import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

export default defineConfig({
  plugins: [react(), tsconfigPaths(), viteSingleFile()],
  base: './', // relative paths for static assets
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
