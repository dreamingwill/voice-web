import { useAsrStore } from '@/stores/useAsr'
import { useConnectionStore } from '@/stores/useConnection'
import { useEventsStore } from '@/stores/useEvents'
import { useSpeakerStore } from '@/stores/useSpeaker'
import type {
  StructuredEvent,
  SpeakerState,
  WsInboundMessage,
  PartialTranscriptMessage,
  FinalTranscriptMessage,
  SimilarityCandidate,
} from '@/types/realtime'

interface WSServiceOptions {
  url: string
  heartbeatInterval?: number
  reconnectDelay?: number
  maxReconnectDelay?: number
}

type Listener<T> = (payload: T) => void

type WsReadyState = 'idle' | 'connecting' | 'open' | 'closing' | 'closed'

interface ConnectOptions {
  token?: string
  operator?: {
    id?: number
    name?: string
    username?: string
  }
  locale?: string
}

const DEFAULT_OPTIONS: Required<Pick<WSServiceOptions, 'heartbeatInterval' | 'reconnectDelay' | 'maxReconnectDelay'>> = {
  heartbeatInterval: 20_000,
  reconnectDelay: 2_000,
  maxReconnectDelay: 20_000,
}

export class WSService {
  private readonly url: string
  private readonly heartbeatInterval: number
  private reconnectDelay: number
  private readonly maxReconnectDelay: number

  private socket: WebSocket | null = null
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private lastPingAt = 0

  private readyState: WsReadyState = 'idle'
  private shouldReconnect = false
  private manualClose = false
  private sessionId: string | null = null
  private token: string | null = null
  private operatorInfo: ConnectOptions['operator'] = null
  private locale: string | null = null

  private readonly partialListeners = new Set<Listener<PartialTranscriptMessage>>()
  private readonly finalListeners = new Set<Listener<FinalTranscriptMessage>>()
  private readonly speakerListeners = new Set<Listener<SpeakerState>>()
  private readonly eventListeners = new Set<Listener<StructuredEvent>>()
  private readonly metaListeners = new Set<Listener<Record<string, unknown>>>()
  private readonly errorListeners = new Set<Listener<string>>()
  private readonly openListeners = new Set<Listener<void>>()
  private readonly closeListeners = new Set<Listener<{ code: number; reason: string }>>()

  constructor(options: WSServiceOptions) {
    this.url = options.url
    this.heartbeatInterval = options.heartbeatInterval ?? DEFAULT_OPTIONS.heartbeatInterval
    this.reconnectDelay = options.reconnectDelay ?? DEFAULT_OPTIONS.reconnectDelay
    this.maxReconnectDelay = options.maxReconnectDelay ?? DEFAULT_OPTIONS.maxReconnectDelay
  }

  get state() {
    return this.readyState
  }

  connect(sessionId: string, options?: ConnectOptions) {
    if (this.readyState === 'connecting' || this.readyState === 'open') {
      return
    }

    this.sessionId = sessionId
    this.token = options?.token ?? null
    this.operatorInfo = options?.operator ?? null
    this.locale = options?.locale ?? null
    this.readyState = 'connecting'
    this.manualClose = false
    this.shouldReconnect = true

    try {
      this.socket = new WebSocket(this.url)
    } catch (error) {
      this.handleError('无法创建 WebSocket 连接', error)
      this.scheduleReconnect()
      return
    }

    this.socket.binaryType = 'arraybuffer'

    this.socket.onopen = () => {
      this.readyState = 'open'
      this.reconnectDelay = DEFAULT_OPTIONS.reconnectDelay
      this.flushOpen()
      this.startHeartbeat()
      if (this.sessionId) {
        this.sendJson({
          type: 'audio.start',
          data: {
            sampleRate: 16000,
            format: 'PCM16',
            channels: 1,
            sessionId: this.sessionId,
            token: this.token ?? undefined,
            operator: this.operatorInfo ?? undefined,
            locale: this.locale ?? 'zh-CN',
          },
        })
      }
    }

    this.socket.onmessage = (event) => {
      this.handleMessage(event.data)
    }

    this.socket.onerror = (event) => {
      this.handleError('WebSocket 发生错误', event)
    }

    this.socket.onclose = (event) => {
      this.cleanupHeartbeat()
      this.readyState = 'closed'
      this.flushClose(event.code, event.reason)
      if (!this.manualClose && this.shouldReconnect) {
        this.scheduleReconnect()
      }
    }
  }

  disconnect() {
    this.shouldReconnect = false
    this.manualClose = true
    this.cleanupHeartbeat()
    if (this.socket && (this.readyState === 'connecting' || this.readyState === 'open')) {
      this.readyState = 'closing'
      this.socket.close(1000, 'Client closed connection')
    }
    this.socket = null
  }

  sendJson(payload: Record<string, unknown>) {
    if (this.socket && this.readyState === 'open') {
      this.socket.send(JSON.stringify(payload))
    }
  }

  sendText(text: string) {
    if (this.socket && this.readyState === 'open') {
      this.socket.send(text)
    }
  }

  sendBinary(buffer: ArrayBufferLike) {
    if (this.socket && this.readyState === 'open') {
      this.socket.send(buffer)
    }
  }

  onPartial(listener: Listener<PartialTranscriptMessage>) {
    this.partialListeners.add(listener)
    return () => this.partialListeners.delete(listener)
  }

  onFinal(listener: Listener<FinalTranscriptMessage>) {
    this.finalListeners.add(listener)
    return () => this.finalListeners.delete(listener)
  }

  onSpeaker(listener: Listener<SpeakerState>) {
    this.speakerListeners.add(listener)
    return () => this.speakerListeners.delete(listener)
  }

  onEvent(listener: Listener<StructuredEvent>) {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  onMeta(listener: Listener<Record<string, unknown>>) {
    this.metaListeners.add(listener)
    return () => this.metaListeners.delete(listener)
  }

  onError(listener: Listener<string>) {
    this.errorListeners.add(listener)
    return () => this.errorListeners.delete(listener)
  }

  onOpen(listener: Listener<void>) {
    this.openListeners.add(listener)
    return () => this.openListeners.delete(listener)
  }

  onClose(listener: Listener<{ code: number; reason: string }>) {
    this.closeListeners.add(listener)
    return () => this.closeListeners.delete(listener)
  }

  private handleMessage(data: unknown) {
    if (typeof data === 'string') {
      this.parseJson(data)
      return
    }

    if (data instanceof ArrayBuffer) {
      this.handleBinary(data)
      return
    }

    console.warn('[wsService] Unknown message type', data)
  }

  private parseJson(raw: string) {
    let parsed: WsInboundMessage
    try {
      parsed = JSON.parse(raw)
    } catch (error) {
      this.handleError('无法解析服务端消息', error)
      return
    }

    switch (parsed.type) {
      case 'partial':
        this.partialListeners.forEach((listener) => listener(parsed))
        break
      case 'final': {
        const normalized: FinalTranscriptMessage = {
          ...parsed,
          topk: Array.isArray(parsed.topk)
            ? parsed.topk.map((item) => {
                if (typeof item === 'object' && item !== null && 'username' in item && 'similarity' in item) {
                  return {
                    username: String((item as SimilarityCandidate).username),
                    similarity: Number((item as SimilarityCandidate).similarity ?? 0),
                  }
                }
                if (Array.isArray(item)) {
                  const [username, similarity] = item
                  return {
                    username: typeof username === 'string' ? username : String(username),
                    similarity: Number(similarity ?? 0),
                  }
                }
                return undefined
              }).filter((entry): entry is SimilarityCandidate => Boolean(entry))
            : undefined,
        }
        this.finalListeners.forEach((listener) => listener(normalized))
        break
      }
      case 'speaker':
        if (parsed.data) {
          this.speakerListeners.forEach((listener) => listener(parsed.data))
        }
        break
      case 'event':
        if (parsed.data) {
          this.eventListeners.forEach((listener) => listener(parsed.data))
        }
        break
      case 'meta':
        if (parsed.data) {
          this.metaListeners.forEach((listener) => listener(parsed.data))
        }
        break
      case 'error':
        this.handleError(parsed.error ?? '服务器返回错误', parsed)
        break
      default:
        console.warn('[wsService] 未知消息类型', parsed)
    }
  }

  private handleBinary(buffer: ArrayBuffer) {
    console.debug('[wsService] 收到二进制消息，长度', buffer.byteLength)
  }

  private startHeartbeat() {
    this.cleanupHeartbeat()
    if (!this.heartbeatInterval || this.heartbeatInterval <= 0) return
    this.heartbeatTimer = setInterval(() => {
      if (Date.now() - this.lastPingAt > this.heartbeatInterval) {
        this.sendJson({ type: 'control.ping' })
        this.lastPingAt = Date.now()
      }
    }, this.heartbeatInterval)
  }

  private cleanupHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    this.lastPingAt = 0
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect || this.manualClose) {
      return
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    const delay = Math.min(this.reconnectDelay, this.maxReconnectDelay)
    this.reconnectTimer = setTimeout(() => {
      if (this.sessionId) {
        this.connect(this.sessionId, {
          token: this.token ?? undefined,
          operator: this.operatorInfo ?? undefined,
          locale: this.locale ?? undefined,
        })
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)
      }
    }, delay)
  }

  private flushOpen() {
    this.openListeners.forEach((listener) => listener())
  }

  private flushClose(code: number, reason: string) {
    this.closeListeners.forEach((listener) => listener({ code, reason }))
  }

  private handleError(message: string, detail?: unknown) {
    console.error('[wsService]', message, detail)
    this.errorListeners.forEach((listener) => listener(message))
  }
}

export function createWsService(url: string) {
  const service = new WSService({ url })
  const connectionStore = useConnectionStore()
  const asrStore = useAsrStore()
  const eventsStore = useEventsStore()
  const speakerStore = useSpeakerStore()

  service.onOpen(() => {
    connectionStore.setStatus('connected')
    connectionStore.setLatency(null)
  })

  service.onClose(({ code }) => {
    connectionStore.setStatus('disconnected')
    connectionStore.setLatency(null)
    if (code !== 1000) {
      connectionStore.setStatus('connecting')
    }
  })

  service.onError((message) => {
    console.error('[createWsService] error', message)
  })

  service.onPartial((message) => {
    asrStore.upsertSegment({
      segmentId: message.segment_id,
      text: message.text,
      speaker: message.speaker !== 'unknown' ? message.speaker : undefined,
      finalized: false,
      startMs: message.start_ms,
      timestamp: new Date().toISOString(),
    })
  })

  service.onFinal((message) => {
    asrStore.upsertSegment({
      segmentId: message.segment_id,
      text: message.text,
      speaker: message.speaker !== 'unknown' ? message.speaker : undefined,
      finalized: true,
      startMs: message.start_ms,
      endMs: message.end_ms,
      similarity: message.similarity,
      timestamp: new Date().toISOString(),
    })
  })
  service.onSpeaker((speaker) => {
    speakerStore.setSpeaker(speaker)
  })
  service.onEvent((event) => {
    eventsStore.pushEvent(event)
  })
  service.onMeta((meta) => {
    if (typeof meta.latency === 'number') {
      connectionStore.setLatency(meta.latency)
    }
  })

  return service
}
