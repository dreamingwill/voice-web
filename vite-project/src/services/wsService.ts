import { useAsrStore } from '@/stores/useAsr'
import { useConnectionStore } from '@/stores/useConnection'
import { useEventsStore } from '@/stores/useEvents'
import { useSpeakerStore } from '@/stores/useSpeaker'
import type { CommandEvent, ReportEvent, SpeakerState } from '@/types/realtime'

const transcriptSamples = [
  '系统自检完成，等待下一步指令。',
  'B 小队报告四号区域一切正常。',
  '开始倒计时，距离发射还有十秒。',
  '操作员请求确认撤离路线。',
  '遥测数据显示压力上升，请注意。',
  '保持待命，等待新的调度指令。',
]

const commandSamples: Array<Omit<CommandEvent, 'id' | 'timestamp'>> = [
  {
    type: 'command',
    command: '启动倒计时',
    params: { 阶段: '发射准备', 倒计时: 'T-10' },
    priority: 'high',
    authorized: true,
    operator: { name: '指挥员 张伟', role: '指挥员' },
  },
  {
    type: 'command',
    command: '更新行进路线',
    params: { 目标: '三角洲区', 状态: '重新规划' },
    priority: 'medium',
    authorized: true,
    operator: { name: '调度员 李雷', role: '调度员' },
  },
  {
    type: 'command',
    command: '尝试设施解锁',
    params: { 位置: '机库入口', 等级: '四级' },
    priority: 'high',
    authorized: false,
    operator: { name: '未知人员', role: '未知' },
  },
]

const reportSamples: Array<Omit<ReportEvent, 'id' | 'timestamp'>> = [
  {
    type: 'report',
    summary: '巡逻小队返回，未发现异常。',
    status: 'ok',
    authorized: true,
    operator: { name: '巡逻员 王芳', role: '巡逻员' },
    note: '外围警戒线已加固。',
  },
  {
    type: 'report',
    summary: '热成像传感器检测到异常信号。',
    status: 'warning',
    authorized: true,
    operator: { name: '技术员 陈倩', role: '技术员' },
    note: '建议派员进行现场复核。',
  },
  {
    type: 'report',
    summary: '记录到未授权工牌尝试。',
    status: 'critical',
    authorized: false,
    operator: { name: '未知人员', role: '未知' },
    note: '已触发安防告警并锁定受控区域。',
  },
]

const speakerRoster: SpeakerState[] = [
  { id: 'spk-1', name: '指挥员 张伟', role: '指挥员', confidence: 0.97 },
  { id: 'spk-2', name: '操作员 李强', role: '操作员', confidence: 0.92 },
  { id: 'spk-3', name: '巡逻员 王芳', role: '巡逻员', confidence: 0.88 },
  { id: 'spk-4', name: '未知人员', role: '未知', confidence: 0.41 },
]

const getRandom = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)]!

const createCommandEvent = (
  base: Omit<CommandEvent, 'id' | 'timestamp'>,
): CommandEvent => ({
  ...base,
  id: `evt-${Math.random().toString(36).slice(2, 9)}`,
  timestamp: new Date().toISOString(),
})

const createReportEvent = (base: Omit<ReportEvent, 'id' | 'timestamp'>): ReportEvent => ({
  ...base,
  id: `evt-${Math.random().toString(36).slice(2, 9)}`,
  timestamp: new Date().toISOString(),
})

const generateTranscript = (speaker: SpeakerState) => ({
  id: `ts-${Math.random().toString(36).slice(2, 9)}`,
  text: getRandom(transcriptSamples),
  timestamp: new Date().toISOString(),
  speaker: speaker.name,
})

let transcriptInterval: ReturnType<typeof setInterval> | null = null
let eventInterval: ReturnType<typeof setInterval> | null = null
let latencyInterval: ReturnType<typeof setInterval> | null = null
let activeSpeakerIndex = 0

export function connectMockWs() {
  const connectionStore = useConnectionStore()
  const asrStore = useAsrStore()
  const speakerStore = useSpeakerStore()
  const eventsStore = useEventsStore()
  const fallbackSpeaker: SpeakerState = speakerRoster[0] ?? {
    id: 'spk-fallback',
    name: '系统默认',
    role: '系统监控',
    confidence: 1,
  }
  const unknownSpeaker: SpeakerState =
    speakerRoster.find((speaker) => speaker.name === '未知人员') ?? fallbackSpeaker

  if (connectionStore.status === 'connected' || transcriptInterval) {
    return
  }

  connectionStore.setStatus('connecting')
  connectionStore.setSession(`session-${Math.random().toString(36).slice(2, 8)}`)

  setTimeout(() => {
    connectionStore.setStatus('connected')
    connectionStore.setLatency(32 + Math.round(Math.random() * 18))
  }, 600)

  const initialSpeaker = speakerRoster[activeSpeakerIndex] ?? fallbackSpeaker
  speakerStore.setSpeaker(initialSpeaker)

  transcriptInterval = setInterval(() => {
    activeSpeakerIndex = (activeSpeakerIndex + 1) % speakerRoster.length
    const currentSpeaker = speakerRoster[activeSpeakerIndex] ?? fallbackSpeaker
    speakerStore.setSpeaker(currentSpeaker)
    asrStore.addTranscript(generateTranscript(currentSpeaker))
  }, 3500)

  eventInterval = setInterval(() => {
    if (Math.random() > 0.5) {
      const event = createCommandEvent(getRandom(commandSamples))
      eventsStore.pushEvent(event)
      if (!event.authorized) {
        speakerStore.setSpeaker(unknownSpeaker)
      }
    } else {
      const event = createReportEvent(getRandom(reportSamples))
      eventsStore.pushEvent(event)
      if (!event.authorized) {
        speakerStore.setSpeaker(unknownSpeaker)
      }
    }
  }, 9000)

  latencyInterval = setInterval(() => {
    const jitter = Math.round(Math.random() * 40)
    connectionStore.setLatency(40 + jitter)
  }, 4000)
}

export function disconnectMockWs() {
  const connectionStore = useConnectionStore()
  const speakerStore = useSpeakerStore()

  if (transcriptInterval) {
    clearInterval(transcriptInterval)
    transcriptInterval = null
  }
  if (eventInterval) {
    clearInterval(eventInterval)
    eventInterval = null
  }
  if (latencyInterval) {
    clearInterval(latencyInterval)
    latencyInterval = null
  }

  connectionStore.reset()
  speakerStore.reset()
}
