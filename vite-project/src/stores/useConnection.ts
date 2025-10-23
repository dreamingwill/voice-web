import { defineStore } from 'pinia'
import type { ConnectionStatus } from '@/types/realtime'

interface ConnectionState {
  status: ConnectionStatus
  latencyMs: number | null
  sessionId: string | null
}

export const useConnectionStore = defineStore('connection', {
  state: (): ConnectionState => ({
    status: 'disconnected',
    latencyMs: null,
    sessionId: null,
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
    reset() {
      this.status = 'disconnected'
      this.latencyMs = null
      this.sessionId = null
    },
  },
})
