<script setup lang="ts">
import { codeToHtml } from 'shiki';

const code = 'const a = 1';
// const html = await codeToHtml(code, {
//   lang: 'javascript',
//   theme: 'vitesse-dark',
// });
</script>

<template>
  <div class="p-4 bg-blue-400 rounded-md">
    <p>Server Component (CodeExample.server.vue)</p>
    <!-- <div v-html="html" /> -->
  </div>
</template>
