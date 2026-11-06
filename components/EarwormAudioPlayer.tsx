"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Car,
  CheckCircle2,
  Gauge,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EarwormAudioPlayerProps {
  audioUrl: string;
  lessonId: string;
  playCount: number;
  allowedPlays: number; // 1 in Round 1, 2 in Round 2 (after first Submit)
  usedSlowdown: boolean;
  usedCafeMode: boolean;
  isPostSubmit?: boolean;
  onPlayStarted: () => void;
  onSlowdownActivated: () => void;
  onCafeModeChange: (enabled: boolean) => void;
}

export function EarwormAudioPlayer({
  audioUrl,
  lessonId,
  playCount,
  allowedPlays,
  usedSlowdown,
  usedCafeMode,
  isPostSubmit = false,
  onPlayStarted,
  onSlowdownActivated,
  onCafeModeChange,
}: EarwormAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(28);
  const [playbackRate, setPlaybackRate] = useState<1.0 | 0.75>(
    usedSlowdown ? 0.75 : 1.0
  );
  const [cafeMode, setCafeMode] = useState(usedCafeMode);
  const [clipEndedOnCurrentPlay, setClipEndedOnCurrentPlay] = useState(false);
  const hasCountedCurrentRunRef = useRef(false);

  // Web Audio API refs for realistic street traffic background ambience
  const audioCtxRef = useRef<AudioContext | null>(null);
  const cafeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const cafeGainRef = useRef<GainNode | null>(null);

  /**
   * Generates a realistic, warm, non-intrusive 9-second stereo loop of
   * distant city street traffic:
   * 1. Deep low-passed brownian tire/asphalt rumble & engine idle (60-160 Hz, zero white hiss).
   * 2. Gentle stereo Doppler car pass-bys (left->right and right->left).
   * 3. Occasional soft, distant muffled two-tone city horn in the background.
   */
  const createTrafficNoiseBuffer = useCallback(
    (ctx: AudioContext): AudioBuffer => {
      const sampleRate = ctx.sampleRate;
      const lengthSeconds = 9;
      const totalSamples = sampleRate * lengthSeconds;
      const buffer = ctx.createBuffer(2, totalSamples, sampleRate);

      // Car pass-by events: { peakTime, duration, direction (1 = L->R, -1 = R->L), baseFreq }
      const carPassEvents = [
        { peakTime: 1.8, width: 0.75, dir: 1, freq: 115 },
        { peakTime: 4.6, width: 0.9, dir: -1, freq: 98 },
        { peakTime: 7.3, width: 0.7, dir: 1, freq: 128 },
      ];

      for (let ch = 0; ch < 2; ch++) {
        const channelData = buffer.getChannelData(ch);
        let brown = 0;
        let lp1 = 0;
        let lp2 = 0;

        for (let i = 0; i < totalSamples; i++) {
          const t = i / sampleRate;
          const white = Math.random() * 2 - 1;

          // Brownian integration + two-stage low-pass smoothing to remove all high-frequency white hiss
          brown = (brown + 0.018 * white) / 1.018;
          lp1 = lp1 + 0.04 * (brown - lp1);
          lp2 = lp2 + 0.04 * (lp1 - lp2);

          // Low engine idle hum (62 Hz + 124 Hz harmonic with slow traffic swell)
          const trafficSwell =
            0.7 +
            0.2 * Math.sin(2 * Math.PI * 0.22 * t + ch * 0.5) +
            0.1 * Math.cos(2 * Math.PI * 0.41 * t);
          const engineIdle =
            (0.035 * Math.sin(2 * Math.PI * 62 * t) +
              0.02 * Math.sin(2 * Math.PI * 124 * t + 0.8)) *
            trafficSwell;

          // Stereo passing cars with Doppler pitch shift & panning
          let passBySignal = 0;
          for (const car of carPassEvents) {
            const dt = t - car.peakTime;
            const env = Math.exp(-(dt * dt) / (2 * car.width * car.width));
            if (env > 0.005) {
              // Pan position moves from -1 to +1 (or reverse)
              const pan = Math.max(
                -1,
                Math.min(1, (dt / (car.width * 1.4)) * car.dir)
              );
              const chGain = ch === 0 ? (1 - pan) * 0.5 : (1 + pan) * 0.5;
              // Subtle Doppler frequency shift (higher approaching, lower receding)
              const dopplerFreq =
                car.freq * (1 - 0.14 * Math.tanh(dt / car.width));
              const tireWhoosh =
                lp1 * 0.9 +
                0.08 * Math.sin(2 * Math.PI * dopplerFreq * t) +
                0.04 * Math.sin(2 * Math.PI * (dopplerFreq * 1.5) * t);
              passBySignal += env * chGain * tireWhoosh;
            }
          }

          // Distant, soft two-tone city taxi horn around t = 3.2s and t = 3.42s (double tap)
          let distantHorn = 0;
          const hornWindows = [
            { start: 3.15, end: 3.26 },
            { start: 3.34, end: 3.52 },
          ];
          for (const hw of hornWindows) {
            if (t >= hw.start && t <= hw.end) {
              const ht = t - hw.start;
              const hDur = hw.end - hw.start;
              const hEnv =
                Math.sin((ht / hDur) * Math.PI) * (ch === 0 ? 0.65 : 0.45);
              distantHorn +=
                hEnv *
                0.022 *
                (Math.sin(2 * Math.PI * 392 * t) +
                  0.7 * Math.sin(2 * Math.PI * 494 * t));
            }
          }

          // Smooth loop crossfade at start/end
          const edgeFade =
            Math.min(1, t / 0.35) * Math.min(1, (lengthSeconds - t) / 0.35);

          channelData[i] =
            (lp2 * 0.55 * trafficSwell +
              engineIdle +
              passBySignal * 0.65 +
              distantHorn) *
            edgeFade;
        }
      }
      return buffer;
    },
    []
  );

  const syncCafeAudioState = useCallback(
    (shouldPlayTraffic: boolean) => {
      if (typeof window === "undefined") return;

      if (!shouldPlayTraffic) {
        if (cafeGainRef.current && audioCtxRef.current) {
          cafeGainRef.current.gain.setTargetAtTime(
            0,
            audioCtxRef.current.currentTime,
            0.08
          );
        }
        return;
      }

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }

      // Modest target gain (0.09) so traffic sounds realistic without overpowering speech
      const targetGain = 0.09;

      if (!cafeSourceRef.current) {
        const trafficBuffer = createTrafficNoiseBuffer(ctx);
        const source = ctx.createBufferSource();
        source.buffer = trafficBuffer;
        source.loop = true;

        // Warm low-pass filter at 360 Hz to keep traffic rumble out of vocal clarity range (800-3000 Hz)
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 360;
        filter.Q.value = 0.7;

        const gainNode = ctx.createGain();
        gainNode.gain.value = targetGain;

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);

        cafeSourceRef.current = source;
        cafeGainRef.current = gainNode;
      } else if (cafeGainRef.current) {
        cafeGainRef.current.gain.setTargetAtTime(
          targetGain,
          ctx.currentTime,
          0.08
        );
      }
    },
    [createTrafficNoiseBuffer]
  );

  useEffect(() => {
    syncCafeAudioState(isPlaying && cafeMode);
  }, [isPlaying, cafeMode, syncCafeAudioState]);

  useEffect(() => {
    return () => {
      if (cafeSourceRef.current) {
        try {
          cafeSourceRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (audioCtxRef.current) {
        void audioCtxRef.current.close();
      }
    };
  }, []);

  // Reset player state when lessonId or audioUrl changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setPlaybackRate(1.0);
    setClipEndedOnCurrentPlay(false);
    hasCountedCurrentRunRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = 1.0;
      audioRef.current.load();
    }
  }, [lessonId, audioUrl]);

  // Unlock play button when allowedPlays increases from 1 (Round 1) to 2 (Round 2)
  useEffect(() => {
    if (allowedPlays > playCount) {
      setClipEndedOnCurrentPlay(false);
      hasCountedCurrentRunRef.current = false;
    }
  }, [allowedPlays, playCount]);

  const listensLocked =
    !isPostSubmit &&
    playCount >= allowedPlays &&
    !isPlaying &&
    (clipEndedOnCurrentPlay || !hasCountedCurrentRunRef.current);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    if (listensLocked) {
      return;
    }

    if (!hasCountedCurrentRunRef.current || audio.ended) {
      if (!isPostSubmit && playCount >= allowedPlays) {
        return;
      }
      audio.currentTime = 0;
      setCurrentTime(0);
      hasCountedCurrentRunRef.current = true;
      setClipEndedOnCurrentPlay(false);
      onPlayStarted();
    }

    audio.playbackRate = playbackRate;
    try {
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("Failed to play audio clip:", err);
    }
  };

  const handleSpeedToggle = () => {
    const nextRate: 1.0 | 0.75 = playbackRate === 1.0 ? 0.75 : 1.0;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
    if (nextRate === 0.75) {
      onSlowdownActivated();
    }
  };

  const handleCafeToggle = () => {
    const next = !cafeMode;
    setCafeMode(next);
    onCafeModeChange(next);
  };

  const progressRatio =
    duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;

  let playButtonLabel = "Play Audio";
  if (isPlaying) {
    playButtonLabel = "Pause Audio";
  } else if (isPostSubmit) {
    playButtonLabel = "Replay Audio";
  } else if (listensLocked) {
    playButtonLabel =
      allowedPlays === 1
        ? "1st Listen Complete"
        : "Both Listens Complete";
  } else if (hasCountedCurrentRunRef.current) {
    playButtonLabel = "Resume Audio";
  } else if (allowedPlays === 2 && playCount === 1) {
    playButtonLabel = "Play Audio (Listen a 2nd Time)";
  } else if (allowedPlays === 2 && playCount === 0) {
    playButtonLabel = "Play Audio";
  }

  return (
    <div className="space-y-3">
      <audio
        key={audioUrl}
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        onLoadedMetadata={(e) => {
          const dur = e.currentTarget.duration;
          if (Number.isFinite(dur) && dur > 0) {
            setDuration(dur);
          }
        }}
        onTimeUpdate={(e) => {
          setCurrentTime(e.currentTarget.currentTime);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setClipEndedOnCurrentPlay(true);
          hasCountedCurrentRunRef.current = false;
        }}
      />

      {/* Primary Play Audio Button with subtle embedded progress bar */}
      <div className="relative overflow-hidden rounded-2xl">
        <Button
          type="button"
          size="lg"
          disabled={listensLocked}
          onClick={togglePlayPause}
          className={cn(
            "relative h-14 w-full rounded-2xl text-base font-extrabold tracking-tight transition-all",
            listensLocked
              ? "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              : "bg-[#538d4e] text-white hover:bg-[#467a42] dark:bg-[#538d4e] dark:text-white dark:hover:bg-[#467a42]"
          )}
        >
          {/* Progress Fill Overlay */}
          {isPlaying && (
            <span
              style={{ width: `${progressRatio}%` }}
              className="pointer-events-none absolute inset-y-0 left-0 bg-white/15 transition-all duration-150"
            />
          )}

          <span className="relative z-10 flex items-center justify-center gap-2.5">
            {listensLocked ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : isPostSubmit ? (
              <RotateCcw className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 fill-current" />
            )}
            <span>{playButtonLabel}</span>
          </span>
        </Button>
      </div>

      {/* Two Modifier Buttons Side-by-Side: Slow Playback (20% Penalty) | Add Background Noise (+1 Pt Bonus • Traffic) */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleSpeedToggle}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer",
            playbackRate === 0.75 || usedSlowdown
              ? "border-[#b59f3b] bg-[#b59f3b] text-white"
              : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700"
          )}
        >
          <Gauge className="h-4 w-4 shrink-0" />
          <span>
            {playbackRate === 0.75
              ? "Slow Playback ON (20% Penalty)"
              : "Slow Playback (20% Penalty)"}
          </span>
        </button>

        <button
          type="button"
          onClick={handleCafeToggle}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer",
            cafeMode
              ? "border-[#538d4e] bg-[#538d4e]/15 text-[#538d4e] dark:border-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-300"
              : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700"
          )}
        >
          <Car className="h-4 w-4 shrink-0" />
          <span>
            {cafeMode
              ? "Traffic Noise ON (+1 Pt Bonus)"
              : "Add Background Noise (+1 Pt Bonus)"}
          </span>
        </button>
      </div>
    </div>
  );
}
