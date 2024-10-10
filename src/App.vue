<script setup lang="ts">
import { ref } from 'vue';
import Boundary from './components/Boundary.vue';
import Island from '../lib/Island';

const count = ref(0);
</script>

<template>
  <Suspense>
    <Boundary label="Client Component">
      <button class="px-2 py-1 mt-2 bg-gray-800 rounded-md" @click="count++">increment</button>
      <Island name="CodeExample" :props="{ count }">
        <Boundary label="Client Component" class="mt-6">
          <button class="px-2 py-1 mt-2 bg-gray-800 rounded-md" @click="count++">increment</button>
        </Boundary>
      </Island>
    </Boundary>
  </Suspense>
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
