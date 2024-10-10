import type { RendererNode } from 'vue';
import destr from 'destr';

const TRANSLATE_RE = /&(nbsp|amp|quot|lt|gt);/g;
const NUMSTR_RE = /&#(\d+);/gi;

export function decodeHtmlEntities(html: string) {
  const translateDict = {
    nbsp: ' ',
    amp: '&',
    quot: '"',
    lt: '<',
    gt: '>',
  } as const;
  return html
    .replace(TRANSLATE_RE, function (_, entity: keyof typeof translateDict) {
      return translateDict[entity];
    })
    .replace(NUMSTR_RE, function (_, numStr: string) {
      const num = parseInt(numStr, 10);
      return String.fromCharCode(num);
    });
}

export function getFragmentHTML(element: RendererNode | null, withoutSlots = false): string[] | null {
  if (element) {
    if (element.nodeName === '#comment' && element.nodeValue === '[') {
      return getFragmentChildren(element, [], withoutSlots);
    }
    if (withoutSlots) {
      const clone = element.cloneNode(true);
      clone.querySelectorAll('[data-island-slot]').forEach((n: Element) => {
        n.innerHTML = '';
      });
      return [clone.outerHTML];
    }
    return [element.outerHTML];
  }
  return null;
}

function getFragmentChildren(element: RendererNode | null, blocks: string[] = [], withoutSlots = false) {
  if (element && element.nodeName) {
    if (isEndFragment(element)) {
      return blocks;
    } else if (!isStartFragment(element)) {
      const clone = element.cloneNode(true) as Element;
      if (withoutSlots) {
        clone.querySelectorAll('[data-island-slot]').forEach((n) => {
          n.innerHTML = '';
        });
      }
      blocks.push(clone.outerHTML);
    }

    getFragmentChildren(element.nextSibling, blocks, withoutSlots);
  }
  return blocks;
}

function isStartFragment(element: RendererNode) {
  return element.nodeName === '#comment' && element.nodeValue === '[';
}

function isEndFragment(element: RendererNode) {
  return element.nodeName === '#comment' && element.nodeValue === ']';
}
const SLOT_PROPS_RE = /<div[^>]*data-island-slot="([^"]*)" nuxt-ssr-slot-data="([^"]*)"[^/|>]*>/g;

export function getSlotProps(html: string) {
  const slotsDivs = html.matchAll(SLOT_PROPS_RE);
  const data: Record<string, any> = {};
  for (const slot of slotsDivs) {
    const [_, slotName, json] = slot;
    const slotData = destr(decodeHtmlEntities(json));
    data[slotName] = slotData;
  }
  return data;
}
