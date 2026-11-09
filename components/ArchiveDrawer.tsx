"use client";

import React, { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  Play,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type ArchiveDaySlot,
  getAllBufferEpisodes,
  getThreeDayArchiveSlots,
} from "@/lib/episodeHelpers";
import type { GameScoreHistoryEntry } from "@/lib/staticLessons";
import { cn } from "@/lib/utils";
import type { Episode } from "@/types/episode";

interface ArchiveDrawerProps {
  open: boolean;
  onClose: () => void;
  todayStr: string;
  activeEpisodeId: string | null;
  scoreHistory: GameScoreHistoryEntry[];
  episodeScoresById: Record<string, number>;
  onSelectEpisode: (episode: Episode, slotLabel?: string) => void;
  onReturnToLevelMode: () => void;
}

const AMBIENT_LABELS: Record<Episode["ambientType"], string> = {
  cafe: "☕ Café",
  street: "🚗 Street",
  market: "🛒 Market",
  transit: "🚇 Transit",
};

export function ArchiveDrawer({
  open,
  onClose,
  todayStr,
  activeEpisodeId,
  scoreHistory,
  episodeScoresById,
  onSelectEpisode,
  onReturnToLevelMode,
}: ArchiveDrawerProps) {
  const [showFullBuffer, setShowFullBuffer] = useState(false);

  if (!open) return null;

  const archiveSlots: ArchiveDaySlot[] = getThreeDayArchiveSlots(todayStr);
  const fullBuffer: Episode[] = getAllBufferEpisodes();

  const getScoreForEpisode = (ep: Episode): number | null => {
    if (typeof episodeScoresById[ep.id] === "number") {
      return episodeScoresById[ep.id];
    }
    const matchingHistory = scoreHistory.filter(
      (h) => h.dateStr === ep.date || h.id.includes(ep.id)
    );
    if (matchingHistory.length > 0) {
      return Math.max(...matchingHistory.map((h) => h.scoreOutOf5));
    }
    return null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full max-w-md flex-col overflow-hidden border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#538d4e]/15 text-[#538d4e]">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                3-Day Episode Archive
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Catch up on the past 3 days or explore the 14-day buffer
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
            aria-label="Close Archive Drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Active Mode Switcher Banner */}
          {activeEpisodeId && (
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs">
              <div className="font-semibold text-amber-900 dark:text-amber-200">
                Playing Archive Episode{" "}
                <span className="font-mono font-bold">({activeEpisodeId})</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  onReturnToLevelMode();
                  onClose();
                }}
                className="h-7 rounded-lg px-2.5 text-[11px] font-bold"
              >
                Back to Level Dialogs
              </Button>
            </div>
          )}

          {/* 3-Day Archive Section (Today + Past 3 Days) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Today & Past 3 Days
              </span>
              <Badge variant="outline" className="text-[11px]">
                4 Regional Episodes
              </Badge>
            </div>

            <div className="space-y-2.5">
              {archiveSlots.map((slot) => {
                const { episode, relativeLabel, relativeDays } = slot;
                const isSelected = activeEpisodeId === episode.id;
                const bestScore = getScoreForEpisode(episode);
                const isCompleted = bestScore !== null;

                return (
                  <div
                    key={episode.id}
                    onClick={() => {
                      onSelectEpisode(episode, relativeLabel);
                      onClose();
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectEpisode(episode, relativeLabel);
                        onClose();
                      }
                    }}
                    className={cn(
                      "group rounded-2xl border p-3.5 transition-all cursor-pointer",
                      isSelected
                        ? "border-[#538d4e] bg-[#538d4e]/10 ring-1 ring-[#538d4e]/40"
                        : "border-zinc-200/90 bg-zinc-50/70 hover:border-[#538d4e]/50 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:bg-zinc-900"
                    )}
                  >
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[11px] font-extrabold",
                            relativeDays === 0
                              ? "bg-[#538d4e] text-white"
                              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          )}
                        >
                          {relativeLabel}
                        </span>
                        <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                          {episode.date}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-zinc-400">
                          #{episode.episodeNumber}
                        </span>
                      </div>

                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          {bestScore}/5
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-700 group-hover:bg-[#538d4e] group-hover:text-white dark:bg-zinc-800 dark:text-zinc-300">
                          <Play className="h-2.5 w-2.5" />
                          Play
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {episode.title}
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-semibold dark:border-zinc-700 dark:bg-zinc-800">
                        <span>{episode.regionFlag}</span>
                        <span>{episode.region}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-0.5 dark:border-zinc-700 dark:bg-zinc-800">
                        {AMBIENT_LABELS[episode.ambientType]}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-500">
                        <Clock className="h-3 w-3" />
                        {Math.round(episode.durationSeconds)}s •{" "}
                        {episode.dialogue.length} lines
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 14-Day Content Buffer Explorer */}
          <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50">
            <button
              type="button"
              onClick={() => setShowFullBuffer((prev) => !prev)}
              className="flex w-full items-center justify-between gap-2 text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-500" />
                <div>
                  <div className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                    14-Day Content Buffer ({fullBuffer.length} Episodes)
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Pre-generated multi-region episodes (🇲🇽 🇪🇸 🇦🇷 🇨🇴)
                  </div>
                </div>
              </div>
              {showFullBuffer ? (
                <ChevronUp className="h-4 w-4 text-zinc-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-500" />
              )}
            </button>

            {showFullBuffer && (
              <div className="mt-3 space-y-2 border-t border-zinc-200/80 pt-3 dark:border-zinc-800">
                {fullBuffer.map((ep) => {
                  const isSelected = activeEpisodeId === ep.id;
                  const score = getScoreForEpisode(ep);
                  return (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() => {
                        onSelectEpisode(
                          ep,
                          `Episode #${ep.episodeNumber} (${ep.date})`
                        );
                        onClose();
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-all cursor-pointer",
                        isSelected
                          ? "border-[#538d4e] bg-[#538d4e]/10 font-bold"
                          : "border-zinc-200/80 bg-white hover:border-[#538d4e]/50 dark:border-zinc-800 dark:bg-zinc-900"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-500">
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">
                            {ep.id}
                          </span>
                          <span>•</span>
                          <span>{ep.date}</span>
                          <span>•</span>
                          <span>
                            {ep.regionFlag} {ep.region}
                          </span>
                        </div>
                        <div className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                          {ep.title}
                        </div>
                      </div>

                      {score !== null ? (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-emerald-500/40 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-300"
                        >
                          {score}/5
                        </Badge>
                      ) : (
                        <Play className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* CLI Pipeline Info Note */}
          <div className="rounded-2xl border border-zinc-200/80 bg-zinc-100/70 p-3 text-[11px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
            <div className="mb-1 flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
              <Terminal className="h-3.5 w-3.5 text-[#538d4e]" />
              <span>Automated Episode CLI Pipeline</span>
            </div>
            <p className="leading-relaxed">
              Each episode in{" "}
              <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[10px] dark:bg-zinc-800">
                public/episodes/*.json
              </code>{" "}
              is assembled via{" "}
              <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[10px] dark:bg-zinc-800">
                npm run generate:episode
              </code>{" "}
              with frame-accurate{" "}
              <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[10px] dark:bg-zinc-800">
                startTime
              </code>{" "}
              /{" "}
              <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[10px] dark:bg-zinc-800">
                endTime
              </code>{" "}
              audio slicing and a final{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">
                Slang Side Quest
              </strong>{" "}
              question.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
