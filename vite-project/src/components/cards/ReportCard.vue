<template>
  <article class="border border-slate-200 rounded-lg p-4 bg-slate-50 flex flex-col gap-3">
    <header class="flex items-center justify-between">
      <span class="text-sm font-semibold text-slate-700 uppercase tracking-wide">Report</span>
      <el-tag :type="statusTag" size="small" effect="light">
        Status: {{ event.status }}
      </el-tag>
    </header>
    <div>
      <p class="text-base font-medium text-slate-800">{{ event.summary }}</p>
      <p v-if="event.note" class="text-sm text-slate-600 mt-2">
        {{ event.note }}
      </p>
    </div>
    <footer class="text-xs text-slate-500 flex justify-between items-center">
      <span>Reporter: {{ event.operator.name }}</span>
      <span>{{ time }}</span>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ReportEvent } from '@/types/realtime'

const props = defineProps<{ event: ReportEvent }>()

const statusTag = computed(() => {
  switch (props.event.status) {
    case 'critical':
      return 'danger'
    case 'warning':
      return 'warning'
    default:
      return 'success'
  }
})

const time = computed(() => new Date(props.event.timestamp).toLocaleTimeString())
</script>
