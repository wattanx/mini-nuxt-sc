import { defineComponent, createBlock, Teleport, h } from 'vue';
import { islandComponents } from './component.island';

export default defineComponent({
  name: 'IslandRenderer',
  props: {
    context: {
      type: Object as () => { name: string; props?: Record<string, any> },
      required: true,
    },
  },
  async setup(props) {
    // @ts-ignore
    const component = islandComponents[props.context.name];

    if (!component) {
      throw Error(`Island component not found: ${JSON.stringify(component)}`);
    }

    if (typeof component === 'object') {
      await component.__asyncLoader?.();
    }

    return () => [createBlock(Teleport as any, { to: 'island' }, [h(component || 'span', props.context.props)])];
  },
});
