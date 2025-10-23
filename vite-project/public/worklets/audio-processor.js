class PCM16WorkletProcessor extends AudioWorkletProcessor {
  constructor(options = {}) {
    super()
    const processorOptions = options.processorOptions || {}
    this.sourceSampleRate = processorOptions.sourceSampleRate || sampleRate
    this.targetSampleRate = processorOptions.targetSampleRate || 16000
    this.frameSize = processorOptions.frameSize || 320
    this.buffer = []
  }

  downsample(buffer, inputRate, targetRate) {
    if (inputRate === targetRate) {
      return buffer
    }

    if (inputRate < targetRate) {
      const ratio = targetRate / inputRate
      const newLength = Math.floor(buffer.length * ratio)
      const result = new Float32Array(newLength)
      for (let i = 0; i < newLength; i += 1) {
        const sourcePosition = i / ratio
        const lower = Math.floor(sourcePosition)
        const upper = Math.min(Math.ceil(sourcePosition), buffer.length - 1)
        const weight = sourcePosition - lower
        result[i] = buffer[lower] * (1 - weight) + buffer[upper] * weight
      }
      return result
    }

    const ratio = inputRate / targetRate
    const newLength = Math.floor(buffer.length / ratio)
    const result = new Float32Array(newLength)
    let offset = 0

    for (let i = 0; i < newLength; i += 1) {
      const nextOffset = Math.round((i + 1) * ratio)
      let accum = 0
      let count = 0

      for (let j = offset; j < nextOffset && j < buffer.length; j += 1) {
        accum += buffer[j]
        count += 1
      }

      result[i] = count > 0 ? accum / count : 0
      offset = nextOffset
    }

    return result
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || input.length === 0) return true

    const channelData = input[0]
    if (!channelData) return true

    const downsampled = this.downsample(channelData, this.sourceSampleRate, this.targetSampleRate)
    if (!downsampled.length) return true

    for (let i = 0; i < downsampled.length; i += 1) {
      this.buffer.push(downsampled[i])
    }

    while (this.buffer.length >= this.frameSize) {
      const frameFloats = this.buffer.splice(0, this.frameSize)
      const pcm = new Int16Array(frameFloats.length)
      let sumSquares = 0
      for (let i = 0; i < frameFloats.length; i += 1) {
        const value = Math.max(-1, Math.min(1, frameFloats[i] ?? 0))
        pcm[i] = value < 0 ? value * 0x8000 : value * 0x7fff
        sumSquares += value * value
      }
      const level = Math.min(1, Math.sqrt(sumSquares / frameFloats.length || 1))
      this.port.postMessage({ frame: pcm, level }, [pcm.buffer])
    }

    return true
  }
}

registerProcessor('pcm16-worklet', PCM16WorkletProcessor)
