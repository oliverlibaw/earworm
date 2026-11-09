"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Clock,
  Eye,
  EyeOff,
  MessageSquareQuote,
  Pause,
  Play,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { speakSpanishText, stopAudioSlice } from "@/lib/speechAudio";
import { cn } from "@/lib/utils";

export interface TranscriptLineItem {
  id?: number;
  speaker: string;
  gender?: "male" | "female";
  text?: string;
  spanish?: string;
  englishTranslation?: string;
  english?: string;
  startTime?: number;
  endTime?: number;
  slang?: {
    term: string;
    literalMeaning: string;
    actualMeaning: string;
    example: string;
  };
}

export interface SlangNoteItem {
  term: string;
  meaning: string;
  literalTranslation: string;
  example?: string;
}

interface InteractiveTranscriptProps {
  dialogue: TranscriptLineItem[];
  slangNotes?: SlangNoteItem[];
  audioUrl?: string;
  region?: string;
  regionFlag?: string;
}

function formatSliceTimestamp(seconds?: number): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return "";
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2).padStart(5, "0");
  return `${mins}:${secs}`;
}

function applyPreservesPitch(audio: HTMLAudioElement, rate: number): void {
  audio.playbackRate = rate;
  const extAudio = audio as HTMLAudioElement & {
    preservesPitch?: boolean;
    mozPreservesPitch?: boolean;
    webkitPreservesPitch?: boolean;
  };
  extAudio.preservesPitch = true;
  extAudio.mozPreservesPitch = true;
  extAudio.webkitPreservesPitch = true;
}

export function InteractiveTranscript({
  dialogue,
  slangNotes = [],
  audioUrl,
  region = "Mexico",
  regionFlag = "🇲🇽",
}: InteractiveTranscriptProps) {
  const [speed, setSpeed] = useState<1.0 | 0.85>(1.0);
  const [showTranslations, setShowTranslations] = useState(true);
  const [playingLineIdx, setPlayingLineIdx] = useState<number | null>(null);
  const [isPlayingFullDialogue, setIsPlayingFullDialogue] = useState(false);

  // Per-line expandable slang drawer state (keyed by line index)
  const [expandedSlangByLine, setExpandedSlangByLine] = useState<
    Record<number, {
      term: string;
      literalMeaning: string;
      actualMeaning: string;
      example: string;
    } | null>
  >(() => {
    // Auto-open the first line that has a slang callout so users see the feature immediately
    const firstIdx = dialogue.findIndex((d) => Boolean(d.slang));
    if (firstIdx !== -1 && dialogue[firstIdx].slang) {
      return { [firstIdx]: dialogue[firstIdx].slang! };
    }
    return {};
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const activeSliceEndRef = useRef<number | null>(null);

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const stopSharedAudio = useCallback(() => {
    stopRaf();
    activeSliceEndRef.current = null;
    stopAudioSlice();
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPlayingLineIdx(null);
    setIsPlayingFullDialogue(false);
  }, [stopRaf]);

  useEffect(() => {
    stopSharedAudio();
    const firstIdx = dialogue.findIndex((d) => Boolean(d.slang));
    if (firstIdx !== -1 && dialogue[firstIdx].slang) {
      setExpandedSlangByLine({ [firstIdx]: dialogue[firstIdx].slang! });
    } else {
      setExpandedSlangByLine({});
    }
  }, [audioUrl, dialogue, stopSharedAudio]);

  useEffect(() => {
    return () => {
      stopSharedAudio();
    };
  }, [stopSharedAudio]);

  // Update playbackRate + preservesPitch live whenever speed toggle changes
  const handleSpeedChange = (newSpeed: 1.0 | 0.85) => {
    setSpeed(newSpeed);
    if (audioRef.current) {
      applyPreservesPitch(audioRef.current, newSpeed);
    }
  };

  /**
   * High-frequency requestAnimationFrame loop to stop cleanly at `line.endTime`
   * without bleeding into the next speaker's line (or highlight lines during full playback).
   */
  const startRafMonitor = useCallback(() => {
    stopRaf();

    const tick = () => {
      const audio = audioRef.current;
      if (!audio || audio.paused) {
        return;
      }

      const currentTime = audio.currentTime;

      // Mode A: Single-sentence slice playback -> stop cleanly at `activeSliceEndRef.current`
      if (activeSliceEndRef.current !== null) {
        if (currentTime >= activeSliceEndRef.current - 0.015) {
          audio.pause();
          activeSliceEndRef.current = null;
          setPlayingLineIdx(null);
          stopRaf();
          return;
        }
      } else {
        // Mode B: Full dialogue playback -> highlight whichever line contains `currentTime`
        const activeIdx = dialogue.findIndex(
          (line) =>
            typeof line.startTime === "number" &&
            typeof line.endTime === "number" &&
            currentTime >= line.startTime - 0.04 &&
            currentTime <= line.endTime + 0.06
        );
        setPlayingLineIdx(activeIdx !== -1 ? activeIdx : null);
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
  }, [dialogue, stopRaf]);

  /**
   * Click-to-Play Sentence Slice:
   * Seeks the shared `<audio>` element to `line.startTime`, applies `speed` (1.0x or 0.85x)
   * with `preservesPitch = true`, and plays only until `line.endTime`.
   */
  const handlePlaySentenceSlice = (turn: TranscriptLineItem, idx: number) => {
    // If clicking the currently playing slice, pause it
    if (playingLineIdx === idx && !isPlayingFullDialogue) {
      stopSharedAudio();
      return;
    }

    const spanishText = turn.spanish || turn.text || "";
    const hasTimestamps =
      typeof turn.startTime === "number" &&
      typeof turn.endTime === "number" &&
      turn.endTime > turn.startTime;

    if (audioUrl && hasTimestamps && audioRef.current) {
      stopAudioSlice();
      setIsPlayingFullDialogue(false);
      setPlayingLineIdx(idx);

      const audio = audioRef.current;
      applyPreservesPitch(audio, speed);
      activeSliceEndRef.current = turn.endTime!;
      audio.currentTime = Math.max(0, turn.startTime!);

      void audio
        .play()
        .then(() => {
          startRafMonitor();
        })
        .catch(() => {
          // Fallback to speech synthesis if audio element fails
          speakSpanishText(spanishText, {
            rate: speed,
            onEnd: () =>
              setPlayingLineIdx((curr) => (curr === idx ? null : curr)),
          });
        });
      return;
    }

    // Fallback when timestamps are unavailable
    setIsPlayingFullDialogue(false);
    setPlayingLineIdx(idx);
    speakSpanishText(spanishText, {
      rate: speed,
      fallbackAudioUrl: audioUrl,
      startTime: turn.startTime,
      endTime: turn.endTime,
      turnIndex: idx,
      totalTurns: dialogue.length,
      onEnd: () => setPlayingLineIdx((curr) => (curr === idx ? null : curr)),
    });
  };

  /**
   * Play Full Dialogue from start to finish at the selected speed (1.0x or 0.85x)
   */
  const handleToggleFullDialogue = () => {
    if (!audioUrl || !audioRef.current) return;

    if (isPlayingFullDialogue) {
      stopSharedAudio();
      return;
    }

    stopAudioSlice();
    const audio = audioRef.current;
    activeSliceEndRef.current = null;
    applyPreservesPitch(audio, speed);
    audio.currentTime = 0;
    setIsPlayingFullDialogue(true);
    setPlayingLineIdx(0);

    void audio
      .play()
      .then(() => {
        startRafMonitor();
      })
      .catch(() => {
        setIsPlayingFullDialogue(false);
        setPlayingLineIdx(null);
      });
  };

  /**
   * Resolves the inline slang metadata for a given line (checking `turn.slang` first,
   * then matching against `slangNotes` if needed).
   */
  const resolveLineSlang = (
    turn: TranscriptLineItem
  ): {
    term: string;
    literalMeaning: string;
    actualMeaning: string;
    example: string;
  } | null => {
    if (turn.slang) {
      return turn.slang;
    }
    const text = (turn.spanish || turn.text || "").toLowerCase();
    for (const note of slangNotes) {
      const cleanTerm = note.term.replace(/\s*\(.*?\)\s*/g, "").trim();
      if (cleanTerm.length >= 3 && text.includes(cleanTerm.toLowerCase())) {
        return {
          term: cleanTerm,
          literalMeaning: note.literalTranslation,
          actualMeaning: note.meaning,
          example: note.example || turn.spanish || turn.text || "",
        };
      }
    }
    return null;
  };

  /**
   * Highlights `line.slang.term` inside the Spanish sentence as a warm amber pill.
   * Clicking the pill toggles the inline expandable slang drawer directly beneath that line.
   */
  const renderHighlightedSentence = (turn: TranscriptLineItem, lineIdx: number) => {
    const text = turn.spanish || turn.text || "";
    const slangInfo = resolveLineSlang(turn);
    if (!slangInfo) return text;

    const lowerText = text.toLowerCase();
    const lowerTerm = slangInfo.term.toLowerCase();
    const matchIdx = lowerText.indexOf(lowerTerm);
    if (matchIdx === -1) return text;

    const before = text.slice(0, matchIdx);
    const matched = text.slice(matchIdx, matchIdx + slangInfo.term.length);
    const after = text.slice(matchIdx + slangInfo.term.length);
    const isExpanded = Boolean(expandedSlangByLine[lineIdx]);

    return (
      <>
        {before}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpandedSlangByLine((prev) => ({
              ...prev,
              [lineIdx]: prev[lineIdx] ? null : slangInfo,
            }));
          }}
          className={cn(
            "mx-0.5 inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-sm font-bold underline decoration-amber-500/70 decoration-2 underline-offset-2 transition-all cursor-pointer",
            isExpanded
              ? "border-amber-500 bg-amber-500 text-zinc-950 shadow-xs dark:bg-amber-400 dark:text-zinc-950"
              : "border-amber-500/50 bg-amber-500/15 text-amber-900 hover:bg-amber-500/25 dark:text-amber-300"
          )}
          title={`Tap to inspect slang: ${slangInfo.term}`}
        >
          <Sparkles className="h-3 w-3 shrink-0" />
          <span>{matched}</span>
        </button>
        {after}
      </>
    );
  };

  const speakers = Array.from(new Set(dialogue.map((d) => d.speaker)));

  return (
    <div className="rounded-3xl border border-zinc-200/90 bg-white/95 p-5 shadow-lg shadow-zinc-950/5 dark:border-zinc-800/90 dark:bg-zinc-900/90">
      {/* Shared Hidden Audio Element for Frame-Accurate Sentence Slicing */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          onEnded={() => {
            stopRaf();
            activeSliceEndRef.current = null;
            setIsPlayingFullDialogue(false);
            setPlayingLineIdx(null);
          }}
          className="hidden"
        />
      )}

      {/* Playback Controls Header: "Play Full Dialogue" + Segmented Speed Toggle (1.0x | 0.85x) + Translation Toggle */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 pb-4 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <MessageSquareQuote className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
              Interactive Audio Transcript
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Click any sentence card to play that exact audio slice, or tap{" "}
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                highlighted slang
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Play Full Dialogue Button */}
          {audioUrl && (
            <Button
              type="button"
              variant={isPlayingFullDialogue ? "default" : "outline"}
              size="sm"
              onClick={handleToggleFullDialogue}
              className={cn(
                "h-8 rounded-xl px-3 text-xs font-extrabold cursor-pointer",
                isPlayingFullDialogue
                  ? "bg-[#538d4e] text-white hover:bg-[#467a42]"
                  : "border-[#538d4e]/40 text-[#538d4e] hover:bg-[#538d4e]/10 dark:text-emerald-400"
              )}
            >
              {isPlayingFullDialogue ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  <span>Pause Full Dialogue</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Play Full Dialogue</span>
                </>
              )}
            </Button>
          )}

          {/* Segmented Speed Toggle: 1.0x | 0.85x */}
          <div
            className="inline-flex items-center rounded-xl border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800"
            role="group"
            aria-label="Transcript Playback Speed"
          >
            {([1.0, 0.85] as const).map((rateOpt) => {
              const active = speed === rateOpt;
              return (
                <button
                  key={rateOpt}
                  type="button"
                  onClick={() => handleSpeedChange(rateOpt)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 font-mono text-xs font-extrabold transition-all cursor-pointer",
                    active
                      ? "bg-[#538d4e] text-white shadow-2xs"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  )}
                >
                  {rateOpt === 1.0 ? "1.0x" : "0.85x"}
                </button>
              );
            })}
          </div>

          {/* Show / Hide English Toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowTranslations((prev) => !prev)}
            className="h-8 rounded-xl px-2.5 text-xs cursor-pointer"
          >
            {showTranslations ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                <span>Hide English</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                <span>Show English</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Click-to-Play Sentence Cards + Inline Expandable Slang Side Quest Drawers */}
      <div className="space-y-3">
        {dialogue.map((turn, idx) => {
          const isFirstSpeaker = turn.speaker === speakers[0];
          const isPlayingThisLine = playingLineIdx === idx;
          const englishText = turn.english || turn.englishTranslation || "";
          const hasTimestamps =
            typeof turn.startTime === "number" &&
            typeof turn.endTime === "number" &&
            turn.endTime > turn.startTime;
          const expandedSlang = expandedSlangByLine[idx];

          return (
            <div key={turn.id ?? idx} className="space-y-1.5">
              {/* Sentence Card */}
              <div
                onClick={() => handlePlaySentenceSlice(turn, idx)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handlePlaySentenceSlice(turn, idx);
                  }
                }}
                className={cn(
                  "rounded-2xl border-2 p-3.5 transition-all cursor-pointer",
                  isPlayingThisLine
                    ? "border-[#538d4e] bg-[#538d4e]/10 shadow-md ring-2 ring-[#538d4e]/25 dark:border-emerald-400 dark:bg-emerald-500/10"
                    : isFirstSpeaker
                      ? "border-zinc-200/80 bg-zinc-50/80 hover:border-[#538d4e]/50 dark:border-zinc-800 dark:bg-zinc-800/40"
                      : "border-indigo-500/20 bg-indigo-500/[0.04] hover:border-indigo-500/45 dark:border-indigo-500/20 dark:bg-indigo-500/[0.06]"
                )}
              >
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-extrabold",
                        isFirstSpeaker
                          ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
                          : "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                      )}
                    >
                      {turn.speaker}
                    </span>

                    <span className="font-mono text-[11px] text-zinc-400">
                      Line #{idx + 1}
                    </span>

                    {hasTimestamps && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-200/70 px-2 py-0.5 font-mono text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        <Clock className="h-2.5 w-2.5" />
                        {formatSliceTimestamp(turn.startTime)} –{" "}
                        {formatSliceTimestamp(turn.endTime)}
                      </span>
                    )}
                  </div>

                  {/* Animated Speaker / Waveform Status Pill */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition-all",
                      isPlayingThisLine
                        ? "border-[#538d4e] bg-[#538d4e] text-white"
                        : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    )}
                  >
                    {isPlayingThisLine ? (
                      <>
                        <span className="inline-flex items-end gap-0.5 h-3">
                          <span className="w-0.5 h-2 bg-white animate-pulse rounded-full" />
                          <span className="w-0.5 h-3 bg-white animate-bounce rounded-full" />
                          <span className="w-0.5 h-1.5 bg-white animate-pulse rounded-full" />
                        </span>
                        <span>Playing ({speed}x)</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-3 w-3 text-[#538d4e] dark:text-emerald-400" />
                        <span>Play Slice</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Spanish Sentence with Highlighted Slang Substring */}
                <p className="text-sm font-medium leading-relaxed text-zinc-900 dark:text-zinc-100">
                  {renderHighlightedSentence(turn, idx)}
                </p>

                {/* Optional English Translation */}
                {showTranslations && (
                  <p className="mt-1.5 border-t border-zinc-200/60 pt-1.5 text-xs italic leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    {englishText}
                  </p>
                )}
              </div>

              {/* Inline Expandable Slang Drawer Underneath This Line */}
              {expandedSlang && (
                <div className="ml-3 rounded-2xl border border-amber-500/40 bg-amber-500/[0.08] p-3.5 text-xs shadow-xs animate-in fade-in slide-in-from-top-1 duration-150 dark:bg-amber-500/[0.12]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 text-[11px] font-black text-zinc-950">
                        <Sparkles className="h-3 w-3" />
                        Idiom
                      </span>
                      <span className="text-sm font-black text-amber-800 dark:text-amber-300">
                        “{expandedSlang.term}”
                      </span>
                      <span className="rounded-full border border-amber-500/30 bg-white/80 px-2 py-0.5 text-[11px] font-bold text-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300">
                        {regionFlag} {region}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSlangByLine((prev) => ({
                          ...prev,
                          [idx]: null,
                        }))
                      }
                      className="text-[11px] font-bold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    <div className="rounded-xl border border-amber-500/20 bg-white/90 px-3 py-2 dark:bg-zinc-900/90">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                        Literal meaning
                      </span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        “{expandedSlang.literalMeaning}”
                      </span>
                    </div>

                    <div className="rounded-xl border border-amber-500/20 bg-white/90 px-3 py-2 dark:bg-zinc-900/90">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Real meaning
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {expandedSlang.actualMeaning}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 rounded-xl border border-amber-500/20 bg-white/90 px-3 py-2 dark:bg-zinc-900/90">
                    <span className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                      Example in context
                    </span>
                    <p className="mt-0.5 italic text-zinc-800 dark:text-zinc-200">
                      “{expandedSlang.example}”
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
