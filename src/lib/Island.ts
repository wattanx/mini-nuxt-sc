import type { RendererNode } from 'vue';
import { watch, computed, createStaticVNode, defineComponent, getCurrentInstance, h, ref, createVNode } from 'vue';
import { hash } from 'ohash';
import { randomUUID } from 'uncrypto';
import { joinURL, withQuery } from 'ufo';
import { debounce } from 'perfect-debounce';
import { ofetch } from 'ofetch';

const pKey = '_islandPromises';

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
    const teleportKey = ref(0);

    const error = ref<unknown>(null);
    const instance = getCurrentInstance()!;
    const hashId = computed(() => hash([props.name, props.props, props.context]));

    const html = ref(import.meta.client ? getFragmentHTML(instance?.vnode?.el).join('') ?? '<div></div>' : '<div></div>');

    const key = ref(0);
    async function _fetchComponent() {
      const key = `${props.name}_${hashId.value}`;

      const url = `http://localhost:3000/__island/${key}.json`;

      const r = await fetch(
        withQuery((import.meta.dev && import.meta.client) || props.source ? url : url, {
          ...props.context,
          props: props.props ? JSON.stringify(props.props) : undefined,
        })
      );

      // @ts-expect-error
      const result = import.meta.server || !import.meta.dev ? await r.json() : r._data;

      return result;
    }

    const ssrApp = {} as Record<string, any>;

    async function fetchComponent() {
      ssrApp[pKey] = ssrApp[pKey] || {};

      if (!ssrApp[pKey][hashId.value]) {
        ssrApp[pKey][hashId.value] = _fetchComponent().finally(() => {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete ssrApp[pKey]![hashId.value];
        });
      }

      try {
        const res = await ssrApp[pKey][hashId.value];

        key.value++;
        error.value = null;
        if (res?.html) {
          html.value = res.html;
        }
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

    return () =>
      h(
        (_, { slots }) => slots.default?.(),
        { key: key.value },
        {
          default: () => [createStaticVNode(html.value, 1)],
        }
      );
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
