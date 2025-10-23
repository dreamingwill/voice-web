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
      <div class="flex items-center gap-2">
        <el-switch
          v-model="recognitionSwitch"
          active-text="识别开启"
          inactive-text="识别关闭"
        />
      </div>
    </div>

    <section class="bg-white rounded-lg shadow p-4 space-y-4">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-primary">麦克风采集控制</h2>
        <div class="flex items-center gap-3">
          <el-button
            type="primary"
            :loading="isAudioLoading"
            @click="toggleRecording"
          >
            {{ audioStore.isRecording ? '停止采集' : '开始采集' }}
          </el-button>
          <el-button
            :disabled="!audioStore.isRecording"
            @click="toggleMute"
          >
            {{ audioStore.isMuted ? '取消静音' : '静音' }}
          </el-button>
        </div>
      </header>
      <AudioLevel :level="audioStore.isMuted ? 0 : audioStore.level" />
      <p class="text-xs text-slate-500">
        当前状态：{{ audioStatusText }}
      </p>
    </section>

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
import { ElMessage } from 'element-plus'
import { useAsrStore } from '@/stores/useAsr'
import { useConnectionStore } from '@/stores/useConnection'
import { useEventsStore } from '@/stores/useEvents'
import { useSpeakerStore } from '@/stores/useSpeaker'
import { useAudioStore } from '@/stores/useAudio'
import { connectMockWs, disconnectMockWs } from '@/services/wsService'
import AlertBanner from '@/components/alerts/AlertBanner.vue'
import CommandCard from '@/components/cards/CommandCard.vue'
import ReportCard from '@/components/cards/ReportCard.vue'
import AudioLevel from '@/components/audio/AudioLevel.vue'

const asrStore = useAsrStore()
const connectionStore = useConnectionStore()
const eventsStore = useEventsStore()
const speakerStore = useSpeakerStore()
const audioStore = useAudioStore()

const transcripts = computed(() => asrStore.transcripts)
const events = computed(() => eventsStore.events)
const recognitionSwitch = computed({
  get: () => connectionStore.recognitionEnabled,
  set: (value: boolean) => {
    connectionStore.setRecognitionEnabled(value)
    if (value) {
      connectMockWs()
    } else {
      disconnectMockWs()
    }
  },
})

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
const isAudioLoading = ref(false)
const audioStatusText = computed(() => {
  if (!audioStore.isRecording) {
    return '麦克风已停止'
  }
  if (audioStore.isMuted) {
    return '麦克风静音中'
  }
  return '采集中，数据流将输出为 16kHz PCM'
})

onMounted(() => {
  if (connectionStore.recognitionEnabled) {
    connectMockWs()
  }
})

onBeforeUnmount(() => {
  disconnectMockWs()
  void audioStore.stop()
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

async function toggleRecording() {
  if (isAudioLoading.value) return
  isAudioLoading.value = true
  if (audioStore.isRecording) {
    await audioStore.stop()
    ElMessage.success('已停止音频采集')
  } else {
    const ok = await audioStore.start()
    if (!ok) {
      ElMessage.error(audioStore.error ?? '启动麦克风失败')
    } else {
      ElMessage.success('音频采集已开始')
    }
  }
  isAudioLoading.value = false
}

async function toggleMute() {
  await audioStore.toggleMute()
  ElMessage.info(audioStore.isMuted ? '已静音麦克风' : '已恢复麦克风')
}
</script>
