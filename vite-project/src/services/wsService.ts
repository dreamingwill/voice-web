import { useAsrStore } from '@/stores/useAsr'
import { useConnectionStore } from '@/stores/useConnection'
import { useEventsStore } from '@/stores/useEvents'
import { useSpeakerStore } from '@/stores/useSpeaker'
import type { CommandEvent, ReportEvent, SpeakerState } from '@/types/realtime'

const transcriptSamples = [
  'System check complete, awaiting commands.',
  'Unit Bravo reporting all-clear on sector four.',
  'Initiating countdown sequence, T-minus ten seconds.',
  'Operator requesting confirmation on evacuation route.',
  'Telemetry indicates rising pressure, recommend caution.',
  'Standing by for next directive.',
]

const commandSamples: Array<Omit<CommandEvent, 'id' | 'timestamp'>> = [
  {
    type: 'command',
    command: 'countdown',
    params: { phase: 'launch', timer: 'T-10' },
    priority: 'high',
    authorized: true,
    operator: { name: '指挥员 张伟', role: 'Supervisor' },
  },
  {
    type: 'command',
    command: 'route_update',
    params: { destination: 'Sector Delta', status: 'reroute' },
    priority: 'medium',
    authorized: true,
    operator: { name: '调度员 李雷', role: 'Coordinator' },
  },
  {
    type: 'command',
    command: 'access_override',
    params: { door: 'Hangar Bay', level: '4' },
    priority: 'high',
    authorized: false,
    operator: { name: '未知人员', role: 'Unknown' },
  },
]

const reportSamples: Array<Omit<ReportEvent, 'id' | 'timestamp'>> = [
  {
    type: 'report',
    summary: 'Patrol squad returned with no incidents.',
    status: 'ok',
    authorized: true,
    operator: { name: '巡逻员 王芳', role: 'Field Unit' },
    note: 'Area perimeter secured.',
  },
  {
    type: 'report',
    summary: 'Thermal sensors detecting anomalies.',
    status: 'warning',
    authorized: true,
    operator: { name: '技术员 陈倩', role: 'Technician' },
    note: 'Recommend manual inspection.',
  },
  {
    type: 'report',
    summary: 'Unauthorized badge attempt recorded.',
    status: 'critical',
    authorized: false,
    operator: { name: '未知人员', role: 'Unknown' },
    note: 'Trigger security alert and lockout.',
  },
]

const speakerRoster: SpeakerState[] = [
  { id: 'spk-1', name: '指挥员 张伟', role: 'Supervisor', confidence: 0.97 },
  { id: 'spk-2', name: '操作员 李强', role: 'Operator', confidence: 0.92 },
  { id: 'spk-3', name: '巡逻员 王芳', role: 'Field Unit', confidence: 0.88 },
  { id: 'spk-4', name: '未知人员', role: 'Unknown', confidence: 0.41 },
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
    role: 'System',
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
