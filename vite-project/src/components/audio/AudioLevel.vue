<template>
  <div class="flex items-center gap-3">
    <p class="text-xs text-slate-500 whitespace-nowrap">输入电平</p>
    <div class="h-16 w-5 rounded bg-slate-200 overflow-hidden flex items-end">
      <div
        class="w-full bg-primary transition-all duration-150"
        :style="{ height: `${Math.max(level * 100, 6)}%` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  level: number
}>()
</script>
