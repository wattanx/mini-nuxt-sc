<script setup lang="ts">
import IslandRenderer from './lib/IslandRenderer';
import type { SSRContext } from './types/ssr-context';

type Props = {
  ssrContext: SSRContext;
};

const props = defineProps<Props>();

const islandContext = props.ssrContext.islandContext;
</script>

<template>
  <IslandRenderer :context="islandContext" />
</template>
