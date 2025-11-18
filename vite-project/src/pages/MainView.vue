<template>
  <section class="space-y-6">
    <AlertBanner
      v-if="eventsStore.hasUnauthorizedAlert"
      :event="eventsStore.latestUnauthorizedEvent"
      @acknowledge="eventsStore.acknowledgeUnauthorized"
    />
    <div class="grid gap-6 md:grid-cols-3 items-start">
      <section class="md:col-span-2 bg-white rounded-lg shadow p-4 flex flex-col gap-4 h-full">
        <header class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-primary">实时转写流</h2>
          <div class="flex items-center gap-3 text-sm text-slate-600">
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-800">说话人识别</span>
              <div class="flex items-center gap-1">
                <el-switch
                  :model-value="systemSettingsStore.enableSpeakerRecognition"
                  :loading="speakerToggleLoading"
                  :disabled="speakerToggleDisabled || audioStore.isRecording"
                  active-color="#16a34a"
                  @change="handleSpeakerToggle"
                />
                <el-tooltip
                  v-if="audioStore.isRecording"
                  content="采集中无法修改说话人识别，请停止采集后重试"
                  placement="bottom"
                >
                  <el-icon class="text-amber-500 text-xs"><Warning /></el-icon>
                </el-tooltip>
              </div>
            </div>
            <el-button size="small" @click="asrStore.clear">清空</el-button>
          </div>
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
          <p class="text-sm text-slate-600 space-y-0.5">
            <span class="block">当前状态：{{ audioStatusText }}</span>
            <span class="block text-xs text-slate-800">
              说话人识别：{{ speakerStatusSummary }}
            </span>
          </p>
        </div>
        <section class="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
          <header class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="text-sm font-semibold text-slate-800">音频增强</p>
              <!-- <p class="text-xs text-slate-500">每次握手时将所选配置同步给后端</p> -->
              <p v-if="enhancementControlsDisabled" class="text-[11px] text-amber-600">
                采集中不可修改，请停止采集后再次调整
              </p>
            </div>
            <p class="text-[11px] text-slate-500 sm:text-right">{{ enhancementStatusText }}</p>
          </header>
          <el-alert
            v-if="enhancementError"
            type="error"
            :title="enhancementError"
            :closable="false"
            show-icon
          />
          <div class="space-y-2">
            <p class="text-sm font-medium text-slate-700">降噪模式&强度设置</p>
            <div v-if="audioEnhancementStore.loading" class="text-xs text-slate-500">正在加载降噪模式...</div>
            <el-empty
              v-else-if="!noiseModeOptions.length"
              description="暂无可用降噪模式"
              :image-size="80"
            />
            <el-radio-group
              v-else
              v-model="selectedNoiseMode"
              class="flex flex-wrap gap-3"
              :disabled="enhancementControlsDisabled"
            >
              <el-radio
                v-for="mode in noiseModeOptions"
                :key="mode.id"
                :label="mode.id"
                class="items-start rounded-md border border-transparent bg-slate-50 px-3 py-2 text-left hover:border-slate-200 basis-[calc(50%-0.5rem)] sm:basis-auto"
              >
                <div class="flex flex-col text-left">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-slate-800">{{ mode.label }}</span>
                    <el-tag v-if="mode.recommended" size="small" type="success">推荐</el-tag>
                  </div>
                  <!-- <p v-if="mode.description" class="text-xs text-slate-500">{{ mode.description }}</p> -->
                </div>
              </el-radio>
            </el-radio-group>
          </div>
          <!-- <div class="space-y-2">
            <el-input-number
              v-model="selectedNoiseStrength"
              :min="noiseStrengthConfig.min"
              :max="noiseStrengthConfig.max"
              :step="noiseStrengthConfig.step ?? 0.1"
              :precision="1"
              :disabled="enhancementControlsDisabled"
            />
          </div> -->
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex-1">
              <p class="text-sm font-medium text-slate-700">
                {{ audioEnhancementStore.dereverbOption?.label ?? '启用 Dereverb（WPE）' }}
              </p>
              <p class="text-xs text-slate-500">
                {{
                  audioEnhancementStore.dereverbOption?.description ??
                  '在有混响的环境中执行 WPE 以提升语音清晰度'
                }}
              </p>
            </div>
            <el-switch v-model="dereverbEnabled" :disabled="enhancementControlsDisabled" />
          </div>
        </section>
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'
import { useAsrStore } from '@/stores/useAsr'
import { useConnectionStore } from '@/stores/useConnection'
import { useEventsStore } from '@/stores/useEvents'
import { useSpeakerStore } from '@/stores/useSpeaker'
import { useAudioStore } from '@/stores/useAudio'
import { useSystemSettingsStore } from '@/stores/useSystemSettings'
import { useAudioEnhancementStore } from '@/stores/useAudioEnhancement'
import { startRealtimeStreaming, stopRealtimeStreaming } from '@/services/realtimeClient'
import AlertBanner from '@/components/alerts/AlertBanner.vue'
import CommandMatchCard from '@/components/cards/CommandMatchCard.vue'

const asrStore = useAsrStore()
const connectionStore = useConnectionStore()
const eventsStore = useEventsStore()
const speakerStore = useSpeakerStore()
const audioStore = useAudioStore()
const systemSettingsStore = useSystemSettingsStore()
const audioEnhancementStore = useAudioEnhancementStore()

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
const speakerToggleLoading = computed(() => systemSettingsStore.loading || systemSettingsStore.updating)
const speakerToggleDisabled = computed(() => !systemSettingsStore.initialized || speakerToggleLoading.value)
const speakerStatusSummary = computed(() => {
  const globalEnabled = systemSettingsStore.enableSpeakerRecognition
  const sessionState = systemSettingsStore.sessionSpeakerEnabled
  const globalText = globalEnabled ? '已开启（新建会话生效）' : '已关闭（新建会话生效）'
  if (sessionState == null) return `${globalText} · 当前会话状态未知`
  return `${globalText} · 当前会话${sessionState ? '已启用' : '已禁用'}`
})

const noiseModeOptions = computed(() => audioEnhancementStore.noiseModes)
const noiseStrengthConfig = computed(() => audioEnhancementStore.noiseStrengthConfig)
const selectedNoiseMode = computed({
  get: () => audioEnhancementStore.selectedNoiseMode,
  set: (value: string) => audioEnhancementStore.setNoiseMode(value),
})
const selectedNoiseStrength = computed({
  get: () => audioEnhancementStore.noiseStrength,
  set: (value: number) => audioEnhancementStore.setNoiseStrength(value),
})
const dereverbEnabled = computed({
  get: () => audioEnhancementStore.enableDereverb,
  set: (value: boolean) => audioEnhancementStore.setDereverb(value),
})
const enhancementStatusText = computed(() => {
  const session = audioEnhancementStore.sessionEnhancement
  if (!session) {
    return '当前会话尚未返回增强信息'
  }
  const noiseModeId = session.noiseMode ?? audioEnhancementStore.selectedNoiseMode
  const noiseModeLabel = noiseModeOptions.value.find((item) => item.id === noiseModeId)?.label ?? noiseModeId
  const strength =
    typeof session.noiseStrength === 'number' ? session.noiseStrength.toFixed(1) : selectedNoiseStrength.value.toFixed(1)
  const dereverbText =
    typeof session.enableDereverb === 'boolean'
      ? session.enableDereverb
        ? 'Dereverb 已启用'
        : 'Dereverb 未启用'
      : dereverbEnabled.value
        ? 'Dereverb 已启用'
        : 'Dereverb 未启用'
  return `当前会话：${noiseModeLabel} · 强度 ${strength} · ${dereverbText}`
})
const enhancementError = computed(() => audioEnhancementStore.error)
const enhancementControlsDisabled = computed(() => audioStore.isRecording)

onMounted(() => {
  void systemSettingsStore.loadSettings()
  void audioEnhancementStore.loadOptions()
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

async function handleSpeakerToggle(value: boolean) {
  await systemSettingsStore.toggleSpeakerRecognition(Boolean(value))
}
</script>
