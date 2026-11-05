"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Coffee, Gauge, CheckCircle2, Pause, Play, RotateCcw } from "lucide-react";
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

  // Web Audio API refs for "Add Background Noise (15% Bonus)"
  const audioCtxRef = useRef<AudioContext | null>(null);
  const cafeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const cafeGainRef = useRef<GainNode | null>(null);

  const createCafeNoiseBuffer = useCallback((ctx: AudioContext): AudioBuffer => {
    const sampleRate = ctx.sampleRate;
    const lengthSeconds = 6;
    const totalSamples = sampleRate * lengthSeconds;
    const buffer = ctx.createBuffer(2, totalSamples, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const channelData = buffer.getChannelData(ch);
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0;

      for (let i = 0; i < totalSamples; i++) {
        const t = i / sampleRate;
        const white = Math.random() * 2 - 1;

        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink =
          (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
        b6 = white * 0.115926;

        const chatterMod =
          0.65 +
          0.2 * Math.sin(2 * Math.PI * 3.2 * t + ch * 1.1) +
          0.15 * Math.sin(2 * Math.PI * 5.7 * t + ch * 2.4) +
          0.1 * Math.cos(2 * Math.PI * 1.4 * t);

        let clink = 0;
        const clinkTimes = [1.4 + ch * 0.03, 4.1 + ch * 0.02];
        for (const ct of clinkTimes) {
          if (t >= ct && t < ct + 0.09) {
            const dt = t - ct;
            const env = Math.exp(-dt * 55);
            clink +=
              env *
              0.12 *
              (Math.sin(2 * Math.PI * 2840 * dt) +
                0.6 * Math.sin(2 * Math.PI * 4120 * dt));
          }
        }

        const edgeFade =
          Math.min(1, t / 0.15) * Math.min(1, (lengthSeconds - t) / 0.15);

        channelData[i] = (pink * chatterMod + clink) * edgeFade;
      }
    }
    return buffer;
  }, []);

  const syncCafeAudioState = useCallback(
    (shouldPlayCafe: boolean) => {
      if (typeof window === "undefined") return;

      if (!shouldPlayCafe) {
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

      if (!cafeSourceRef.current) {
        const cafeBuffer = createCafeNoiseBuffer(ctx);
        const source = ctx.createBufferSource();
        source.buffer = cafeBuffer;
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 650;
        filter.Q.value = 0.55;

        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.15;

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);

        cafeSourceRef.current = source;
        cafeGainRef.current = gainNode;
      } else if (cafeGainRef.current) {
        cafeGainRef.current.gain.setTargetAtTime(0.15, ctx.currentTime, 0.08);
      }
    },
    [createCafeNoiseBuffer]
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

  // Determine clear button label
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

      {/* Two Modifier Buttons Side-by-Side: Slow Playback (20% Penalty) | Add Background Noise (15% Bonus) */}
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
          <Coffee className="h-4 w-4 shrink-0" />
          <span>
            {cafeMode
              ? "Background Noise ON (15% Bonus)"
              : "Add Background Noise (15% Bonus)"}
          </span>
        </button>
      </div>
    </div>
  );
}
