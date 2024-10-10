import { defineAsyncComponent } from 'vue';

export const islandComponents = {
  CodeExample: defineAsyncComponent(() => import('../src/components/islands/CodeExample.vue').then((c) => c.default || c)),
};
