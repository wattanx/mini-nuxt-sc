import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { vitePluginSsrCss } from './plugins/ssr-css/plugin';
import { islandsTransform } from './plugins/island-transform/plguin';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vitePluginSsrCss({
      entries: ['src/entry-client'],
    }),
    islandsTransform.vite(),
  ],
  define: {
    'import.meta.client': true,
  },
});
