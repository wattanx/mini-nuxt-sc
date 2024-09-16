<script setup lang="ts">
type Props = {
  label: string;
  isClient?: boolean;
};

withDefaults(defineProps<Props>(), {
  isClient: true,
});
</script>

<template>
  <div
    class="p-6 rounded-md relative border-dashed border-gray-400 border"
    :class="{
      'bg-red-900': isClient,
      'bg-green-900': !isClient,
    }"
  >
    <p class="absolute -top-4 bg-gray-600 px-4 py-2 rounded-full text-sm">
      {{ label }}
    </p>
    <slot />
  </div>
</template>
