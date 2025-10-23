<template>
  <transition name="fade">
    <div
      v-if="event"
      class="rounded-md border border-danger bg-danger/90 text-white px-4 py-3 flex items-center justify-between gap-4 animate-pulse"
    >
      <div>
        <p class="font-semibold text-sm tracking-wide">检测到未授权操作</p>
        <p class="text-xs mt-1">
          {{ event.operator.name }} 于 {{ formattedTime }} 尝试执行 {{ translateType(event.type) }}，请立即复核。
        </p>
      </div>
      <el-button type="danger" plain size="small" @click="$emit('acknowledge')">
        已知晓
      </el-button>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StructuredEvent } from '@/types/realtime'

const props = defineProps<{
  event: StructuredEvent | null
}>()

const formattedTime = computed(() => {
  if (!props.event) return ''
  return new Date(props.event.timestamp).toLocaleTimeString()
})

function translateType(type: StructuredEvent['type']) {
  return type === 'command' ? '指令事件' : '报告事件'
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
