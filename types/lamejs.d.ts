type Mp3EncoderConstructor = new (
  channels: number,
  sampleRate: number,
  kbps: number,
) => {
  encodeBuffer(left: Int16Array, right: Int16Array): Int8Array;
  flush(): Int8Array;
};

declare module 'lamejs' {
  export const Mp3Encoder: Mp3EncoderConstructor;
}

declare module 'lamejs/lame.min.js';

declare global {
  interface Window {
    lamejs?: {
      Mp3Encoder?: Mp3EncoderConstructor;
    };
  }

  var lamejs: {
    Mp3Encoder?: Mp3EncoderConstructor;
  } | undefined;
}

export {};
