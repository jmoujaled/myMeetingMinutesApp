export interface RecorderSupport {
  mimeType: string;
  extension: string;
}

// Encode AudioBuffer to WAV (16-bit PCM PCM)
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
