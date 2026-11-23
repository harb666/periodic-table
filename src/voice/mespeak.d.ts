declare module 'mespeak' {
  interface VoiceData {
    voice_id: string;
    dict_id: string;
    dict: string;
    voice: string;
    voice_encoding?: 'base64' | 'text';
  }
  interface SpeakOptions {
    amplitude?: number;
    pitch?: number;
    speed?: number;
    wordgap?: number;
    voice?: string;
    rawdata?: boolean | 'array' | 'base64' | 'mime';
  }
  const meSpeak: {
    loadConfig(config: unknown): void;
    loadVoice(voice: VoiceData): void;
    isConfigLoaded(): boolean;
    speak(text: string, options: SpeakOptions): ArrayBuffer | number[] | string | null;
  };
  export default meSpeak;
}
declare module 'mespeak/src/mespeak_config.json' {
  const config: unknown;
  export default config;
}
declare module 'mespeak/voices/en/en-us.json' {
  const voice: { voice_id: string; dict_id: string; dict: string; voice: string };
  export default voice;
}
