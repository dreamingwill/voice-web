import { defineStore } from 'pinia'
import { ref } from 'vue'
import { audioService } from '@/services/audioService'
import { notifyAudioStopped } from '@/services/realtimeClient'

export const useAudioStore = defineStore('audio', () => {
  const isRecording = ref(false)
  const isMuted = ref(false)
  const level = ref(0)
  const error = ref<string | null>(null)

  let unsubscribeLevel: (() => void) | null = null
  let unsubscribeFrame: (() => void) | null = null

  const ensureSubscriptions = () => {
    if (!unsubscribeLevel) {
      unsubscribeLevel = audioService.onLevel((value) => {
        level.value = Number.isFinite(value) ? value : 0
      })
    }
    if (!unsubscribeFrame) {
      unsubscribeFrame = audioService.onFrame(() => {
        // Reserved for future backend streaming integration.
      })
    }
  }

  const disposeSubscriptions = () => {
    if (unsubscribeLevel) {
      unsubscribeLevel()
      unsubscribeLevel = null
    }
    if (unsubscribeFrame) {
      unsubscribeFrame()
      unsubscribeFrame = null
    }
  }

  const start = async () => {
    error.value = null
    ensureSubscriptions()
    const success = await audioService.start()
    if (!success) {
      error.value = '无法启动麦克风，请检查设备权限。'
      disposeSubscriptions()
      return false
    }
    isRecording.value = true
    isMuted.value = audioService.isMuted
    return true
  }

  const stop = async () => {
    const wasRecording = isRecording.value
    await audioService.stop()
    if (wasRecording) {
      notifyAudioStopped()
    }
    disposeSubscriptions()
    isRecording.value = false
    isMuted.value = audioService.isMuted
    level.value = 0
  }

  const toggleMute = async () => {
    const next = !isMuted.value
    audioService.setMuted(next)
    isMuted.value = next
    if (next) {
      level.value = 0
    }
  }

  return {
    isRecording,
    isMuted,
    level,
    error,
    start,
    stop,
    toggleMute,
  }
})
