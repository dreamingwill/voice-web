<template>
  <transition name="fade">
    <div
      v-if="event"
      class="rounded-md border border-danger bg-danger/90 text-white px-4 py-3 flex items-center justify-between gap-4 animate-pulse"
    >
      <div>
        <p class="font-semibold text-sm uppercase tracking-wide">Unauthorized Access Detected</p>
        <p class="text-xs mt-1">
          {{ event.operator.name }} attempted {{ event.type }} @ {{ formattedTime }} — immediate review
          required.
        </p>
      </div>
      <el-button type="danger" plain size="small" @click="$emit('acknowledge')">
        Acknowledge
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
