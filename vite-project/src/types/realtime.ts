export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

export interface SimilarityCandidate {
  username: string
  similarity: number
}

export interface PartialTranscriptMessage {
  type: 'partial'
  segment_id: number
  text: string
  speaker: string
  start_ms: number
  time_ms: number
}

export interface FinalTranscriptMessage {
  type: 'final'
  segment_id: number
  text: string
  speaker: string
  start_ms: number
  end_ms: number
  similarity?: number
  topk?: SimilarityCandidate[]
}

export type WsInboundMessage =
  | PartialTranscriptMessage
  | FinalTranscriptMessage
  | { type: 'speaker'; data: SpeakerState }
  | { type: 'event'; data: StructuredEvent }
  | { type: 'meta'; data: Record<string, unknown> }
  | { type: 'error'; error: string; code?: string | number }

export interface AudioStartPayload {
  sampleRate: number
  format: 'PCM16'
  channels: 1
  sessionId: string
  token?: string
  operator?: {
    id?: number
    name?: string
    username?: string
  }
  locale?: string
}

export type WsOutboundMessage =
  | {
      type: 'audio.start'
      data: AudioStartPayload
    }
  | { type: 'audio.stop' }
  | { type: 'control.ping' }
  | { type: 'control.pong' }
  | { type: 'meta'; data: Record<string, unknown> }

export interface TranscriptSegment {
  id: string
  segmentId: number
  text: string
  timestamp: string
  speaker?: string
  finalized: boolean
  startMs?: number
  endMs?: number
  similarity?: number
}

export interface SpeakerState {
  id: string
  name: string
  role: string
  confidence: number
}

export interface OperatorInfo {
  name: string
  role: string
}

export type StructuredEventType = 'command' | 'report'

interface BaseStructuredEvent {
  id: string
  type: StructuredEventType
  authorized: boolean
  timestamp: string
  operator: OperatorInfo
  note?: string
}

export interface CommandEvent extends BaseStructuredEvent {
  type: 'command'
  command: string
  params: Record<string, string>
  priority: 'low' | 'medium' | 'high'
}

export interface ReportEvent extends BaseStructuredEvent {
  type: 'report'
  summary: string
  status: 'ok' | 'warning' | 'critical'
  details?: string
}

export type StructuredEvent = CommandEvent | ReportEvent
