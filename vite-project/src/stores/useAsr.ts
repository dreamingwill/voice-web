import { defineStore } from 'pinia'
import type { TranscriptSegment } from '@/types/realtime'

interface AsrState {
  transcripts: TranscriptSegment[]
}

interface UpsertPayload {
  segmentId: number
  text: string
  speaker?: string
  finalized: boolean
  startMs?: number
  endMs?: number
  similarity?: number
  timestamp?: string
}

export const useAsrStore = defineStore('asr', {
  state: (): AsrState => ({
    transcripts: [],
  }),
  actions: {
    upsertSegment(payload: UpsertPayload) {
      const timestamp = payload.timestamp ?? new Date().toISOString()
      const existing = this.transcripts.find((item) => item.segmentId === payload.segmentId)

      if (existing) {
        existing.text = payload.text
        existing.speaker = payload.speaker
        existing.finalized = payload.finalized
        existing.startMs = payload.startMs ?? existing.startMs
        existing.endMs = payload.endMs ?? existing.endMs
        existing.similarity = payload.similarity ?? existing.similarity
        existing.timestamp = timestamp
        return
      }

      const segment: TranscriptSegment = {
        id: `segment-${payload.segmentId}`,
        segmentId: payload.segmentId,
        text: payload.text,
        timestamp,
        speaker: payload.speaker,
        finalized: payload.finalized,
        startMs: payload.startMs,
        endMs: payload.endMs,
        similarity: payload.similarity,
      }

      this.transcripts.push(segment)
      if (this.transcripts.length > 100) {
        this.transcripts.shift()
      }
    },
    clear() {
      this.transcripts = []
    },
  },
})
