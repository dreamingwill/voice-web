export interface NoiseModeOption {
  id: string
  label: string
  description?: string
  recommended?: boolean
}

export interface NoiseStrengthConfig {
  min: number
  max: number
  default: number
  step?: number
}

export interface DereverbParameters {
  delay?: number
  taps?: number
  iterations?: number
}

export interface DereverbOption {
  label: string
  description?: string
  defaultEnabled: boolean
  parameters?: DereverbParameters
}

export interface AudioEnhancementOptionsResponse {
  noiseModes: NoiseModeOption[]
  noiseStrength: NoiseStrengthConfig
  dereverb?: DereverbOption
}

export interface AudioEnhancementPayload {
  noiseMode: string
  noiseStrength: number
  enableDereverb: boolean
  dereverbDelay?: number
  dereverbTaps?: number
  dereverbIterations?: number
}

export interface SessionEnhancementState {
  noiseMode?: string
  noiseStrength?: number
  enableDereverb?: boolean
  dereverb?: DereverbParameters
}
