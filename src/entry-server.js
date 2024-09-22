import { renderToString } from 'vue/server-renderer';
import { createApp } from './main';

export async function render(ssrContext = {}) {
  const { app } = createApp();

  const html = await renderToString(app, ssrContext);

  return { html };
}
