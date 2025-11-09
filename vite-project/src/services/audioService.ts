type FrameListener = (frame: Int16Array) => void
type LevelListener = (level: number) => void

interface AudioServiceOptions {
  targetSampleRate?: number
  frameDurationMs?: number
}

const DEFAULT_OPTIONS: Required<AudioServiceOptions> = {
  targetSampleRate: 16000,
  frameDurationMs: 250,
}

class AudioService {
  private context: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private workletNode: AudioWorkletNode | null = null
  private processorNode: ScriptProcessorNode | null = null
  private gainNode: GainNode | null = null

  private readonly frameListeners = new Set<FrameListener>()
  private readonly levelListeners = new Set<LevelListener>()
  private readonly options: Required<AudioServiceOptions>

  private resampleBuffer: number[] = []
  private workletLoaded = false
  private isRecording = false
  private muted = false

  constructor(opts?: AudioServiceOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...opts }
  }

  get isMuted() {
    return this.muted
  }

  get recording() {
    return this.isRecording
  }

  onFrame(listener: FrameListener) {
    this.frameListeners.add(listener)
    return () => this.frameListeners.delete(listener)
  }

  onLevel(listener: LevelListener) {
    this.levelListeners.add(listener)
    return () => this.levelListeners.delete(listener)
  }

  async start(): Promise<boolean> {
    if (this.isRecording) {
      return true
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn('[audioService] browser does not support mediaDevices.getUserMedia')
      return false
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: this.options.targetSampleRate,
        },
        video: false,
      })
    } catch (error) {
      console.error('[audioService] failed to acquire microphone', error)
      return false
    }

    const AudioContextCls =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCls) {
      this.mediaStream?.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
      console.warn('[audioService] AudioContext is not supported')
      return false
    }

    try {
      this.context = new AudioContextCls()
    } catch (error) {
      console.error('[audioService] failed to create AudioContext', error)
      this.mediaStream?.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
      return false
    }

    this.sourceNode = this.context.createMediaStreamSource(this.mediaStream)
    this.resampleBuffer = []

    const frameSamples = Math.round(
      (this.options.targetSampleRate * this.options.frameDurationMs) / 1000,
    )

    const supportsWorklet =
      typeof AudioWorkletNode !== 'undefined' && Boolean(this.context.audioWorklet)

    if (supportsWorklet) {
      try {
        if (!this.workletLoaded) {
          await this.context.audioWorklet.addModule('/worklets/audio-processor.js')
          this.workletLoaded = true
        }

        this.workletNode = new AudioWorkletNode(this.context, 'pcm16-worklet', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1],
          processorOptions: {
            targetSampleRate: this.options.targetSampleRate,
            frameSize: frameSamples,
            sourceSampleRate: this.context.sampleRate,
          },
        })

        this.workletNode.port.onmessage = (event: MessageEvent<{ frame: Int16Array; level: number }>) => {
          const { frame, level } = event.data ?? {}
          if (!frame || this.muted) {
            this.emitLevel(this.muted ? 0 : level ?? 0)
            return
          }
          this.handlePcmFrame(frame, level ?? 0)
        }

        this.sourceNode.connect(this.workletNode)
        this.gainNode = this.context.createGain()
        this.gainNode.gain.value = 0
        this.workletNode.connect(this.gainNode).connect(this.context.destination)
      } catch (error) {
        console.warn('[audioService] audioWorklet setup failed, falling back', error)
        await this.setupScriptProcessor(frameSamples)
      }
    } else {
      await this.setupScriptProcessor(frameSamples)
    }

    this.isRecording = true
    this.muted = false
    return true
  }

  async stop() {
    if (!this.isRecording) return

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop())
    }
    this.mediaStream = null

    this.sourceNode?.disconnect()
    this.sourceNode = null

    if (this.workletNode) {
      this.workletNode.port.onmessage = null
      this.workletNode.disconnect()
      this.workletNode = null
    }

    if (this.processorNode) {
      this.processorNode.disconnect()
      this.processorNode.onaudioprocess = null
      this.processorNode = null
    }

    if (this.gainNode) {
      this.gainNode.disconnect()
      this.gainNode = null
    }

    if (this.context) {
      await this.context.close()
      this.context = null
    }

    this.resampleBuffer = []
    this.isRecording = false
    this.emitLevel(0)
  }

  async mute() {
    this.muted = true
    this.emitLevel(0)
  }

  async unmute() {
    this.muted = false
  }

  setMuted(muted: boolean) {
    if (muted) {
      void this.mute()
    } else {
      void this.unmute()
    }
  }

  private async setupScriptProcessor(frameSamples: number) {
    if (!this.context || !this.sourceNode) return

    const bufferSize = 4096
    this.processorNode = this.context.createScriptProcessor(bufferSize, 1, 1)
    this.sourceNode.connect(this.processorNode)
    this.processorNode.connect(this.context.destination)

    this.processorNode.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer.getChannelData(0)
      const downsampled = this.downsampleBuffer(
        inputBuffer,
        this.context?.sampleRate ?? this.options.targetSampleRate,
        this.options.targetSampleRate,
      )
      this.pushToFrameQueue(downsampled, frameSamples)
    }
  }

  private pushToFrameQueue(samples: Float32Array, frameSamples: number) {
    if (!samples.length) return
    this.resampleBuffer.push(...samples)

    while (this.resampleBuffer.length >= frameSamples) {
      const frameFloats = this.resampleBuffer.splice(0, frameSamples)
      const intFrame = this.floatToPcm16(frameFloats)
      const level = this.computeLevel(frameFloats)

      if (!this.muted) {
        this.handlePcmFrame(intFrame, level)
      } else {
        this.emitLevel(0)
      }
    }
  }

  private handlePcmFrame(frame: Int16Array, level: number) {
    console.log('[audioService] PCM frame', frame)
    this.emitLevel(level)
    this.frameListeners.forEach((listener) => listener(frame))
  }

  private emitLevel(level: number) {
    this.levelListeners.forEach((listener) => listener(level))
  }

  private computeLevel(samples: number[] | Float32Array): number {
    if (!samples.length) return 0
    let sumSquares = 0
    for (let i = 0; i < samples.length; i += 1) {
      const value = samples[i] ?? 0
      sumSquares += value * value
    }
    const rms = Math.sqrt(sumSquares / samples.length)
    return Math.min(1, rms)
  }

  private downsampleBuffer(
    buffer: Float32Array,
    inputSampleRate: number,
    targetSampleRate: number,
  ): Float32Array {
    if (inputSampleRate === targetSampleRate) {
      return buffer
    }

    if (inputSampleRate < targetSampleRate) {
      const ratio = targetSampleRate / inputSampleRate
      const newLength = Math.floor(buffer.length * ratio)
      const result = new Float32Array(newLength)
      for (let i = 0; i < newLength; i += 1) {
        const sourcePosition = i / ratio
        const floor = Math.floor(sourcePosition)
        const ceil = Math.min(Math.ceil(sourcePosition), buffer.length - 1)
        const weight = sourcePosition - floor
        const floorSample = buffer[floor] ?? 0
        const ceilSample = buffer[ceil] ?? 0
        result[i] = floorSample * (1 - weight) + ceilSample * weight
      }
      return result
    }

    const sampleRateRatio = inputSampleRate / targetSampleRate
    const newLength = Math.floor(buffer.length / sampleRateRatio)
    const result = new Float32Array(newLength)
    let offsetResult = 0
    let offsetBuffer = 0

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio)
      let accum = 0
      let count = 0

      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
        accum += buffer[i] ?? 0
        count += 1
      }

      result[offsetResult] = count > 0 ? accum / count : 0
      offsetResult += 1
      offsetBuffer = nextOffsetBuffer
    }

    return result
  }

  private floatToPcm16(floatBuffer: number[]): Int16Array {
    const pcmBuffer = new Int16Array(floatBuffer.length)
    for (let i = 0; i < floatBuffer.length; i += 1) {
      const clamped = Math.max(-1, Math.min(1, floatBuffer[i] ?? 0))
      pcmBuffer[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff
    }
    return pcmBuffer
  }
}

export const audioService = new AudioService()
