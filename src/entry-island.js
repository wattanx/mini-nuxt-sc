import { createApp } from 'vue';
import App from './IslandApp.vue';
import { renderToString } from 'vue/server-renderer';

export async function render(ssrContext = {}) {
  const app = createApp(App, { ssrContext });

  const html = await renderToString(app, ssrContext);

  return { html };
}
