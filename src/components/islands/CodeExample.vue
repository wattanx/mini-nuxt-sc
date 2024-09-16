<script setup lang="ts">
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import 'highlight.js/styles/github-dark.css';

hljs.registerLanguage('typescript', typescript);

type Props = {
  count: number;
};

const props = defineProps<Props>();

const code = `const a = ${props.count}`;
const html = hljs.highlightAuto(code).value;
</script>

<template>
  <div class="p-6 bg-blue-900 rounded-md relative border-dashed border-gray-400 border mt-6">
    <div class="space-y-4">
      <p class="absolute -top-4 bg-gray-600 px-4 py-2 rounded-full text-sm">Server Component</p>
      <p>This component is not included in the bundle</p>
      <p>If count is changed, code is changed.</p>
      <div class="bg-gray-900" v-html="html" />
    </div>

    <slot />
  </div>
</template>
