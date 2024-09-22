<script setup lang="ts">
import { ref } from 'vue';
import Boundary from './components/Boundary.vue';
import Island from './lib/Island';

const count = ref(0);
</script>

<template>
  <div>
    <a href="https://vitejs.dev" target="_blank">
      <img src="/vite.svg" class="logo" alt="Vite logo" />
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
    </a>
  </div>
  <Suspense>
    <Boundary label="Client Component">
      <button class="px-2 py-1 mt-2 bg-gray-800 rounded-md" @click="count++">increment</button>
      <Island name="CodeExample" :props="{ count }">
        <button class="px-2 py-1 mt-2 bg-gray-800 rounded-md" @click="count++">increment</button>
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
