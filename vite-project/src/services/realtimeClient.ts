import { audioService } from '@/services/audioService'
import { createWsService } from '@/services/wsService'
import { useConnectionStore } from '@/stores/useConnection'
import { useUserStore } from '@/stores/useUser'

let wsInstance: ReturnType<typeof createWsService> | null = null
let frameUnsubscribe: (() => void) | null = null

function ensureWsInstance() {
  if (!wsInstance) {
    const url = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/ws/asr'
    wsInstance = createWsService(url)
  }
  return wsInstance
}

function makeSessionId() {
  return `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function bufferFromFrame(frame: Int16Array): ArrayBuffer {
  return frame.buffer.slice(frame.byteOffset, frame.byteOffset + frame.byteLength)
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
    ws.sendText('DONE')
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
    ws.sendText('DONE')
  }
}
