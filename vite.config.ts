import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { vitePluginSsrCss } from './plugins/ssr-css/plugin';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vitePluginSsrCss({
      entries: ['src/entry-client'],
    }),
  ],
});
