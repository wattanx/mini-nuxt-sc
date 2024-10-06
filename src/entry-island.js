import { createSSRApp } from 'vue';
import IslandRenderer from './lib/IslandRenderer';
import { renderToString } from 'vue/server-renderer';

export async function render(ssrContext = {}) {
  const app = createSSRApp(IslandRenderer, { context: ssrContext.islandContext });

  const html = await renderToString(app, ssrContext);

  return { html };
}
