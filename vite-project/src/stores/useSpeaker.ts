import { defineStore } from 'pinia'
import type { SpeakerState } from '@/types/realtime'

interface SpeakerStoreState {
  current: SpeakerState | null
}

export const useSpeakerStore = defineStore('speaker', {
  state: (): SpeakerStoreState => ({
    current: null,
  }),
  actions: {
    setSpeaker(speaker: SpeakerState | null) {
      this.current = speaker
    },
    reset() {
      this.current = null
    },
  },
})
