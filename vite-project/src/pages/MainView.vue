<template>
  <section class="space-y-6">
    <AlertBanner
      v-if="eventsStore.hasUnauthorizedAlert"
      :event="eventsStore.latestUnauthorizedEvent"
      @acknowledge="eventsStore.acknowledgeUnauthorized"
    />
    <div class="grid gap-6 md:grid-cols-3 items-start">
      <section class="md:col-span-2 bg-white rounded-lg shadow p-4 flex flex-col gap-4 h-full">
        <header class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-primary">实时转写流</h2>
          <el-button size="small" @click="asrStore.clear">清空</el-button>
        </header>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-wrap gap-3">
            <el-button
              type="primary"
              size="large"
              :loading="isAudioLoading"
              @click="toggleRecording"
            >
              {{ audioStore.isRecording ? '停止采集' : '开始采集' }}
            </el-button>
            <el-button
              size="large"
              :disabled="!audioStore.isRecording"
              @click="toggleMute"
            >
              {{ audioStore.isMuted ? '取消静音' : '静音' }}
            </el-button>
          </div>
          <p class="text-sm text-slate-600">
            当前状态：{{ audioStatusText }}
          </p>
        </div>
        <div
          ref="transcriptContainer"
          :class="[
            'pr-2',
            transcripts.length
              ? 'h-48 sm:h-[20rem] overflow-y-auto space-y-3'
              : 'h-48 sm:h-[20rem] flex items-center justify-center text-slate-400'
          ]"
        >
          <template v-if="transcripts.length">
            <article
              v-for="segment in orderedTranscripts"
              :key="segment.id"
              class="rounded-md border border-slate-200 px-3 py-2 bg-slate-50 text-left"
            >
              <header class="flex items-start justify-between text-xs text-slate-500 gap-3">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-medium text-slate-700">{{ segment.speaker ?? '未知说话人' }}</p>
                  <time class="text-[11px] text-slate-500">{{ formatTime(segment.timestamp) }}</time>
                </div>
                <div
                  v-if="segment.commandMatch?.matched"
                  class="flex items-center gap-1 text-emerald-700 text-[11px] font-medium"
                >
                  <span class="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  <span class="truncate max-w-[140px]" :title="segment.commandMatch.command">
                    {{ segment.commandMatch.command }}
                  </span>
                  <span class="text-emerald-600" v-if="typeof segment.commandMatch.score === 'number'">
                    {{ formatScore(segment.commandMatch.score) }}
                  </span>
                </div>
              </header>
              <p
                class="text-sm mt-1"
                :class="segment.finalized ? 'text-slate-800' : 'text-slate-500 italic'"
              >
                {{ segment.text }}
              </p>
            </article>
          </template>
          <p v-else class="text-center text-sm text-slate-400">暂无转写数据</p>
        </div>
      </section>
      <div class="space-y-6 h-full">
        <CommandMatchCard class="h-full" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useAsrStore } from '@/stores/useAsr'
import { useConnectionStore } from '@/stores/useConnection'
import { useEventsStore } from '@/stores/useEvents'
import { useSpeakerStore } from '@/stores/useSpeaker'
import { useAudioStore } from '@/stores/useAudio'
import { startRealtimeStreaming, stopRealtimeStreaming } from '@/services/realtimeClient'
import AlertBanner from '@/components/alerts/AlertBanner.vue'
import CommandMatchCard from '@/components/cards/CommandMatchCard.vue'

const asrStore = useAsrStore()
const connectionStore = useConnectionStore()
const eventsStore = useEventsStore()
const speakerStore = useSpeakerStore()
const audioStore = useAudioStore()

const transcripts = computed(() => asrStore.transcripts)
const orderedTranscripts = computed(() => [...transcripts.value].reverse())
const transcriptContainer = ref<HTMLElement | null>(null)
const isAudioLoading = ref(false)
const audioStatusText = computed(() => {
  if (!audioStore.isRecording) {
    return '麦克风已停止'
  }
  if (audioStore.isMuted) {
    return '麦克风静音中'
  }
  return '采集中'
})

onBeforeUnmount(() => {
  void audioStore.stop()
  stopRealtimeStreaming(false)
  connectionStore.reset()
  speakerStore.reset()
})

watch(
  () => transcripts.value.length,
  () => {
    nextTick(() => {
      if (transcriptContainer.value) {
        transcriptContainer.value.scrollTop = 0
      }
    })
  },
)

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString()
}

function formatScore(score: number) {
  return `${(score * 100).toFixed(1)}%`
}

async function toggleRecording() {
  if (isAudioLoading.value) return
  isAudioLoading.value = true
  if (audioStore.isRecording) {
    await audioStore.stop()
    stopRealtimeStreaming(false)
    connectionStore.reset()
    speakerStore.reset()
    ElMessage({
      type: 'success',
      message: '已停止音频采集',
      showClose: true,
    })
  } else {
    connectionStore.setStatus('connecting')
    asrStore.clear()
    startRealtimeStreaming()
    const ok = await audioStore.start()
    if (!ok) {
      stopRealtimeStreaming(false)
      connectionStore.reset()
      speakerStore.reset()
      ElMessage({
        type: 'error',
        message: audioStore.error ?? '启动麦克风失败',
        showClose: true,
      })
    } else {
      ElMessage({
        type: 'success',
        message: '音频采集已开始',
        showClose: true,
      })
    }
  }
  isAudioLoading.value = false
}

async function toggleMute() {
  await audioStore.toggleMute()
  ElMessage({
    type: 'info',
    message: audioStore.isMuted ? '已静音麦克风' : '已恢复麦克风',
    showClose: true,
  })
}
</script>
