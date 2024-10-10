<script setup lang="ts">
import fsp from 'node:fs/promises';
import sanitizeHtml from 'sanitize-html';
import { marked } from 'marked';

const content = await fsp.readFile('content/example.md', 'utf-8');
const html = await marked(content || '');
const sanitizedHtml = sanitizeHtml(html);
</script>

<template>
  <div v-html="sanitizedHtml"></div>
</template>

<style scoped>
:deep(h1, h2, h3, h4) {
  @apply mb-1 mt-10 font-semibold;
}

:deep(h2 a) {
  @apply text-inherit;
}

:deep(h1) {
  @apply text-2xl;
}

:deep(p) {
  @apply my-4;
}

:deep(pre) {
  @apply my-4 rounded-lg p-4 text-sm;
}

:deep(a) {
  @apply text-blue-400;
}
</style>
