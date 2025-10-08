export interface RecorderSupport {
  mimeType: string;
  extension: string;
}

const MP3_BITRATE_KBPS = 128;
const MP3_FRAME_SAMPLES = 1152;

type Mp3EncoderInstance = {
  encodeBuffer(left: Int16Array, right: Int16Array): Int8Array;
  flush(): Int8Array;
};

type Mp3EncoderConstructor = new (
  channels: number,
  sampleRate: number,
  kbps: number,
) => Mp3EncoderInstance;

interface LameGlobal {
  Mp3Encoder?: Mp3EncoderConstructor;
}

let mp3EncoderCtorPromise: Promise<Mp3EncoderConstructor> | null = null;

async function loadMp3EncoderConstructor(): Promise<Mp3EncoderConstructor> {
  if (!mp3EncoderCtorPromise) {
    mp3EncoderCtorPromise = (async () => {
      const getGlobal = (): LameGlobal | undefined => {
        const globalScope = globalThis as typeof globalThis & {
          lamejs?: LameGlobal;
        };
        if (typeof window !== 'undefined') {
          const w = window as typeof window & { lamejs?: LameGlobal };
          if (w.lamejs?.Mp3Encoder) return w.lamejs;
        }
        return globalScope.lamejs;
      };

      const globalLame = getGlobal();
      if (globalLame?.Mp3Encoder) {
        return globalLame.Mp3Encoder;
      }

      if (typeof window === 'undefined') {
        const lameModule = await import('lamejs');
        const ctor =
          (lameModule as Record<string, unknown>).Mp3Encoder ??
          ((lameModule as Record<string, unknown>).default as
            | { Mp3Encoder?: Mp3EncoderConstructor }
            | undefined)?.Mp3Encoder;
        if (!ctor) {
          throw new Error('Unable to load lamejs Mp3Encoder.');
        }
        return ctor;
      }

      await import('lamejs/lame.min.js');

      const loaded = getGlobal();
      const ctor = loaded?.Mp3Encoder;
      if (!ctor) {
        throw new Error('Unable to load lamejs Mp3Encoder.');
      }
      return ctor;
    })();
  }
  return mp3EncoderCtorPromise;
}

// Encode AudioBuffer to WAV (16-bit PCM)
function encodeWav(audioBuffer: AudioBuffer): ArrayBuffer {
  const { numberOfChannels, sampleRate } = audioBuffer;
  const length = audioBuffer.length * numberOfChannels * 2;
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  let offset = 0;

  writeString(offset, 'RIFF');
  offset += 4;
  view.setUint32(offset, 36 + length, true);
  offset += 4;
  writeString(offset, 'WAVE');
  offset += 4;
  writeString(offset, 'fmt ');
  offset += 4;
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, numberOfChannels, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * numberOfChannels * 2, true);
  offset += 4;
  view.setUint16(offset, numberOfChannels * 2, true);
  offset += 2;
  view.setUint16(offset, 16, true);
  offset += 2;
  writeString(offset, 'data');
  offset += 4;
  view.setUint32(offset, length, true);
  offset += 4;

  const interleaved = interleave(audioBuffer);

  for (let i = 0; i < interleaved.length; i += 1, offset += 2) {
    const sample = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return buffer;
}

function interleave(audioBuffer: AudioBuffer): Float32Array {
  if (audioBuffer.numberOfChannels === 1) {
    return audioBuffer.getChannelData(0);
  }

  const channelData: Float32Array[] = [];
  for (let i = 0; i < audioBuffer.numberOfChannels; i += 1) {
    channelData.push(audioBuffer.getChannelData(i));
  }

  const length = audioBuffer.length * audioBuffer.numberOfChannels;
  const interleaved = new Float32Array(length);
  let offset = 0;

  for (let i = 0; i < audioBuffer.length; i += 1) {
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
      interleaved[offset] = channelData[channel][i];
      offset += 1;
    }
  }

  return interleaved;
}

export async function convertBlobToWav(
  blob: Blob,
  fileName: string,
): Promise<File> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));

    if (decoded.length === 0) {
      throw new Error('Decoded audio has no samples.');
    }

    const wavBuffer = encodeWav(decoded);
    const wavBytes = new Uint8Array(wavBuffer);
    return new File([wavBytes], fileName, { type: 'audio/wav' });
  } finally {
    await audioContext.close();
  }
}

function clampSample(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function floatTo16BitPcm(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const sample = clampSample(input[i]);
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

function getChannelDataOrFallback(
  audioBuffer: AudioBuffer,
  channel: number,
): Float32Array {
  if (channel < audioBuffer.numberOfChannels) {
    return audioBuffer.getChannelData(channel);
  }
  return audioBuffer.getChannelData(0);
}

function mergeMp3Chunks(chunks: Int8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

export async function convertBlobToMp3(
  blob: Blob,
  fileName: string,
  bitrateKbps: number = MP3_BITRATE_KBPS,
): Promise<File> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));

    if (decoded.length === 0) {
      throw new Error('Decoded audio has no samples.');
    }

    const Mp3Encoder = await loadMp3EncoderConstructor();
    const channelCount = Math.min(decoded.numberOfChannels, 2);
    const sampleRate = decoded.sampleRate;
    const encoder = new Mp3Encoder(channelCount, sampleRate, bitrateKbps);

    const leftChannel = decoded.getChannelData(0);
    const rightChannel = channelCount > 1
      ? getChannelDataOrFallback(decoded, 1)
      : null;

    const mp3Chunks: Int8Array[] = [];
    const totalSamples = decoded.length;

    for (let position = 0; position < totalSamples; position += MP3_FRAME_SAMPLES) {
      const end = Math.min(position + MP3_FRAME_SAMPLES, totalSamples);
      const leftSlice = leftChannel.subarray(position, end);
      const rightSlice = rightChannel ? rightChannel.subarray(position, end) : leftSlice;

      const leftBuffer = floatTo16BitPcm(leftSlice);
      const rightBuffer = rightChannel ? floatTo16BitPcm(rightSlice) : leftBuffer;

      const mp3Chunk = encoder.encodeBuffer(leftBuffer, rightBuffer);
      if (mp3Chunk.length > 0) {
        mp3Chunks.push(mp3Chunk);
      }
    }

    const flushChunk = encoder.flush();
    if (flushChunk.length > 0) {
      mp3Chunks.push(flushChunk);
    }

    if (mp3Chunks.length === 0) {
      throw new Error('MP3 encoder returned no data.');
    }

    const mp3Bytes = mergeMp3Chunks(mp3Chunks);
    const buffer = new ArrayBuffer(mp3Bytes.length);
    new Uint8Array(buffer).set(mp3Bytes);
    if (process.env.NODE_ENV !== 'production') {
      console.info('MP3 conversion complete', {
        fileName,
        sampleRate,
        channelCount,
        frames: mp3Chunks.length,
        bytes: mp3Bytes.length,
      });
    }
    return new File([buffer], fileName, { type: 'audio/mpeg' });
  } finally {
    await audioContext.close();
  }
}
