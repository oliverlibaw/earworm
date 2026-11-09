"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Clock,
  Eye,
  EyeOff,
  MessageSquareQuote,
  Pause,
  Play,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  playAudioSlice,
  speakSpanishText,
  stopAudioSlice,
} from "@/lib/speechAudio";
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
  lineIndex?: number;
}

interface InteractiveTranscriptProps {
  dialogue: TranscriptLineItem[];
  slangNotes?: SlangNoteItem[];
  audioUrl?: string;
}

function formatSliceTimestamp(seconds?: number): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return "";
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1).padStart(4, "0");
  return `${mins}:${secs}`;
}

export function InteractiveTranscript({
  dialogue,
  slangNotes = [],
  audioUrl,
}: InteractiveTranscriptProps) {
  // Merge inline `line.slang` callouts from Episode schema with `slangNotes`
  const mergedSlangNotes: SlangNoteItem[] = React.useMemo(() => {
    const map = new Map<string, SlangNoteItem>();
    dialogue.forEach((turn, idx) => {
      if (turn.slang) {
        map.set(turn.slang.term.toLowerCase(), {
          term: turn.slang.term,
          meaning: turn.slang.actualMeaning,
          literalTranslation: turn.slang.literalMeaning,
          example: turn.slang.example,
          lineIndex: idx,
        });
      }
    });
    for (const note of slangNotes) {
      const key = note.term.toLowerCase();
      if (!map.has(key)) {
        map.set(key, note);
      }
    }
    return Array.from(map.values());
  }, [dialogue, slangNotes]);

  const [selectedSlang, setSelectedSlang] = useState<SlangNoteItem | null>(
    mergedSlangNotes[0] ?? null
  );
  const [showTranslations, setShowTranslations] = useState(true);
  const [playingLineIdx, setPlayingLineIdx] = useState<number | null>(null);
  const [playingSlangTerm, setPlayingSlangTerm] = useState<string | null>(null);
  const [isPlayingFullSequence, setIsPlayingFullSequence] = useState(false);
  const fullSequenceAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setSelectedSlang(mergedSlangNotes[0] ?? null);
    setPlayingLineIdx(null);
    setIsPlayingFullSequence(false);
    stopAudioSlice();
    if (fullSequenceAudioRef.current) {
      fullSequenceAudioRef.current.pause();
    }
  }, [audioUrl, mergedSlangNotes]);

  useEffect(() => {
    return () => {
      stopAudioSlice();
      if (fullSequenceAudioRef.current) {
        fullSequenceAudioRef.current.pause();
      }
    };
  }, []);

  const speakers = Array.from(new Set(dialogue.map((d) => d.speaker)));

  const handlePlayLine = (turn: TranscriptLineItem, idx: number) => {
    if (fullSequenceAudioRef.current) {
      fullSequenceAudioRef.current.pause();
      setIsPlayingFullSequence(false);
    }

    if (playingLineIdx === idx) {
      stopAudioSlice();
      setPlayingLineIdx(null);
      return;
    }

    const spanishText = turn.spanish || turn.text || "";
    setPlayingLineIdx(idx);

    if (
      audioUrl &&
      typeof turn.startTime === "number" &&
      typeof turn.endTime === "number" &&
      turn.endTime > turn.startTime
    ) {
      playAudioSlice(audioUrl, turn.startTime, turn.endTime, {
        onEnd: () => setPlayingLineIdx((curr) => (curr === idx ? null : curr)),
        onError: () => {
          speakSpanishText(spanishText, {
            rate: 0.92,
            onEnd: () =>
              setPlayingLineIdx((curr) => (curr === idx ? null : curr)),
          });
        },
      });
      return;
    }

    speakSpanishText(spanishText, {
      rate: 0.92,
      fallbackAudioUrl: audioUrl,
      startTime: turn.startTime,
      endTime: turn.endTime,
      turnIndex: idx,
      totalTurns: dialogue.length,
      onEnd: () => setPlayingLineIdx((curr) => (curr === idx ? null : curr)),
    });
  };

  const handleToggleFullSequence = () => {
    if (!audioUrl) return;
    stopAudioSlice();

    if (isPlayingFullSequence && fullSequenceAudioRef.current) {
      fullSequenceAudioRef.current.pause();
      setIsPlayingFullSequence(false);
      setPlayingLineIdx(null);
      return;
    }

    if (!fullSequenceAudioRef.current) {
      fullSequenceAudioRef.current = new Audio();
    }
    const audio = fullSequenceAudioRef.current;
    audio.src = audioUrl;
    audio.currentTime = 0;

    audio.ontimeupdate = () => {
      const t = audio.currentTime;
      const activeIdx = dialogue.findIndex(
        (d) =>
          typeof d.startTime === "number" &&
          typeof d.endTime === "number" &&
          t >= d.startTime - 0.05 &&
          t <= d.endTime + 0.1
      );
      if (activeIdx !== -1) {
        setPlayingLineIdx(activeIdx);
      }
    };

    audio.onended = () => {
      setIsPlayingFullSequence(false);
      setPlayingLineIdx(null);
    };

    setIsPlayingFullSequence(true);
    setPlayingLineIdx(0);
    void audio.play().catch(() => {
      setIsPlayingFullSequence(false);
      setPlayingLineIdx(null);
    });
  };

  const handlePlaySlang = (note: SlangNoteItem) => {
    setPlayingSlangTerm(note.term);
    // If this slang belongs to a specific dialogue line with timestamps, play that line's audio slice or speak the term
    speakSpanishText(note.term, {
      rate: 0.9,
      fallbackAudioUrl: audioUrl,
      onEnd: () =>
        setPlayingSlangTerm((curr) => (curr === note.term ? null : curr)),
    });
  };

  /**
   * Highlights occurrences of `turn.slang.term` or `mergedSlangNotes` terms
   * inside a dialogue line's Spanish text as clickable pills.
   */
  const renderHighlightedDialogueText = (
    text: string,
    turn: TranscriptLineItem
  ) => {
    if (!mergedSlangNotes.length && !turn.slang) return text;

    const patterns: Array<{ matchStr: string; note: SlangNoteItem }> = [];

    if (turn.slang) {
      patterns.push({
        matchStr: turn.slang.term,
        note: {
          term: turn.slang.term,
          meaning: turn.slang.actualMeaning,
          literalTranslation: turn.slang.literalMeaning,
          example: turn.slang.example,
        },
      });
    }

    for (const note of mergedSlangNotes) {
      const cleanTerm = note.term.replace(/\s*\(.*?\)\s*/g, "").trim();
      if (cleanTerm.length >= 3) {
        patterns.push({ matchStr: cleanTerm, note });
      }
      const words = cleanTerm.split(/\s+/);
      if (words.length >= 2) {
        const lastTwo = words.slice(-2).join(" ");
        if (lastTwo.length >= 5) {
          patterns.push({ matchStr: lastTwo, note });
        }
        const firstTwo = words.slice(0, 2).join(" ");
        if (firstTwo.length >= 6) {
          patterns.push({ matchStr: firstTwo, note });
        }
      }
    }

    patterns.sort((a, b) => b.matchStr.length - a.matchStr.length);

    const lowerText = text.toLowerCase();
    for (const { matchStr, note } of patterns) {
      const idx = lowerText.indexOf(matchStr.toLowerCase());
      if (idx !== -1) {
        const before = text.slice(0, idx);
        const matched = text.slice(idx, idx + matchStr.length);
        const after = text.slice(idx + matchStr.length);
        const isSelected =
          selectedSlang?.term.toLowerCase() === note.term.toLowerCase();

        return (
          <>
            {before}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSlang(note);
                handlePlaySlang(note);
              }}
              className={cn(
                "mx-0.5 inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-sm font-semibold transition-all cursor-pointer",
                isSelected
                  ? "border-amber-500 bg-amber-500 text-zinc-950 shadow-sm dark:bg-amber-400 dark:text-zinc-950"
                  : "border-amber-500/40 bg-amber-500/15 text-amber-800 hover:bg-amber-500/25 dark:text-amber-300"
              )}
              title={`Tap to inspect slang: ${note.term}`}
            >
              <Sparkles className="h-3 w-3 shrink-0" />
              <span>{matched}</span>
            </button>
            {after}
          </>
        );
      }
    }

    return text;
  };

  return (
    <div className="rounded-3xl border border-zinc-200/90 bg-white/95 p-5 shadow-lg shadow-zinc-950/5 dark:border-zinc-800/90 dark:bg-zinc-900/90">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <MessageSquareQuote className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Interactive Audio Transcript
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Tap any line to play its exact audio slice, or tap highlighted
              slang to inspect
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {audioUrl && (
            <Button
              type="button"
              variant={isPlayingFullSequence ? "default" : "outline"}
              size="sm"
              onClick={handleToggleFullSequence}
              className={cn(
                "rounded-xl text-xs font-bold",
                isPlayingFullSequence &&
                  "bg-[#538d4e] text-white hover:bg-[#467a42]"
              )}
            >
              {isPlayingFullSequence ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  Stop Sequence
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Play Full Transcript
                </>
              )}
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowTranslations((prev) => !prev)}
            className="rounded-xl text-xs"
          >
            {showTranslations ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                Hide English
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                Show English
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Clickable Slang Pills Bar */}
      {mergedSlangNotes.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-3.5 dark:bg-amber-500/[0.08]">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Featured Slang & Idioms ({mergedSlangNotes.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {mergedSlangNotes.map((note) => {
              const active =
                selectedSlang?.term.toLowerCase() === note.term.toLowerCase();
              return (
                <button
                  key={note.term}
                  type="button"
                  onClick={() => {
                    setSelectedSlang(note);
                    handlePlaySlang(note);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
                    active
                      ? "border-amber-500 bg-amber-500 text-zinc-950 shadow-sm dark:bg-amber-400 dark:text-zinc-950"
                      : "border-zinc-200 bg-white/90 text-zinc-800 hover:border-amber-500/50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  )}
                >
                  <Volume2 className="h-3 w-3 text-amber-500 dark:text-current" />
                  {note.term}
                </button>
              );
            })}
          </div>

          {/* Active Slang Inspector Card */}
          {selectedSlang && (
            <div className="mt-3 rounded-xl border border-amber-500/30 bg-white/95 p-3 shadow-sm dark:bg-zinc-900/95">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    “{selectedSlang.term}”
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePlaySlang(selectedSlang)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold transition-colors cursor-pointer",
                      playingSlangTerm === selectedSlang.term
                        ? "border-[#538d4e] bg-[#538d4e] text-white"
                        : "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    )}
                  >
                    <Volume2 className="h-3 w-3" />
                    <span>Hear Word</span>
                  </button>
                  {typeof selectedSlang.lineIndex === "number" &&
                    dialogue[selectedSlang.lineIndex] && (
                      <button
                        type="button"
                        onClick={() =>
                          handlePlayLine(
                            dialogue[selectedSlang.lineIndex!],
                            selectedSlang.lineIndex!
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300 cursor-pointer"
                      >
                        <Play className="h-2.5 w-2.5" />
                        <span>Hear in Line #{selectedSlang.lineIndex + 1}</span>
                      </button>
                    )}
                </div>
                <Badge variant="outline" className="text-[11px]">
                  Literal: “{selectedSlang.literalTranslation}”
                </Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                <strong className="text-zinc-900 dark:text-zinc-100">
                  Actual Meaning:{" "}
                </strong>
                {selectedSlang.meaning}
              </p>
              {selectedSlang.example && (
                <p className="mt-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs italic text-amber-900 dark:text-amber-200">
                  <strong className="not-italic font-semibold">Example: </strong>
                  “{selectedSlang.example}”
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dialogue Lines with Exact Start/End Timestamp Slicing */}
      <div className="space-y-3">
        {dialogue.map((turn, idx) => {
          const isFirstSpeaker = turn.speaker === speakers[0];
          const isPlayingThisLine = playingLineIdx === idx;
          const spanishText = turn.spanish || turn.text || "";
          const englishText = turn.english || turn.englishTranslation || "";
          const hasTimestamps =
            typeof turn.startTime === "number" &&
            typeof turn.endTime === "number" &&
            turn.endTime > turn.startTime;

          return (
            <div
              key={turn.id ?? idx}
              onClick={() => handlePlayLine(turn, idx)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handlePlayLine(turn, idx);
                }
              }}
              className={cn(
                "rounded-2xl border p-3.5 transition-all cursor-pointer",
                isPlayingThisLine
                  ? "border-[#538d4e] bg-[#538d4e]/10 ring-1 ring-[#538d4e]/40 shadow-sm"
                  : isFirstSpeaker
                    ? "border-zinc-200/80 bg-zinc-50/80 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-800/40"
                    : "border-indigo-500/20 bg-indigo-500/[0.04] hover:border-indigo-500/40 dark:border-indigo-500/20 dark:bg-indigo-500/[0.06]"
              )}
            >
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold",
                      isFirstSpeaker
                        ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
                        : "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                    )}
                  >
                    {turn.speaker}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
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

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayLine(turn, idx);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer",
                    isPlayingThisLine
                      ? "border-[#538d4e] bg-[#538d4e] text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-[#538d4e] hover:text-[#538d4e] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                  )}
                >
                  <Volume2 className="h-3 w-3" />
                  <span>
                    {isPlayingThisLine ? "Playing Slice..." : "Listen Slice"}
                  </span>
                </button>
              </div>

              <p className="text-sm font-medium leading-relaxed text-zinc-900 dark:text-zinc-100">
                {renderHighlightedDialogueText(spanishText, turn)}
              </p>

              {showTranslations && (
                <p className="mt-1.5 border-t border-zinc-200/60 pt-1.5 text-xs italic leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  {englishText}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
