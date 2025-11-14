import { audioService } from '@/services/audioService'
import { createWsService } from '@/services/wsService'
import { useConnectionStore } from '@/stores/useConnection'
import { useUserStore } from '@/stores/useUser'

let wsInstance: ReturnType<typeof createWsService> | null = null
let frameUnsubscribe: (() => void) | null = null

function ensureWsInstance() {
  if (!wsInstance) {
    const url =
      import.meta.env.VITE_WS_URL && import.meta.env.VITE_WS_URL.trim().length > 0
        ? import.meta.env.VITE_WS_URL.trim()
        : buildDefaultWsUrl()
    wsInstance = createWsService(url)
  }
  return wsInstance
}

function buildDefaultWsUrl() {
  if (typeof window === 'undefined') {
    return 'ws://localhost:8000/ws/asr'
  }
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.host}/ws/asr`
}

function makeSessionId() {
  return `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function bufferFromFrame(frame: Int16Array): ArrayBuffer {
  // Use slice() to materialize a standalone ArrayBuffer (avoids SharedArrayBuffer type issues)
  return frame.slice().buffer
}

export function startRealtimeStreaming() {
  const ws = ensureWsInstance()
  const connectionStore = useConnectionStore()
  const userStore = useUserStore()

  if (!connectionStore.sessionId) {
    connectionStore.setSession(makeSessionId())
  }

  ws.connect(connectionStore.sessionId!, {
    token: userStore.token ?? undefined,
    operator: userStore.user
      ? {
          id: userStore.user.id,
          name: userStore.user.display_name ?? userStore.user.username,
          username: userStore.user.username,
        }
      : undefined,
    locale: 'zh-CN',
  })

  if (!frameUnsubscribe) {
    frameUnsubscribe = audioService.onFrame((frame) => {
      if (!frame?.length) return
      const wsClient = wsInstance
      if (!wsClient || wsClient.state !== 'open') return
      const payload = bufferFromFrame(frame)
      wsClient.sendBinary(payload)
    })
  }
}

export function stopRealtimeStreaming(sendDone = false) {
  const ws = wsInstance
  if (sendDone && ws && ws.state === 'open') {
    ws.sendJson({ type: 'audio.stop' })
  }

  if (ws) {
    if (ws.state === 'open') {
      window.setTimeout(() => {
        ws.disconnect()
      }, 200)
    } else {
      ws.disconnect()
    }
  }

  if (frameUnsubscribe) {
    frameUnsubscribe()
    frameUnsubscribe = null
  }
}

export function notifyAudioStopped() {
  const ws = wsInstance
  if (ws && ws.state === 'open') {
    ws.sendJson({ type: 'audio.stop' })
  }
}
