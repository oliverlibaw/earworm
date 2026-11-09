"use client";

import React, { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Headphones,
  Layers,
  Lock,
  Play,
  Terminal,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type ArchiveDaySlot,
  type DailyDateResult,
  getAllBufferEpisodes,
  getArchiveWindowSlots,
  resolvePublicAssetUrl,
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
  dailyResultsByDate: Record<string, DailyDateResult>;
  onSelectEpisode: (episode: Episode, slotLabel?: string) => void;
  onReturnToLevelMode: () => void;
}

const AMBIENT_LABELS: Record<Episode["ambientType"], string> = {
  cafe: "☕ Café",
  street: "🚗 Street",
  market: "🛒 Market",
  transit: "🚇 Transit",
};

export function resolveEpisodeStatusBadge(params: {
  episode: Episode;
  dailyResultsByDate: Record<string, DailyDateResult>;
  episodeScoresById: Record<string, number>;
  scoreHistory: GameScoreHistoryEntry[];
}): {
  status: "completed" | "in_progress" | "unplayed";
  badgeText: string;
} {
  const { episode, dailyResultsByDate, episodeScoresById, scoreHistory } =
    params;

  const byDate = dailyResultsByDate[episode.date];
  if (byDate) {
    if (byDate.status === "completed") {
      return {
        status: "completed",
        badgeText: `✅ Completed - ${byDate.correctCount}/${byDate.totalQuestions}`,
      };
    }
    if (byDate.status === "in_progress") {
      return {
        status: "in_progress",
        badgeText: "🎧 In Progress",
      };
    }
  }

  if (typeof episodeScoresById[episode.id] === "number") {
    const totalQ = episode.questions.length || 4;
    return {
      status: "completed",
      badgeText: `✅ Completed - ${totalQ}/${totalQ}`,
    };
  }

  const matchingHistory = scoreHistory.filter(
    (h) => h.dateStr === episode.date || h.id.includes(episode.id)
  );
  if (matchingHistory.length > 0) {
    const totalQ = episode.questions.length || 4;
    return {
      status: "completed",
      badgeText: `✅ Completed - ${totalQ}/${totalQ}`,
    };
  }

  return {
    status: "unplayed",
    badgeText: "Play Now",
  };
}

/**
 * Prominent callout card rendered at the bottom of the Results screen:
 * "Want another round? Play the last 3 days:"
 */
export function ArchiveLastThreeDaysCard({
  todayStr,
  activeEpisodeId,
  scoreHistory,
  episodeScoresById,
  dailyResultsByDate,
  onSelectEpisode,
  onOpenFullDrawer,
}: {
  todayStr: string;
  activeEpisodeId: string | null;
  scoreHistory: GameScoreHistoryEntry[];
  episodeScoresById: Record<string, number>;
  dailyResultsByDate: Record<string, DailyDateResult>;
  onSelectEpisode: (episode: Episode, slotLabel?: string) => void;
  onOpenFullDrawer: () => void;
}) {
  const { playableSlots } = getArchiveWindowSlots(todayStr);

  return (
    <div className="rounded-3xl border-2 border-[#538d4e]/35 bg-[#538d4e]/[0.06] p-5 shadow-md dark:border-emerald-500/30 dark:bg-emerald-500/[0.08]">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#538d4e] text-white">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
              Want another round? Play the last 3 days:
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Today + the past 3 days are unlocked in your 3-Day Archive
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenFullDrawer}
          className="h-8 rounded-xl text-xs font-extrabold cursor-pointer"
        >
          Open Archive Drawer
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {playableSlots.map((slot) => {
          const { episode, relativeLabel, relativeDays } = slot;
          const isCurrent = activeEpisodeId === episode.id;
          const statusInfo = resolveEpisodeStatusBadge({
            episode,
            dailyResultsByDate,
            episodeScoresById,
            scoreHistory,
          });

          return (
            <button
              key={`${episode.id}_${slot.dateStr}`}
              type="button"
              onClick={() => onSelectEpisode(episode, relativeLabel)}
              className={cn(
                "flex flex-col justify-between rounded-2xl border p-3 text-left transition-all cursor-pointer",
                isCurrent
                  ? "border-[#538d4e] bg-white ring-2 ring-[#538d4e]/30 dark:bg-zinc-900"
                  : "border-zinc-200/90 bg-white/90 hover:border-[#538d4e] hover:shadow-xs dark:border-zinc-800 dark:bg-zinc-900/90"
              )}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-extrabold",
                    relativeDays === 0
                      ? "bg-[#538d4e] text-white"
                      : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  )}
                >
                  {relativeLabel}
                </span>
                <span className="font-mono text-[10px] text-zinc-400">
                  {episode.date}
                </span>
              </div>

              <div className="mt-1.5 line-clamp-1 text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                {episode.regionFlag} {episode.title}
              </div>

              <div className="mt-2 flex items-center justify-between gap-1">
                <span className="text-[10px] font-semibold text-zinc-500">
                  {episode.region} • {AMBIENT_LABELS[episode.ambientType]}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-extrabold",
                    statusInfo.status === "completed"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : statusInfo.status === "in_progress"
                        ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                        : "bg-[#538d4e]/15 text-[#538d4e] dark:text-emerald-300"
                  )}
                >
                  {statusInfo.badgeText}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ArchiveDrawer({
  open,
  onClose,
  todayStr,
  activeEpisodeId,
  scoreHistory,
  episodeScoresById,
  dailyResultsByDate,
  onSelectEpisode,
  onReturnToLevelMode,
}: ArchiveDrawerProps) {
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [manifestCount, setManifestCount] = useState<number>(
    getAllBufferEpisodes().length
  );

  // Verify / hydrate from static public/episodes/manifest.json on open
  useEffect(() => {
    if (!open) return;
    const manifestUrl = resolvePublicAssetUrl("/episodes/manifest.json");
    fetch(manifestUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setManifestCount(data.length);
        }
      })
      .catch(() => {
        // Fallback to static buffer count
      });
  }, [open]);

  if (!open) return null;

  const { playableSlots, expiredSlots } = getArchiveWindowSlots(todayStr);
  const fullBuffer: Episode[] = getAllBufferEpisodes();

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
                Archive (Last 3 Days)
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Today + past 3 days unlocked • Older days expire
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
                Active Episode:{" "}
                <span className="font-mono font-bold">{activeEpisodeId}</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  onReturnToLevelMode();
                  onClose();
                }}
                className="h-7 rounded-lg px-2.5 text-[11px] font-bold cursor-pointer"
              >
                Level Practice Mode
              </Button>
            </div>
          )}

          {/* 1. Unlocked 4 Playable Days (Today + Previous 3 Days) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Unlocked Window (Today + Last 3 Days)
              </span>
              <Badge variant="outline" className="text-[11px]">
                4 Playable Days
              </Badge>
            </div>

            <div className="space-y-2.5">
              {playableSlots.map((slot: ArchiveDaySlot) => {
                const { episode, relativeLabel, relativeDays } = slot;
                const isSelected = activeEpisodeId === episode.id;
                const statusInfo = resolveEpisodeStatusBadge({
                  episode,
                  dailyResultsByDate,
                  episodeScoresById,
                  scoreHistory,
                });

                return (
                  <div
                    key={`${episode.id}_${slot.dateStr}`}
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

                      {statusInfo.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{statusInfo.badgeText}</span>
                        </span>
                      ) : statusInfo.status === "in_progress" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                          <Headphones className="h-3 w-3" />
                          <span>{statusInfo.badgeText}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-200/80 px-2.5 py-0.5 text-[11px] font-bold text-zinc-700 group-hover:bg-[#538d4e] group-hover:text-white dark:bg-zinc-800 dark:text-zinc-300">
                          <Play className="h-2.5 w-2.5" />
                          <span>Play Now</span>
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

          {/* 2. Older Episodes Beyond the 3-Day Window (Locked / Archive Expired) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Older Episodes (Beyond 3-Day Window)
              </span>
              <span className="text-[11px] font-semibold text-zinc-400">
                Daily Habit Loop
              </span>
            </div>

            {expiredSlots.map((slot) => (
              <div
                key={`expired_${slot.dateStr}`}
                className="rounded-2xl border border-zinc-200/60 bg-zinc-100/60 p-3.5 opacity-65 select-none dark:border-zinc-800/60 dark:bg-zinc-900/35"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {slot.relativeLabel}
                    </span>
                    <span className="font-mono text-[11px] text-zinc-400">
                      {slot.dateStr}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-200/70 px-2.5 py-0.5 text-[10px] font-bold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                    <Lock className="h-2.5 w-2.5" />
                    Archive expired
                  </span>
                </div>

                <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  {slot.episode.regionFlag} {slot.episode.title}
                </div>
              </div>
            ))}
          </div>

          {/* 3. Developer / QA 14-Day Manifest Schedule Preview */}
          <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50">
            <button
              type="button"
              onClick={() => setShowFullSchedule((prev) => !prev)}
              className="flex w-full items-center justify-between gap-2 text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-500" />
                <div>
                  <div className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                    14-Day Content Buffer ({manifestCount} Indexed in
                    manifest.json)
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    QA / Preview upcoming episodes across 🇲🇽 🇪🇸 🇦🇷 🇨🇴
                  </div>
                </div>
              </div>
              {showFullSchedule ? (
                <ChevronUp className="h-4 w-4 text-zinc-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-500" />
              )}
            </button>

            {showFullSchedule && (
              <div className="mt-3 space-y-2 border-t border-zinc-200/80 pt-3 dark:border-zinc-800">
                {fullBuffer.map((ep) => {
                  const isSelected = activeEpisodeId === ep.id;
                  const statusInfo = resolveEpisodeStatusBadge({
                    episode: ep,
                    dailyResultsByDate,
                    episodeScoresById,
                    scoreHistory,
                  });
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

                      <span className="shrink-0 font-mono text-[10px] font-bold text-zinc-500">
                        {statusInfo.badgeText}
                      </span>
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
              <span>Automated CLI Pipeline</span>
            </div>
            <p className="leading-relaxed">
              Generated via{" "}
              <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[10px] dark:bg-zinc-800">
                npm run generate:episode
              </code>{" "}
              with{" "}
              <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[10px] dark:bg-zinc-800">
                ffprobe
              </code>{" "}
              per-line timestamps,{" "}
              <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[10px] dark:bg-zinc-800">
                -24dB
              </code>{" "}
              ambient mixing, and{" "}
              <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[10px] dark:bg-zinc-800">
                manifest.json
              </code>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
