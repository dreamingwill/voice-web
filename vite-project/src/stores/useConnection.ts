import { defineStore } from 'pinia'
import type { ConnectionStatus } from '@/types/realtime'

const NETWORK_SAMPLE_LIMIT = 200

interface ConnectionState {
  status: ConnectionStatus
  latencyMs: number | null
  recognitionLatencyMs: number | null
  networkRttCurrentMs: number | null
  networkRttSamples: number[]
  sessionId: string | null
}

export const useConnectionStore = defineStore('connection', {
  state: (): ConnectionState => ({
    status: 'disconnected',
    latencyMs: null,
    recognitionLatencyMs: null,
    networkRttCurrentMs: null,
    networkRttSamples: [],
    sessionId: null,
  }),
  getters: {
    isConnected: (state) => state.status === 'connected',
    networkRttAverageMs: (state) =>
      state.networkRttSamples.length
        ? Number(
            (
              state.networkRttSamples.reduce((sum, value) => sum + value, 0) /
              state.networkRttSamples.length
            ).toFixed(1),
          )
        : null,
    networkRttP95Ms: (state) => {
      if (!state.networkRttSamples.length) return null
      const sorted = [...state.networkRttSamples].sort((a, b) => a - b)
      const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1)
      const p95 = sorted[index]
      return typeof p95 === 'number' ? Number(p95.toFixed(1)) : null
    },
    networkRttSampleCount: (state) => state.networkRttSamples.length,
  },
  actions: {
    setStatus(status: ConnectionStatus) {
      this.status = status
    },
    setLatency(latency: number | null) {
      this.latencyMs = latency
      this.recognitionLatencyMs = latency
    },
    setRecognitionLatency(latency: number | null) {
      this.recognitionLatencyMs = latency
      this.latencyMs = latency
    },
    pushNetworkRttSample(latency: number) {
      const normalized = Number(latency.toFixed(1))
      this.networkRttCurrentMs = normalized
      this.networkRttSamples.push(normalized)
      if (this.networkRttSamples.length > NETWORK_SAMPLE_LIMIT) {
        this.networkRttSamples = this.networkRttSamples.slice(-NETWORK_SAMPLE_LIMIT)
      }
    },
    clearNetworkRttSamples() {
      this.networkRttCurrentMs = null
      this.networkRttSamples = []
    },
    setSession(sessionId: string | null) {
      this.sessionId = sessionId
    },
    reset() {
      this.status = 'disconnected'
      this.latencyMs = null
      this.recognitionLatencyMs = null
      this.networkRttCurrentMs = null
      this.networkRttSamples = []
      this.sessionId = null
    },
  },
})
