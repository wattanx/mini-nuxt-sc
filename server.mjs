import fs from 'node:fs/promises';
import { createApp, toNodeListener, fromNodeMiddleware, defineEventHandler, send } from 'h3';
import { listen } from 'listhen';

// Constants
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 5173;
const base = process.env.BASE || '/';

// Cached production assets
const templateHtml = isProduction ? await fs.readFile('./dist/client/index.html', 'utf-8') : '';
const ssrManifest = isProduction ? await fs.readFile('./dist/client/.vite/ssr-manifest.json', 'utf-8') : undefined;

const app = createApp();

// Add Vite or respective production middlewares
let vite;
if (!isProduction) {
  const { createServer } = await import('vite');
  vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    base,
  });
  app.use(fromNodeMiddleware(vite.middlewares));
} else {
  const compression = (await import('compression')).default;
  const sirv = (await import('sirv')).default;
  app.use(fromNodeMiddleware(compression()));
  app.use(base, fromNodeMiddleware(sirv('./dist/client', { extensions: [] })));
}

// Serve HTML
app.use(
  '*',
  defineEventHandler(async (event) => {
    const { req, res } = event.node;
    try {
      const url = req.originalUrl.replace(base, '');

      let template;
      let render;
      if (!isProduction) {
        // Always read fresh template in development
        template = await fs.readFile('./index.html', 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        render = (await vite.ssrLoadModule('/src/entry-server.js')).render;
      } else {
        template = templateHtml;
        render = (await import('./dist/server/entry-server.js')).render;
      }

      const rendered = await render(url, ssrManifest);

      const html = template.replace(`<!--app-head-->`, rendered.head ?? '').replace(`<!--app-html-->`, rendered.html ?? '');

      return html;
    } catch (e) {
      vite?.ssrFixStacktrace(e);
      console.log(e.stack);
      res.status(500).end(e.stack);
    }
  })
);

(async () => {
  await listen(toNodeListener(app), { port: 3000 });
})();
