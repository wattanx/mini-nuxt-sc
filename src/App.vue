<script setup lang="ts">
import { ref } from 'vue';
import Boundary from './components/Boundary.vue';
import CodeExample from './components/CodeExample.vue';
import MarkdownRender from './components/MarkdownRender.vue';

const count = ref(0);
</script>

<template>
  <h2 class="py-8">Basic Example</h2>
  <Suspense>
    <Boundary label="Client Component">
      <button class="px-2 py-1 mt-2 bg-gray-800 rounded-md" @click="count++">increment</button>
      <CodeExample :count="count">
        <Boundary label="Client Component" class="mt-6">
          <button class="px-2 py-1 mt-2 bg-gray-800 rounded-md" @click="count++">increment</button>
        </Boundary>
      </CodeExample>
    </Boundary>
  </Suspense>

  <h2 class="py-4">Markdown Example</h2>
  <MarkdownRender />
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
