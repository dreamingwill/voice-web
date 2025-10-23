<template>
  <footer class="bg-slate-900 text-white px-4 py-2 text-xs text-center">
    © {{ year }} Voice System Prototype
  </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear()
</script>
