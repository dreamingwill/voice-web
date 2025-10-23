<template>
  <section class="space-y-6">
    <AlertBanner
      v-if="eventsStore.hasUnauthorizedAlert"
      :event="eventsStore.latestUnauthorizedEvent"
      @acknowledge="eventsStore.acknowledgeUnauthorized"
    />

    <div
      class="bg-white rounded-lg shadow px-6 py-4 flex flex-wrap items-center justify-between gap-4"
    >
      <div class="flex items-center gap-2">
        <span class="text-xs tracking-wide text-slate-500">连接状态</span>
        <el-tag :type="connectionTag" effect="dark" size="small">{{ connectionLabel }}</el-tag>
      </div>
      <div class="flex items-center gap-3 text-sm text-slate-700">
        <span
          class="inline-flex items-center justify-center bg-primary/10 text-primary rounded-full h-10 w-10 text-base font-semibold"
        >
          {{ speakerInitials }}
        </span>
        <div>
          <p class="font-semibold">{{ speakerName }}</p>
          <p class="text-xs text-slate-500">角色：{{ speakerRole }}</p>
        </div>
      </div>
      <div class="text-right">
        <p class="text-xs tracking-wide text-slate-500">网络延迟</p>
        <p class="text-sm font-semibold text-slate-700">
          {{ latencyText }}
        </p>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <section class="lg:col-span-2 bg-white rounded-lg shadow p-4 flex flex-col gap-4">
        <header class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-primary">实时转写流</h2>
          <el-button size="small" @click="asrStore.clear">清空</el-button>
        </header>
        <div ref="transcriptContainer" class="max-h-80 overflow-y-auto pr-2 space-y-3">
          <article
            v-for="segment in transcripts"
            :key="segment.id"
            class="rounded-md border border-slate-200 px-3 py-2 bg-slate-50 text-left"
          >
            <header class="flex items-center justify-between text-xs text-slate-500">
              <span>{{ segment.speaker ?? '未知说话人' }}</span>
              <time>{{ formatTime(segment.timestamp) }}</time>
            </header>
            <p class="text-sm text-slate-800 mt-1">{{ segment.text }}</p>
          </article>
          <el-empty v-if="!transcripts.length" description="暂无转写数据" />
        </div>
      </section>

      <section class="bg-white rounded-lg shadow p-4 flex flex-col gap-4">
        <header class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-primary">结构化事件</h2>
          <el-button size="small" @click="eventsStore.clear">清空</el-button>
        </header>
        <div ref="eventsContainer" class="space-y-3 max-h-80 overflow-y-auto pr-2">
          <template v-for="event in events" :key="event.id">
            <CommandCard v-if="event.type === 'command'" :event="event" />
            <ReportCard v-else :event="event" />
          </template>
          <el-empty v-if="!events.length" description="暂无事件" />
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAsrStore } from '@/stores/useAsr'
import { useConnectionStore } from '@/stores/useConnection'
import { useEventsStore } from '@/stores/useEvents'
import { useSpeakerStore } from '@/stores/useSpeaker'
import { connectMockWs, disconnectMockWs } from '@/services/wsService'
import AlertBanner from '@/components/alerts/AlertBanner.vue'
import CommandCard from '@/components/cards/CommandCard.vue'
import ReportCard from '@/components/cards/ReportCard.vue'

const asrStore = useAsrStore()
const connectionStore = useConnectionStore()
const eventsStore = useEventsStore()
const speakerStore = useSpeakerStore()

const transcripts = computed(() => asrStore.transcripts)
const events = computed(() => eventsStore.events)

const connectionLabel = computed(() => {
  switch (connectionStore.status) {
    case 'connected':
      return '已连接'
    case 'connecting':
      return '连接中'
    default:
      return '未连接'
  }
})

const connectionTag = computed(() => {
  switch (connectionStore.status) {
    case 'connected':
      return 'success'
    case 'connecting':
      return 'warning'
    default:
      return 'danger'
  }
})

const speakerName = computed(
  () => speakerStore.current?.name ?? '等待识别说话人',
)
const speakerRole = computed(() => speakerStore.current?.role ?? '—')
const speakerInitials = computed(() => {
  const raw = (speakerStore.current?.name ?? '').replace(/\s+/g, '')
  if (!raw) return '—'
  return raw.slice(0, 2)
})
const latencyText = computed(() =>
  connectionStore.latencyMs !== null ? `${connectionStore.latencyMs} ms` : '暂不可用',
)

const transcriptContainer = ref<HTMLElement | null>(null)
const eventsContainer = ref<HTMLElement | null>(null)

onMounted(() => {
  connectMockWs()
})

onBeforeUnmount(() => {
  disconnectMockWs()
})

watch(
  () => transcripts.value.length,
  () => {
    nextTick(() => {
      if (transcriptContainer.value) {
        transcriptContainer.value.scrollTop = transcriptContainer.value.scrollHeight
      }
    })
  },
)

watch(
  () => events.value.length,
  () => {
    nextTick(() => {
      if (eventsContainer.value) {
        eventsContainer.value.scrollTop = 0
      }
    })
  },
)

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString()
}
</script>
