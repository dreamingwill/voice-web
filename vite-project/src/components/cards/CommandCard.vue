<template>
  <article
    class="border border-primary/40 rounded-lg p-4 bg-white shadow-sm flex flex-col gap-3"
  >
    <header class="flex items-center justify-between">
      <span class="text-sm font-semibold text-primary uppercase tracking-wide">Command</span>
      <el-tag :type="priorityTag" size="small" effect="dark">
        Priority: {{ event.priority }}
      </el-tag>
    </header>
    <div>
      <p class="text-base font-medium">{{ event.command }}</p>
      <dl class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
        <template v-for="(value, key) in event.params" :key="key">
          <dt class="font-semibold capitalize">{{ key }}</dt>
          <dd>{{ value }}</dd>
        </template>
      </dl>
    </div>
    <footer class="text-xs text-slate-500 flex justify-between items-center">
      <span>Operator: {{ event.operator.name }}</span>
      <span>{{ time }}</span>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CommandEvent } from '@/types/realtime'

const props = defineProps<{ event: CommandEvent }>()

const priorityTag = computed(() => {
  switch (props.event.priority) {
    case 'high':
      return 'danger'
    case 'medium':
      return 'warning'
    default:
      return 'success'
  }
})

const time = computed(() => new Date(props.event.timestamp).toLocaleTimeString())
</script>
