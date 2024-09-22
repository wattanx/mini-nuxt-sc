import fs from 'node:fs/promises';
import {
  createApp,
  toNodeListener,
  fromNodeMiddleware,
  defineEventHandler,
  createRouter,
  getQuery,
  readBody,
  fetchWithEvent,
} from 'h3';
import { listen } from 'listhen';
import destr from 'destr';
import type { SSRContext } from './src/types/ssr-context';
import { createFetch as createLocalFetch, createCall } from 'unenv/runtime/fetch/index';

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
      'import.meta.client': false,
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

    const localCall = createCall(toNodeListener(app) as any);
    const localFetch = createLocalFetch(localCall, globalThis.fetch);

    // @ts-expect-error
    event.fetch = (req, init) => fetchWithEvent(event, req, init, { fetch: localFetch });

    try {
      const url = req.originalUrl!.replace(base, '');

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

      const rendered = await render({ event });

      const html = template.replace(`<!--app-head-->`, rendered.head ?? '').replace(`<!--app-html-->`, rendered.html ?? '');

      return html;
    } catch (e) {
      vite?.ssrFixStacktrace(e);
      console.log(e.stack);
      res.statusCode = 500;
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
    try {
      const url = req.originalUrl!.replace(base, '');

      let render;
      if (!isProduction) {
        render = (await vite.ssrLoadModule('/src/entry-island.js')).render;
      } else {
        render = (await import('./dist/island/entry-island.js')).render;
      }

      const islandContext = await getIslandContext(event);

      const ssrContext: SSRContext = {
        event,
        islandContext,
      };

      const rendered = await render(ssrContext);

      return {
        id: islandContext.id,
        html: replaceServerOnlyComponentsSlots(ssrContext, rendered.html),
      };
    } catch (e) {
      vite?.ssrFixStacktrace(e);
      console.log(e.stack);
      res.statusCode = 500;
    }
  })
);
(async () => {
  await listen(toNodeListener(app), { port: 3000 });
})();

const SSR_TELEPORT_MARKER = /^uid=([^;]*);slot=(.*)$/;
function replaceServerOnlyComponentsSlots(ssrContext: SSRContext, html: string): string {
  const { teleports, islandContext } = ssrContext;
  if (islandContext || !teleports) {
    return html;
  }
  for (const key in teleports) {
    const match = key.match(SSR_TELEPORT_MARKER);
    if (!match) {
      continue;
    }
    const [, uid, slot] = match;
    if (!uid || !slot) {
      continue;
    }
    html = html.replace(
      new RegExp(
        `<div nuxt-ssr-component-uid="${uid}"[^>]*>((?!nuxt-ssr-slot-name="${slot}"|nuxt-ssr-component-uid)[\\s\\S])*<div [^>]*nuxt-ssr-slot-name="${slot}"[^>]*>`
      ),
      (full) => {
        return full + teleports[key];
      }
    );
  }
  return html;
}
