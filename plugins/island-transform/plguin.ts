import { createUnplugin } from 'unplugin';
import MagicString from 'magic-string';
import { ELEMENT_NODE, parse, walk } from 'ultrahtml';

const TEMPLATE_RE = /<template>([\s\S]*)<\/template>/;

export const islandsTransform = createUnplugin(() => {
  return {
    name: 'island-transform',
    enforce: 'pre',
    transformInclude(id) {
      if (id.includes('islands') && id.endsWith('.vue')) {
        return true;
      }
    },
    async transform(code, id) {
      if (!code.includes('<slot ')) {
        return;
      }
      const template = code.match(TEMPLATE_RE);
      if (!template) {
        return;
      }
      const startingIndex = template.index || 0;

      const s = new MagicString(code);
      const ast = parse(template[0]);

      await walk(ast, (node) => {
        if (node.type === ELEMENT_NODE && node.name === 'slot') {
          const { attributes, loc, isSelfClosingTag } = node;

          const slotName = attributes.name ?? 'default';
          if (attributes.name) {
            delete attributes.name;
          }

          if (isSelfClosingTag) {
            s.overwrite(
              startingIndex + loc[0].start,
              startingIndex + loc[0].end,
              `<div style="display: contents;" nuxt-ssr-slot-name="${slotName}" />`
            );
          }
        }
      });

      if (s.hasChanged()) {
        return {
          code: s.toString(),
          map: s.generateMap({ source: id, includeContent: true }),
        };
      }
    },
  };
});
