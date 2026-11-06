"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Eye,
  EyeOff,
  MessageSquareQuote,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { speakSpanishText } from "@/lib/speechAudio";
import { cn } from "@/lib/utils";

interface DialogueTurn {
  speaker: string;
  text: string;
  englishTranslation: string;
}

interface SlangNote {
  term: string;
  meaning: string;
  literalTranslation: string;
}

interface InteractiveTranscriptProps {
  dialogue: DialogueTurn[];
  slangNotes: SlangNote[];
  audioUrl?: string;
}

export function InteractiveTranscript({
  dialogue,
  slangNotes,
  audioUrl,
}: InteractiveTranscriptProps) {
  const [selectedSlang, setSelectedSlang] = useState<SlangNote | null>(
    slangNotes[0] ?? null
  );
  const [showTranslations, setShowTranslations] = useState(true);
  const [playingLineIdx, setPlayingLineIdx] = useState<number | null>(null);
  const [playingSlangTerm, setPlayingSlangTerm] = useState<string | null>(null);

  const speakers = Array.from(new Set(dialogue.map((d) => d.speaker)));

  const handlePlayLine = (text: string, idx: number) => {
    setPlayingLineIdx(idx);
    speakSpanishText(text, {
      rate: 0.92,
      fallbackAudioUrl: audioUrl,
      turnIndex: idx,
      totalTurns: dialogue.length,
      onEnd: () => setPlayingLineIdx((curr) => (curr === idx ? null : curr)),
    });
  };

  const handlePlaySlang = (term: string) => {
    setPlayingSlangTerm(term);
    speakSpanishText(term, {
      rate: 0.88,
      fallbackAudioUrl: audioUrl,
      onEnd: () =>
        setPlayingSlangTerm((curr) => (curr === term ? null : curr)),
    });
  };

  /**
   * Highlights occurrences of slangNotes terms (or significant multi-word stems)
   * inside a dialogue turn's text as clickable pills.
   */
  const renderHighlightedDialogueText = (text: string) => {
    if (!slangNotes.length) return text;

    const patterns: Array<{ matchStr: string; note: SlangNote }> = [];
    for (const note of slangNotes) {
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
        const isSelected = selectedSlang?.term === note.term;

        return (
          <>
            {before}
            <button
              type="button"
              onClick={() => {
                setSelectedSlang(note);
                handlePlaySlang(note.term);
              }}
              className={cn(
                "mx-0.5 inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-sm font-semibold transition-all cursor-pointer",
                isSelected
                  ? "border-amber-500 bg-amber-500 text-zinc-950 shadow-sm dark:bg-amber-400 dark:text-zinc-950"
                  : "border-amber-500/40 bg-amber-500/15 text-amber-800 hover:bg-amber-500/25 dark:text-amber-300"
              )}
              title={`Tap to hear & inspect slang: ${note.term}`}
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
              Tap <strong>Listen</strong> on any line or tap any highlighted
              slang word to hear it aloud
            </p>
          </div>
        </div>

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

      {/* Clickable Slang Pills Bar */}
      {slangNotes.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-3.5 dark:bg-amber-500/[0.08]">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Featured Slang & Idioms ({slangNotes.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {slangNotes.map((note) => {
              const active = selectedSlang?.term === note.term;
              return (
                <button
                  key={note.term}
                  type="button"
                  onClick={() => {
                    setSelectedSlang(note);
                    handlePlaySlang(note.term);
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
                    onClick={() => handlePlaySlang(selectedSlang.term)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold transition-colors cursor-pointer",
                      playingSlangTerm === selectedSlang.term
                        ? "border-[#538d4e] bg-[#538d4e] text-white"
                        : "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    )}
                  >
                    <Volume2 className="h-3 w-3" />
                    <span>Hear It</span>
                  </button>
                </div>
                <Badge variant="outline" className="text-[11px]">
                  Literal: “{selectedSlang.literalTranslation}”
                </Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                <strong className="text-zinc-900 dark:text-zinc-100">
                  Real Meaning:{" "}
                </strong>
                {selectedSlang.meaning}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Dialogue Lines with Line-by-Line Audio Replay */}
      <div className="space-y-3">
        {dialogue.map((turn, idx) => {
          const isFirstSpeaker = turn.speaker === speakers[0];
          const isPlayingThisLine = playingLineIdx === idx;
          return (
            <div
              key={idx}
              className={cn(
                "rounded-2xl border p-3.5 transition-colors",
                isPlayingThisLine
                  ? "border-[#538d4e] bg-[#538d4e]/10"
                  : isFirstSpeaker
                    ? "border-zinc-200/80 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-800/40"
                    : "border-indigo-500/20 bg-indigo-500/[0.04] dark:border-indigo-500/20 dark:bg-indigo-500/[0.06]"
              )}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold",
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
                </div>

                <button
                  type="button"
                  onClick={() => handlePlayLine(turn.text, idx)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer",
                    isPlayingThisLine
                      ? "border-[#538d4e] bg-[#538d4e] text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-[#538d4e] hover:text-[#538d4e] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                  )}
                >
                  <Volume2 className="h-3 w-3" />
                  <span>{isPlayingThisLine ? "Playing..." : "Listen"}</span>
                </button>
              </div>

              <p className="text-sm font-medium leading-relaxed text-zinc-900 dark:text-zinc-100">
                {renderHighlightedDialogueText(turn.text)}
              </p>

              {showTranslations && (
                <p className="mt-1.5 border-t border-zinc-200/60 pt-1.5 text-xs italic leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  {turn.englishTranslation}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
