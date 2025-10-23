export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

export type WsInboundMessage =
  | { type: 'transcript'; data: TranscriptSegment }
  | { type: 'speaker'; data: SpeakerState }
  | { type: 'event'; data: StructuredEvent }
  | { type: 'meta'; data: Record<string, unknown> }
  | { type: 'error'; error: string; code?: string | number }

export type WsOutboundMessage =
  | {
      type: 'audio.start'
      data: { sampleRate: number; format: 'PCM16'; channels: 1; sessionId: string }
    }
  | { type: 'audio.stop' }
  | { type: 'control.ping' }
  | { type: 'control.pong' }
  | { type: 'meta'; data: Record<string, unknown> }

export interface TranscriptSegment {
  id: string
  text: string
  timestamp: string
  speaker?: string
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
