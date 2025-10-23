import { defineStore } from 'pinia'
import type { ConnectionStatus } from '@/types/realtime'

interface ConnectionState {
  status: ConnectionStatus
  latencyMs: number | null
  sessionId: string | null
  recognitionEnabled: boolean
}

export const useConnectionStore = defineStore('connection', {
  state: (): ConnectionState => ({
    status: 'disconnected',
    latencyMs: null,
    sessionId: null,
    recognitionEnabled: true,
  }),
  getters: {
    isConnected: (state) => state.status === 'connected',
  },
  actions: {
    setStatus(status: ConnectionStatus) {
      this.status = status
    },
    setLatency(latency: number | null) {
      this.latencyMs = latency
    },
    setSession(sessionId: string | null) {
      this.sessionId = sessionId
    },
    setRecognitionEnabled(enabled: boolean) {
      this.recognitionEnabled = enabled
    },
    reset() {
      this.status = 'disconnected'
      this.latencyMs = null
      this.sessionId = null
    },
  },
})
