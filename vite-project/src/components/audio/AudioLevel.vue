<template>
  <div class="space-y-2">
    <div class="text-xs text-slate-500">输入电平</div>
    <div class="w-full h-3 rounded bg-slate-200 overflow-hidden">
      <div
        class="h-full bg-primary transition-all duration-150"
        :style="{ width: `${Math.max(level * 100, 4)}%` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  level: number
}>()
</script>
