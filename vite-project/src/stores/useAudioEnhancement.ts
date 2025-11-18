import { defineStore } from 'pinia'
import { fetchAudioEnhancementOptions } from '@/services/audioEnhancementService'
import type {
  AudioEnhancementOptionsResponse,
  AudioEnhancementPayload,
  SessionEnhancementState,
} from '@/types/audioEnhancement'

interface AudioEnhancementState {
  loading: boolean
  initialized: boolean
  error: string | null
  options: AudioEnhancementOptionsResponse | null
  selectedNoiseMode: string
  noiseStrength: number
  enableDereverb: boolean
  sessionEnhancement: SessionEnhancementState | null
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export const useAudioEnhancementStore = defineStore('audioEnhancement', {
  state: (): AudioEnhancementState => ({
    loading: false,
    initialized: false,
    error: null,
    options: null,
    selectedNoiseMode: 'none',
    noiseStrength: 1,
    enableDereverb: false,
    sessionEnhancement: null,
  }),
  getters: {
    noiseModes: (state) => state.options?.noiseModes ?? [],
    noiseStrengthConfig: (state) =>
      state.options?.noiseStrength ?? {
        min: 0.5,
        max: 5,
        default: 1,
        step: 0.1,
      },
    dereverbOption: (state) => state.options?.dereverb,
    enhancementPayload(state): AudioEnhancementPayload {
      const base: AudioEnhancementPayload = {
        noiseMode: state.selectedNoiseMode,
        noiseStrength: state.noiseStrength,
        enableDereverb: state.enableDereverb,
      }
      const params = state.options?.dereverb?.parameters
      if (params?.delay != null) {
        base.dereverbDelay = params.delay
      }
      if (params?.taps != null) {
        base.dereverbTaps = params.taps
      }
      if (params?.iterations != null) {
        base.dereverbIterations = params.iterations
      }
      return base
    },
  },
  actions: {
    async loadOptions(force = false) {
      if (this.loading || (this.initialized && !force)) return
      this.loading = true
      this.error = null
      try {
        const options = await fetchAudioEnhancementOptions()
        this.options = options
        const preferred =
          options.noiseModes.find((mode) => mode.id === 'none') ??
          options.noiseModes.find((mode) => mode.recommended) ??
          options.noiseModes[0]
        if (preferred?.id) {
          this.selectedNoiseMode = preferred.id
        }
        const strength = options.noiseStrength
        this.noiseStrength = clamp(strength.default, strength.min, strength.max)
        this.enableDereverb = Boolean(options.dereverb?.defaultEnabled)
        this.initialized = true
      } catch (error) {
        console.error('[useAudioEnhancementStore] loadOptions failed', error)
        this.error = '无法获取音频增强配置'
      } finally {
        this.loading = false
      }
    },
    setNoiseMode(modeId: string) {
      this.selectedNoiseMode = modeId
    },
    setNoiseStrength(value: number) {
      const { min, max } = this.noiseStrengthConfig
      this.noiseStrength = clamp(value, min, max)
    },
    setDereverb(enabled: boolean) {
      this.enableDereverb = enabled
    },
    setSessionEnhancement(session: SessionEnhancementState | null) {
      this.sessionEnhancement = session
      if (session?.noiseMode) {
        this.selectedNoiseMode = session.noiseMode
      }
      if (typeof session?.noiseStrength === 'number') {
        this.noiseStrength = session.noiseStrength
      }
      if (typeof session?.enableDereverb === 'boolean') {
        this.enableDereverb = session.enableDereverb
      }
    },
  },
})
