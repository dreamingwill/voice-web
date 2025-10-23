<template>
  <footer class="bg-slate-900 text-white px-4 py-2 text-xs text-center">
    © {{ year }} 声纹语音识别系统演示版
  </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear()
</script>
