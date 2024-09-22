import type { RendererNode } from 'vue';
import {
  watch,
  computed,
  createStaticVNode,
  defineComponent,
  getCurrentInstance,
  h,
  ref,
  createVNode,
  onMounted,
  nextTick,
  Fragment,
  Teleport,
} from 'vue';
import { hash } from 'ohash';
import { randomUUID } from 'uncrypto';
import { joinURL, withQuery } from 'ufo';
import { debounce } from 'perfect-debounce';
import { useSSRContext } from 'vue';
import { getSlotProps } from './utils';
import { SSRContext } from '../types/ssr-context';

const pKey = '_islandPromises';
const SSR_UID_RE = /nuxt-ssr-component-uid="([^"]*)"/;
const UID_ATTR = /nuxt-ssr-component-uid(="([^"]*)")?/;
const SLOTNAME_RE = /nuxt-ssr-slot-name="([^"]*)"/g;
const SLOT_FALLBACK_RE =
  /<div nuxt-slot-fallback-start="([^"]*)"[^>]*><\/div>(((?!<div nuxt-slot-fallback-end[^>]*>)[\s\S])*)<div nuxt-slot-fallback-end[^>]*><\/div>/g;

export default defineComponent({
  name: 'Island',
  props: {
    name: {
      type: String,
      required: true,
    },
    lazy: Boolean,
    props: {
      type: Object,
      default: () => undefined,
    },
    context: {
      type: Object,
      default: () => ({}),
    },
    source: {
      type: String,
      default: () => undefined,
    },
    dangerouslyLoadClientComponents: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['error'],
  async setup(props, { slots, emit }) {
    const ssrContext = useSSRContext() as SSRContext;

    const teleportKey = ref(0);
    const instance = getCurrentInstance()!;
    const mounted = ref(false);
    onMounted(() => {
      mounted.value = true;
    });
    const ssrHTML = ref<string>(
      import.meta.client ? getFragmentHTML(instance.vnode?.el ?? null).join('') ?? '<div></div>' : '<div></div>'
    );
    const uid = ref<string>(ssrHTML.value.match(SSR_UID_RE)?.[1] ?? randomUUID());
    const availableSlots = computed(() => {
      return [...ssrHTML.value.matchAll(SLOTNAME_RE)].map((m) => m[1]);
    });

    const html = computed(() => {
      const currentSlots = Object.keys(slots);
      return ssrHTML.value.replace(SLOT_FALLBACK_RE, (full, slotName, content) => {
        // remove fallback to insert slots
        if (currentSlots.includes(slotName)) {
          return '';
        }
        return content;
      });
    });

    function setUid() {
      uid.value = ssrHTML.value.match(SSR_UID_RE)?.[1] ?? (randomUUID() as string);
    }

    const error = ref<unknown>(null);

    const hashId = computed(() => hash([props.name, props.props, props.context]));

    const slotProps = computed(() => {
      return getSlotProps(ssrHTML.value);
    });

    // @ts-expect-error
    const eventFetch = ssrContext ? ssrContext.event.fetch : fetch;

    const key = ref(0);
    async function _fetchComponent() {
      const key = `${props.name}_${hashId.value}`;

      const url = `/__island/${key}.json`;

      const r = await eventFetch(
        withQuery((import.meta.dev && import.meta.client) || props.source ? url : joinURL('/', url), {
          ...props.context,
          props: props.props ? JSON.stringify(props.props) : undefined,
        })
      );

      const result = import.meta.server || !import.meta.dev ? await r.json() : r._data;

      return result;
    }

    const ssrApp = {} as Record<string, any>;

    async function fetchComponent() {
      ssrApp[pKey] = ssrApp[pKey] || {};

      if (!ssrApp[pKey][uid.value]) {
        ssrApp[pKey][uid.value] = _fetchComponent().finally(() => {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete ssrApp[pKey]![uid.value];
        });
      }

      try {
        const res = await ssrApp[pKey][uid.value];

        ssrHTML.value = res.html.replace(UID_ATTR, () => {
          return `nuxt-ssr-component-uid="${randomUUID()}"`;
        });

        key.value++;
        error.value = null;

        if (import.meta.client) {
          // must await next tick for Teleport to work correctly with static node re-rendering
          await nextTick();
        }
        setUid();
      } catch (e) {
        console.error(e);
        error.value = e;
        emit('error', e);
      }
    }

    if (import.meta.client) {
      watch(
        props,
        debounce(() => fetchComponent(), 100),
        { deep: true }
      );
    }

    if (import.meta.client && !instance.vnode.el && props.lazy) {
      fetchComponent();
    } else if (import.meta.server || !instance.vnode.el) {
      await fetchComponent();
    }

    if (!html.value || error.value) {
      return () => createVNode('div');
    }

    return () => {
      const nodes = [
        createVNode(
          Fragment,
          {
            key: key.value,
          },
          [h(createStaticVNode(html.value, 1))]
        ),
      ];

      if (uid.value && (mounted.value || import.meta.server)) {
        for (const slot in slots) {
          if (availableSlots.value.includes(slot)) {
            nodes.push(
              createVNode(
                Teleport,
                {
                  to: import.meta.client
                    ? `[nuxt-ssr-component-uid='${uid.value}'] [nuxt-ssr-slot-name='${slot}']`
                    : `uid=${uid.value};slot=${slot}`,
                },
                {
                  default: () => (slotProps.value[slot] ?? [undefined]).map((data: any) => slots[slot]?.(data)),
                }
              )
            );
          }
        }
      }
      return nodes;
    };
  },
});

function getFragmentHTML(element: RendererNode | null) {
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
