import { h } from 'vue';
import type { Component, RendererNode } from 'vue';
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

export function getFragmentHTML(element: RendererNode | null) {
  if (element) {
    if (element.nodeName === '#comment' && element.nodeValue === '[') {
      return getFragmentChildren(element);
    }
    return [element.outerHTML];
  }
  return [];
}

function getFragmentChildren(element: RendererNode | null, blocks: string[] = []) {
  if (element && element.nodeName) {
    if (isEndFragment(element)) {
      return blocks;
    } else if (!isStartFragment(element)) {
      blocks.push(element.outerHTML);
    }

    getFragmentChildren(element.nextSibling, blocks);
  }
  return blocks;
}

function isStartFragment(element: RendererNode) {
  return element.nodeName === '#comment' && element.nodeValue === '[';
}

function isEndFragment(element: RendererNode) {
  return element.nodeName === '#comment' && element.nodeValue === ']';
}
const SLOT_PROPS_RE = /<div[^>]*nuxt-ssr-slot-name="([^"]*)" nuxt-ssr-slot-data="([^"]*)"[^/|>]*>/g;

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
