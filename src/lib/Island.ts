import { watch, computed, createStaticVNode, defineComponent, getCurrentInstance, onMounted, ref, createVNode } from 'vue';
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
    const key = ref(0);
    const error = ref<unknown>(null);
    const instance = getCurrentInstance()!;
    const hashId = computed(() => hash([props.name, props.props, props.context]));

    const html = ref('');

    async function _fetchComponent() {
      const key = `${props.name}_${hashId.value}`;

      const url = `http://localhost:3000/__island/${key}.json`;

      const r = await fetch(
        withQuery((import.meta.dev && import.meta.client) || props.source ? url : url, {
          ...props.context,
          props: props.props ? JSON.stringify(props.props) : undefined,
        })
      );

      const result = import.meta.server || !import.meta.dev ? await r.json() : r._data;

      return result;
    }

    const nuxtApp = {} as Record<string, any>;

    async function fetchComponent() {
      nuxtApp[pKey] = nuxtApp[pKey] || {};
      // TODO: support ssr
      if (!nuxtApp[pKey][hashId.value]) {
        console.log('server render', import.meta.server);
        nuxtApp[pKey][hashId.value] = _fetchComponent().finally(() => {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete nuxtApp[pKey]![hashId.value];
        });
      }

      try {
        const res = await nuxtApp[pKey][hashId.value];
        console.log('res', res);

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
    } else if (import.meta.server || !instance.vnode.el || !nuxtApp.payload.serverRendered) {
      await fetchComponent();
    }

    if (!html.value || error.value) {
      return () => createVNode('div');
    }

    return () => createStaticVNode(html.value, 1);
  },
});
