"use client";

let sharedSegmentAudio: HTMLAudioElement | null = null;
let segmentStopTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Speaks a Spanish word, slang phrase, or sentence using the browser's
 * native SpeechSynthesis (preferring Mexican / Latin American Spanish `es-MX`),
 * or falls back to playing the corresponding time slice of the dialog MP3.
 */
export function speakSpanishText(
  text: string,
  options?: {
    rate?: number;
    fallbackAudioUrl?: string;
    turnIndex?: number;
    totalTurns?: number;
    onEnd?: () => void;
  }
): void {
  if (typeof window === "undefined") return;

  // Stop any currently playing segment audio
  if (segmentStopTimeout) {
    clearTimeout(segmentStopTimeout);
    segmentStopTimeout = null;
  }
  if (sharedSegmentAudio) {
    sharedSegmentAudio.pause();
  }

  const synth = window.speechSynthesis;
  if (synth) {
    try {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = synth.getVoices();

      // Prefer Mexican Spanish (es-MX), then US/LatAm Spanish (es-US, es-419), then any Spanish voice
      const preferredVoice =
        voices.find((v) => v.lang.toLowerCase() === "es-mx") ??
        voices.find((v) => v.lang.toLowerCase().startsWith("es-mx")) ??
        voices.find((v) => v.lang.toLowerCase() === "es-419") ??
        voices.find((v) => v.lang.toLowerCase() === "es-us") ??
        voices.find((v) => v.lang.toLowerCase().startsWith("es"));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      utterance.lang = preferredVoice?.lang || "es-MX";
      utterance.rate = options?.rate ?? 0.92;
      utterance.pitch = 1.0;

      if (options?.onEnd) {
        utterance.onend = () => options.onEnd?.();
        utterance.onerror = () => options.onEnd?.();
      }

      synth.speak(utterance);
      return;
    } catch {
      // Fallback to MP3 segment below
    }
  }

  // Fallback: play the proportional segment of the dialog MP3 file
  if (options?.fallbackAudioUrl) {
    try {
      if (!sharedSegmentAudio) {
        sharedSegmentAudio = new Audio();
      }
      const audio = sharedSegmentAudio;
      audio.src = options.fallbackAudioUrl;
      const turnIdx = options.turnIndex ?? 0;
      const total = Math.max(1, options.totalTurns ?? 6);

      audio.onloadedmetadata = () => {
        const dur = Number.isFinite(audio.duration) ? audio.duration : 28;
        const sliceSec = dur / total;
        audio.currentTime = Math.max(0, turnIdx * sliceSec);
        void audio.play();
        segmentStopTimeout = setTimeout(() => {
          audio.pause();
          options.onEnd?.();
        }, Math.max(3500, sliceSec * 1000));
      };
      audio.load();
      return;
    } catch {
      options?.onEnd?.();
    }
  } else {
    options?.onEnd?.();
  }
}
