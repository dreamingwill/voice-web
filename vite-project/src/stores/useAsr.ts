import { defineStore } from 'pinia'
import type { TranscriptSegment } from '@/types/realtime'

interface AsrState {
  transcripts: TranscriptSegment[]
}

export const useAsrStore = defineStore('asr', {
  state: (): AsrState => ({
    transcripts: [],
  }),
  actions: {
    addTranscript(segment: TranscriptSegment) {
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
