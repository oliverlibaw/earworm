"use client";

let sharedSegmentAudio: HTMLAudioElement | null = null;
let segmentStopTimeout: ReturnType<typeof setTimeout> | null = null;
let segmentRafId: number | null = null;

export function stopAudioSlice(): void {
  if (segmentStopTimeout) {
    clearTimeout(segmentStopTimeout);
    segmentStopTimeout = null;
  }
  if (segmentRafId !== null && typeof window !== "undefined") {
    window.cancelAnimationFrame(segmentRafId);
    segmentRafId = null;
  }
  if (sharedSegmentAudio) {
    sharedSegmentAudio.pause();
    sharedSegmentAudio.ontimeupdate = null;
    sharedSegmentAudio.onended = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

/**
 * Plays an exact [startTime, endTime] slice (in seconds) of an episode MP3 file.
 * Automatically stops playback as soon as `currentTime >= endTime`.
 */
export function playAudioSlice(
  audioUrl: string,
  startTime: number,
  endTime: number,
  options?: {
    playbackRate?: number;
    onEnd?: () => void;
    onError?: () => void;
  }
): void {
  if (typeof window === "undefined") return;
  stopAudioSlice();

  try {
    if (!sharedSegmentAudio) {
      sharedSegmentAudio = new Audio();
      sharedSegmentAudio.preload = "auto";
    }
    const audio = sharedSegmentAudio;
    const rate = options?.playbackRate ?? 1.0;

    const startPlayback = () => {
      try {
        audio.playbackRate = rate;
        audio.currentTime = Math.max(0, startTime);

        const finishSlice = () => {
          stopAudioSlice();
          options?.onEnd?.();
        };

        const checkProgress = () => {
          if (!sharedSegmentAudio || sharedSegmentAudio.paused) return;
          if (sharedSegmentAudio.currentTime >= endTime - 0.03) {
            finishSlice();
            return;
          }
          segmentRafId = window.requestAnimationFrame(checkProgress);
        };

        audio.ontimeupdate = () => {
          if (audio.currentTime >= endTime - 0.03) {
            finishSlice();
          }
        };
        audio.onended = () => {
          finishSlice();
        };

        const durationMs =
          (Math.max(0.4, endTime - startTime) / Math.max(0.5, rate)) * 1000 +
          250;
        segmentStopTimeout = setTimeout(finishSlice, durationMs);

        void audio
          .play()
          .then(() => {
            segmentRafId = window.requestAnimationFrame(checkProgress);
          })
          .catch(() => {
            options?.onError?.();
            options?.onEnd?.();
          });
      } catch {
        options?.onError?.();
        options?.onEnd?.();
      }
    };

    const resolvedTarget = new URL(audioUrl, window.location.origin).href;
    if (audio.src === resolvedTarget && audio.readyState >= 1) {
      startPlayback();
    } else {
      audio.src = audioUrl;
      audio.onloadedmetadata = () => {
        audio.onloadedmetadata = null;
        startPlayback();
      };
      audio.onerror = () => {
        audio.onerror = null;
        options?.onError?.();
        options?.onEnd?.();
      };
      audio.load();
    }
  } catch {
    options?.onError?.();
    options?.onEnd?.();
  }
}

/**
 * Speaks a Spanish word, slang phrase, or sentence.
 * If exact `startTime` and `endTime` along with `fallbackAudioUrl` are provided,
 * plays that exact slice from the episode MP3 file first!
 * Otherwise uses the browser's native SpeechSynthesis (preferring `es-MX`),
 * or falls back to proportional MP3 slicing.
 */
export function speakSpanishText(
  text: string,
  options?: {
    rate?: number;
    fallbackAudioUrl?: string;
    startTime?: number;
    endTime?: number;
    turnIndex?: number;
    totalTurns?: number;
    onEnd?: () => void;
  }
): void {
  if (typeof window === "undefined") return;

  stopAudioSlice();

  // 1. If exact line timestamps (`startTime` and `endTime`) + `fallbackAudioUrl` are provided,
  // slice the actual episode MP3 directly!
  if (
    options?.fallbackAudioUrl &&
    typeof options.startTime === "number" &&
    typeof options.endTime === "number" &&
    options.endTime > options.startTime
  ) {
    playAudioSlice(options.fallbackAudioUrl, options.startTime, options.endTime, {
      playbackRate: options.rate && options.rate < 0.85 ? options.rate : 1.0,
      onEnd: options.onEnd,
    });
    return;
  }

  // 2. Otherwise use Web Speech API (for single vocab words / slang terms)
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

  // 3. Fallback: play the proportional segment of the dialog MP3 file
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
        const startSec = Math.max(0, turnIdx * sliceSec);
        playAudioSlice(options.fallbackAudioUrl!, startSec, startSec + sliceSec, {
          onEnd: options.onEnd,
        });
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
