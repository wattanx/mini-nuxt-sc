import fs from 'node:fs/promises';
import { createApp, toNodeListener, fromNodeMiddleware, defineEventHandler, createRouter, getQuery, readBody } from 'h3';
import { listen } from 'listhen';
import destr from 'destr';

// Constants
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 5173;
const base = process.env.BASE || '/';

// Cached production assets
const templateHtml = isProduction ? await fs.readFile('./dist/client/index.html', 'utf-8') : '';
const ssrManifest = isProduction ? await fs.readFile('./dist/client/.vite/ssr-manifest.json', 'utf-8') : undefined;

const router = createRouter();
const app = createApp();

app.use(router);

// Add Vite or respective production middlewares
let vite;
if (!isProduction) {
  const { createServer } = await import('vite');
  vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    base,
    define: {
      'import.meta.dev': !isProduction,
      'import.meta.server': true,
    },
  });
  app.use(fromNodeMiddleware(vite.middlewares));
} else {
  const compression = (await import('compression')).default;
  const sirv = (await import('sirv')).default;
  app.use(fromNodeMiddleware(compression()));
  app.use(base, fromNodeMiddleware(sirv('./dist/client', { extensions: [] })));
}

// Serve HTML
router.get(
  '/',
  defineEventHandler(async (event) => {
    const { req, res } = event.node;
    console.log(req.originalUrl);
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

const ISLAND_SUFFIX_RE = /\.json(\?.*)?$/;
async function getIslandContext(event) {
  let url = event.path || '';

  const componentParts = url
    .substring('/__island'.length + 1)
    .replace(ISLAND_SUFFIX_RE, '')
    .split('_');
  const hashId = componentParts.length > 1 ? componentParts.pop() : undefined;
  const componentName = componentParts.join('_');

  // TODO: Validate context
  const context = event.method === 'GET' ? getQuery(event) : await readBody(event);

  const ctx = {
    url: '/',
    ...context,
    id: hashId,
    name: componentName,
    props: destr(context.props) || {},
  };

  return ctx;
}

router.get(
  '/__island/*',
  defineEventHandler(async (event) => {
    const { req, res } = event.node;
    console.log('island', req.originalUrl);
    try {
      const url = req.originalUrl.replace(base, '');

      let render;
      if (!isProduction) {
        render = (await vite.ssrLoadModule('/src/entry-island.js')).render;
      } else {
        template = templateHtml;
        render = (await import('./dist/entry-island.js')).render;
      }

      const islandContext = await getIslandContext(event);

      const ssrContext = {
        islandContext,
      };

      const rendered = await render(ssrContext);

      return {
        id: islandContext.id,
        html: ssrContext.teleports['island'].replace(/<!--teleport(?: start)? anchor-->/g, ''),
      };
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
