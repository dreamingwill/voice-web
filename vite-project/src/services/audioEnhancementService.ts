import api from '@/services/apiService'
import type { AudioEnhancementOptionsResponse, NoiseModeOption, NoiseStrengthConfig, DereverbOption } from '@/types/audioEnhancement'

interface RawNoiseMode {
  id?: string
  label?: string
  description?: string
  recommended?: boolean
}

interface RawOptionsResponse {
  noiseModes?: RawNoiseMode[]
  noiseStrength?: Partial<NoiseStrengthConfig>
  dereverb?: Partial<DereverbOption> & { parameters?: Record<string, number> }
}

function normalizeNoiseModes(items?: RawNoiseMode[]): NoiseModeOption[] {
  if (!Array.isArray(items)) return []
  return items
    .map((item, index) => ({
      id: item.id ?? `mode-${index}`,
      label: item.label ?? item.id ?? `Mode #${index + 1}`,
      description: item.description,
      recommended: Boolean(item.recommended),
    }))
    .filter((item) => Boolean(item.id))
}

function normalizeNoiseStrength(config?: Partial<NoiseStrengthConfig>): NoiseStrengthConfig {
  const min = typeof config?.min === 'number' ? config?.min : 0.5
  const max = typeof config?.max === 'number' ? config?.max : 5
  const defaultValue = typeof config?.default === 'number' ? config?.default : 1
  const clampedDefault = Math.min(Math.max(defaultValue, min), max)
  return {
    min,
    max,
    default: clampedDefault,
    step: typeof config?.step === 'number' ? config.step : 0.1,
  }
}

function normalizeDereverb(config?: Partial<DereverbOption> & { parameters?: Record<string, number> }): DereverbOption | undefined {
  if (!config) return undefined
  return {
    label: config.label ?? '启用 Dereverb',
    description: config.description,
    defaultEnabled: Boolean(config.defaultEnabled),
    parameters: config.parameters,
  }
}

export async function fetchAudioEnhancementOptions(): Promise<AudioEnhancementOptionsResponse> {
  const response = await api.get<RawOptionsResponse>('api/audio/enhancement/options')
  const noiseModes = normalizeNoiseModes(response.data.noiseModes)
  const noiseStrength = normalizeNoiseStrength(response.data.noiseStrength ?? {})
  const dereverb = normalizeDereverb(response.data.dereverb)
  return {
    noiseModes,
    noiseStrength,
    dereverb,
  }
}
