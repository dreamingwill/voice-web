import { useAsrStore } from '@/stores/useAsr'
import { useConnectionStore } from '@/stores/useConnection'
import { useEventsStore } from '@/stores/useEvents'
import { useSpeakerStore } from '@/stores/useSpeaker'
import type { CommandEvent, ReportEvent, TranscriptSegment, StructuredEvent, SpeakerState } from '@/types/realtime'

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

const DEFAULT_SPEAKER: SpeakerState = {
  id: 'spk-default',
  name: '系统默认',
  role: '系统监控',
  confidence: 1,
}

const getSpeakerByIndex = (index: number): SpeakerState => speakerRoster[index] ?? DEFAULT_SPEAKER

const getRandom = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)]!

const createTranscript = (speaker: SpeakerState): TranscriptSegment => ({
  id: `ts-${Math.random().toString(36).slice(2, 9)}`,
  text: getRandom(transcriptSamples),
  timestamp: new Date().toISOString(),
  speaker: speaker.name,
})

const createCommand = (base: Omit<CommandEvent, 'id' | 'timestamp'>): CommandEvent => ({
  ...base,
  id: `evt-${Math.random().toString(36).slice(2, 9)}`,
  timestamp: new Date().toISOString(),
})

const createReport = (base: Omit<ReportEvent, 'id' | 'timestamp'>): ReportEvent => ({
  ...base,
  id: `evt-${Math.random().toString(36).slice(2, 9)}`,
  timestamp: new Date().toISOString(),
})

let transcriptTimer: ReturnType<typeof setInterval> | null = null
let eventTimer: ReturnType<typeof setInterval> | null = null
let latencyTimer: ReturnType<typeof setInterval> | null = null
let activeSpeaker = 0

export function startRealtimeMock() {
  const connectionStore = useConnectionStore()
  const asrStore = useAsrStore()
  const eventsStore = useEventsStore()
  const speakerStore = useSpeakerStore()

  if (transcriptTimer || eventTimer) return

  connectionStore.setStatus('connected')
  connectionStore.setSession(`mock-${Math.random().toString(36).slice(2, 8)}`)
  connectionStore.setLatency(35 + Math.round(Math.random() * 10))

  const speaker = getSpeakerByIndex(activeSpeaker)
  speakerStore.setSpeaker(speaker)

  transcriptTimer = setInterval(() => {
    activeSpeaker = (activeSpeaker + 1) % speakerRoster.length
    const current = getSpeakerByIndex(activeSpeaker)
    speakerStore.setSpeaker(current)
    asrStore.addTranscript(createTranscript(current))
  }, 3500)

  eventTimer = setInterval(() => {
    const structured: StructuredEvent =
      Math.random() > 0.5
        ? createCommand(getRandom(commandSamples))
        : createReport(getRandom(reportSamples))
    eventsStore.pushEvent(structured)
    if (!structured.authorized) {
      connectionStore.setLatency(80 + Math.round(Math.random() * 40))
    }
  }, 9000)

  latencyTimer = setInterval(() => {
    connectionStore.setLatency(30 + Math.round(Math.random() * 20))
  }, 5000)
}

export function stopRealtimeMock() {
  if (transcriptTimer) {
    clearInterval(transcriptTimer)
    transcriptTimer = null
  }
  if (eventTimer) {
    clearInterval(eventTimer)
    eventTimer = null
  }
  if (latencyTimer) {
    clearInterval(latencyTimer)
    latencyTimer = null
  }
  const connectionStore = useConnectionStore()
  connectionStore.reset()
}
