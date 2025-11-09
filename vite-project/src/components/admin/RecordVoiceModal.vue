<template>
  <el-dialog
    :model-value="visible"
    width="520px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @close="handleClose"
  >
    <template #header>
      <div class="font-semibold text-base">
        声纹登记 - {{ operator?.username ?? '未知操作员' }}
      </div>
    </template>

    <section class="space-y-4">
      <p class="text-sm text-slate-600 leading-relaxed">
        请录制三段 3 秒左右的语音样本，保持环境安静。录制成功后将自动转换为音频文件并上传至声纹库。
        <div class="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded p-3 space-y-1">
          <p class="font-medium text-slate-700">可参考以下示例句式：</p>
          <ul class="list-disc pl-5 space-y-1">
            <li>“你好，我的名字是某某。”</li>
            <li>“今天的天气真不错，适合外出散步。”</li>
            <li>“请给我播放一首轻松的音乐。”</li>
          </ul>
        </div>
      </p>

      <el-alert
        v-if="errorMessage"
        type="error"
        :closable="false"
        show-icon
        :description="errorMessage"
      />

      <div class="flex items-center gap-3">
        <el-button
          type="primary"
          :loading="isProcessing"
          :disabled="
            isProcessing ||
            completedSamples.length >= TOTAL_SAMPLES ||
            countdownSeconds > 0 ||
            isRecording
          "
          @click="startRecording"
        >
          {{
            countdownSeconds > 0
              ? `准备录制（${countdownSeconds}）`
              : isRecording
                ? '录制中…'
                : '录制样本'
          }}
        </el-button>
        <el-button
          :disabled="!isRecording"
          @click="stopRecording"
        >
          停止
        </el-button>
        <span class="text-sm text-slate-500">
          样本进度：{{ completedSamples.length }} / {{ TOTAL_SAMPLES }}
        </span>
      </div>
      <div class="text-sm text-slate-500 min-h-[24px]">
        <template v-if="countdownSeconds > 0">
          即将在 {{ countdownSeconds }} 秒后开始录制，请做好准备…
        </template>
        <template v-else-if="isRecording">
          <div class="flex items-center gap-3">
            <span>录制中，剩余 {{ recordingTimeLeft.toFixed(1) }} 秒</span>
            <el-progress
              class="w-40"
              :percentage="recordingProgress"
              :stroke-width="6"
              :show-text="false"
              status="success"
            />
          </div>
        </template>
      </div>

      <div class="space-y-3">
        <div
          v-for="sample in completedSamples"
          :key="sample.index"
          class="p-3 rounded border border-slate-200 bg-slate-50 space-y-2"
        >
          <header class="flex items-center justify-between text-sm">
            <span class="font-medium text-slate-700">样本 {{ sample.index + 1 }}</span>
            <el-button
              type="primary"
              text
              @click="playSample(sample)"
            >
              播放
            </el-button>
          </header>
          <div class="h-16 bg-white border border-slate-200 rounded overflow-hidden">
            <canvas
              ref="waveformCanvas"
              class="w-full h-full"
              :data-index="sample.index"
            />
          </div>
          <p class="text-xs text-slate-500">
            {{ sample.duration.toFixed(2) }} 秒 · WAV · {{ formatSize(sample.blob.size) }}
          </p>
        </div>
        <el-empty
          v-if="!completedSamples.length"
          description="尚未录制任何样本"
          :image-size="120"
        />
      </div>
    </section>

    <template #footer>
      <div class="flex items-center justify-between">
        <span class="text-xs text-slate-400">
          若需要重新录制，可关闭对话框后再次进入。
        </span>
        <div class="flex gap-2">
          <el-button @click="handleClose">取消</el-button>
          <el-button
            type="primary"
            :loading="isUploading"
            :disabled="completedSamples.length !== TOTAL_SAMPLES"
            @click="submitSamples"
          >
            上传声纹
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/services/apiService'

interface Props {
  visible: boolean
  operator: {
    id: number
    username: string
    identity?: string | null
  } | null
}

interface RecordedSample {
  index: number
  blob: Blob
  url: string
  waveform: number[]
  duration: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (event: 'close'): void
  (event: 'completed'): void
}>()

const TOTAL_SAMPLES = 3
const COUNTDOWN_SECONDS = 3
const RECORDING_TARGET_MS = 3_000
const RECORDING_AUTO_STOP_MS = 3_200

const audioStream = ref<MediaStream | null>(null)
const mediaRecorder = ref<MediaRecorder | null>(null)
const isRecording = ref(false)
const isProcessing = ref(false)
const isUploading = ref(false)
const errorMessage = ref<string | null>(null)
const completedSamples = ref<RecordedSample[]>([])
const recordedChunks = ref<Blob[]>([])
const countdownSeconds = ref(0)
const recordingProgress = ref(0)
const recordingTimeLeft = ref(0)

let countdownTimer: ReturnType<typeof setInterval> | null = null
let recordingTimer: ReturnType<typeof setInterval> | null = null
let autoStopTimer: ReturnType<typeof setTimeout> | null = null
let recordingStartTime = 0

watch(
  () => props.visible,
  async (visible) => {
    if (visible) {
      errorMessage.value = null
      await ensureStream()
      drawWaveforms()
    } else {
      cleanupRecorder()
      clearSamples()
    }
  },
)

onBeforeUnmount(() => {
  cleanupRecorder()
  clearSamples()
})

function clearSamples() {
  completedSamples.value.forEach((sample) => URL.revokeObjectURL(sample.url))
  completedSamples.value = []
}

function clearCountdownTimer() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  countdownSeconds.value = 0
}

function clearRecordingTimers() {
  if (recordingTimer) {
    clearInterval(recordingTimer)
    recordingTimer = null
  }
  if (autoStopTimer) {
    clearTimeout(autoStopTimer)
    autoStopTimer = null
  }
  recordingProgress.value = 0
  recordingTimeLeft.value = 0
  recordingStartTime = 0
}

async function ensureStream() {
  if (audioStream.value) return
  try {
    audioStream.value = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16_000,
        noiseSuppression: true,
      },
      video: false,
    })
  } catch (error) {
    errorMessage.value = '无法访问麦克风，请检查浏览器权限。'
  }
}

async function startRecording() {
  if (
    isRecording.value ||
    countdownSeconds.value > 0 ||
    isProcessing.value ||
    completedSamples.value.length >= TOTAL_SAMPLES
  ) {
    return
  }

  if (!audioStream.value) {
    await ensureStream()
  }

  if (!audioStream.value) {
    return
  }

  clearCountdownTimer()
  countdownSeconds.value = COUNTDOWN_SECONDS
  countdownTimer = window.setInterval(() => {
    countdownSeconds.value -= 1
    if (countdownSeconds.value <= 0) {
      clearCountdownTimer()
      beginRecording()
    }
  }, 1_000)
}

function beginRecording() {
  if (!audioStream.value) {
    return
  }

  recordedChunks.value = []
  const mimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/wav',
  ]
  const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''

  try {
    mediaRecorder.value = new MediaRecorder(audioStream.value, {
      mimeType: mimeType || undefined,
      audioBitsPerSecond: 128_000,
    })
  } catch (error) {
    errorMessage.value = '浏览器不支持 MediaRecorder。'
    return
  }

  recordedChunks.value = []
  mediaRecorder.value.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.value.push(event.data)
    }
  }
  mediaRecorder.value.onstop = handleRecordingStop
  mediaRecorder.value.start()
  isRecording.value = true
  errorMessage.value = null
  recordingProgress.value = 0
  recordingTimeLeft.value = RECORDING_TARGET_MS / 1_000
  recordingStartTime = performance.now()
  recordingTimer = window.setInterval(() => {
    const elapsed = performance.now() - recordingStartTime
    recordingProgress.value = Math.min(100, (elapsed / RECORDING_TARGET_MS) * 100)
    recordingTimeLeft.value = Math.max(0, (RECORDING_TARGET_MS - elapsed) / 1_000)
    if (elapsed >= RECORDING_TARGET_MS && recordingTimer) {
      clearInterval(recordingTimer)
      recordingTimer = null
      recordingProgress.value = 100
    }
  }, 100)

  autoStopTimer = window.setTimeout(() => {
    if (isRecording.value) {
      stopRecording()
    }
  }, RECORDING_AUTO_STOP_MS)
}

function stopRecording() {
  clearCountdownTimer()
  clearRecordingTimers()
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop()
  }
  isRecording.value = false
}

async function handleRecordingStop() {
  isRecording.value = false
  clearRecordingTimers()
  if (!recordedChunks.value.length) return

  isProcessing.value = true
  try {
    const firstChunk = recordedChunks.value[0]
    const blob = new Blob(recordedChunks.value, { type: firstChunk?.type ?? 'audio/webm' })
    const wavBlob = await convertToWav(blob)
    const waveform = await extractWaveform(wavBlob)
    const duration = await measureDuration(wavBlob)
    const sample: RecordedSample = {
      index: completedSamples.value.length,
      blob: wavBlob,
      url: URL.createObjectURL(wavBlob),
      waveform,
      duration,
    }
    completedSamples.value.push(sample)
    await nextTick()
    drawWaveforms()
    ElMessage({
      type: 'success',
      message: `样本 ${sample.index + 1} 录制完成`,
      showClose: true,
    })
  } catch (error) {
    console.error('[RecordVoiceModal] process error', error)
    errorMessage.value = '处理录音时出现问题，请重试。'
  } finally {
    isProcessing.value = false
  }
}

function cleanupRecorder() {
  clearCountdownTimer()
  clearRecordingTimers()
  if (mediaRecorder.value) {
    if (mediaRecorder.value.state !== 'inactive') {
      mediaRecorder.value.stop()
    }
    mediaRecorder.value.ondataavailable = null
    mediaRecorder.value.onstop = null
    mediaRecorder.value = null
  }
  if (audioStream.value) {
    audioStream.value.getTracks().forEach((track) => track.stop())
    audioStream.value = null
  }
  isRecording.value = false
}

async function convertToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer()
  const audioContext = new AudioContext()
  const decoded = await audioContext.decodeAudioData(arrayBuffer)
  const offlineContext = new OfflineAudioContext(1, decoded.duration * 16_000, 16_000)
  const bufferSource = offlineContext.createBufferSource()
  bufferSource.buffer = decoded
  bufferSource.connect(offlineContext.destination)
  bufferSource.start()
  const renderedBuffer = await offlineContext.startRendering()
  audioContext.close()

  const wavBuffer = encodeWav(renderedBuffer.getChannelData(0), 16_000)
  return new Blob([wavBuffer], { type: 'audio/wav' })
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, samples.length * 2, true)
  floatTo16BitPCM(view, 44, samples)
  return buffer
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i += 1) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i += 1, offset += 2) {
    const value = input[i] ?? 0
    const s = Math.max(-1, Math.min(1, value))
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
}

async function extractWaveform(blob: Blob): Promise<number[]> {
  const arrayBuffer = await blob.arrayBuffer()
  const audioContext = new AudioContext()
  const decoded = await audioContext.decodeAudioData(arrayBuffer)
  const data = decoded.getChannelData(0)
  const width = 120
  const samples = new Array<number>(width).fill(0)
  const blockSize = Math.max(1, Math.floor(data.length / width))
  for (let i = 0; i < width; i += 1) {
    const blockStart = i * blockSize
    let sum = 0
    for (let j = 0; j < blockSize; j += 1) {
      const sample = data[blockStart + j] ?? 0
      sum += Math.abs(sample)
    }
    samples[i] = sum / blockSize
  }
  audioContext.close()
  return samples
}

async function measureDuration(blob: Blob): Promise<number> {
  const audioContext = new AudioContext()
  const decoded = await audioContext.decodeAudioData(await blob.arrayBuffer())
  const duration = decoded.duration
  audioContext.close()
  return duration
}

function drawWaveforms() {
  const canvasList = document.querySelectorAll<HTMLCanvasElement>('canvas[data-index]')
  canvasList.forEach((canvas) => {
    const index = Number(canvas.dataset.index)
    const sample = completedSamples.value.find((item) => item.index === index)
    if (!sample) return
    const context = canvas.getContext('2d')
    if (!context) return
    const { width, height } = canvas.getBoundingClientRect()
    canvas.width = width
    canvas.height = height
    context.clearRect(0, 0, width, height)
    context.fillStyle = '#0f766e'
    const barWidth = Math.max(1, width / sample.waveform.length)
    for (let i = 0; i < sample.waveform.length; i += 1) {
      const value = sample.waveform[i] ?? 0
      const scaled = value * height
      context.fillRect(i * barWidth, (height - scaled) / 2, barWidth * 0.9, scaled)
    }
  })
}

function playSample(sample: RecordedSample) {
  const audio = new Audio(sample.url)
  void audio.play()
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

async function submitSamples() {
  if (!props.operator) return
  isUploading.value = true
  try {
    const formData = new FormData()
    completedSamples.value.forEach((sample, index) => {
      formData.append('files', sample.blob, `sample-${index + 1}.wav`)
    })
    await api.post(`/users/${props.operator.id}/voiceprint/aggregate`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    ElMessage({
      type: 'success',
      message: '声纹登记成功',
      showClose: true,
    })
    emit('completed')
    handleClose()
  } catch (error) {
    console.error('[RecordVoiceModal] upload error', error)
    errorMessage.value = '上传声纹失败，请稍后再试。'
  } finally {
    isUploading.value = false
  }
}

function handleClose() {
  cleanupRecorder()
  emit('close')
}
</script>
