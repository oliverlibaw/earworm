import { EPISODES_14_DAY_BUFFER } from "@/lib/episodesBuffer";
import type {
  StaticDialogueTurn,
  StaticLesson,
  StaticQuestion,
  StaticSlangNote,
} from "@/lib/staticLessons";
import type { Episode } from "@/types/episode";

export interface DailyDateResult {
  date: string; // YYYY-MM-DD
  episodeId: string;
  status: "completed" | "in_progress";
  correctCount: number;
  totalQuestions: number;
  scoreOutOf5: number;
  updatedAt: number;
}

export const DAILY_RESULTS_STORAGE_KEY = "earshot_daily_results_by_date";

export function getPublicBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

/**
 * Resolves the `audioUrl` of an Episode to match the current deployment's
 * `NEXT_PUBLIC_BASE_PATH` (works both at `/` in local dev and `/earworm` on GitHub Pages).
 */
export function resolveEpisodeAudioUrl(audioUrl: string): string {
  const basePath = getPublicBasePath();
  const cleanRelative = audioUrl.replace(/^\/earworm/, "");
  return `${basePath}${cleanRelative.startsWith("/") ? "" : "/"}${cleanRelative}`;
}

/**
 * Resolves any public asset path (e.g. `/episodes/manifest.json`) with Next.js `basePath`.
 */
export function resolvePublicAssetUrl(relativePath: string): string {
  const basePath = getPublicBasePath();
  const clean = relativePath.replace(/^\/earworm/, "");
  return `${basePath}${clean.startsWith("/") ? "" : "/"}${clean}`;
}

/**
 * Returns all episodes in the 14-day content buffer with basePath-resolved `audioUrl`s.
 */
export function getAllBufferEpisodes(): Episode[] {
  return EPISODES_14_DAY_BUFFER.map((ep) => ({
    ...ep,
    audioUrl: resolveEpisodeAudioUrl(ep.audioUrl),
  }));
}

export interface ArchiveDaySlot {
  relativeDays: number; // 0 = Today, -1 = Yesterday, -2 = 2 Days Ago, -3 = 3 Days Ago, <= -4 = Expired
  relativeLabel: string;
  dateStr: string;
  isLocked: boolean;
  lockReason?: string;
  episode: Episode;
}

function addDaysToDateStr(baseDateStr: string, offsetDays: number): string {
  const parts = baseDateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return baseDateStr;
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + offsetDays);
  return dt.toISOString().slice(0, 10);
}

/**
 * Returns the 4 playable days (Today + previous 3 days) plus older expired archive days
 * so the 3-Day Archive Drawer can display both the 4 unlocked days and locked ("Archive expired")
 * older days to preserve the daily habit loop.
 */
export function getArchiveWindowSlots(
  todayStr: string
): {
  playableSlots: ArchiveDaySlot[];
  expiredSlots: ArchiveDaySlot[];
} {
  const all = getAllBufferEpisodes();
  const exactTodayIdx = all.findIndex((ep) => ep.date === todayStr);
  const anchorIdx = exactTodayIdx >= 4 ? exactTodayIdx : 4; // ep-005 (2026-11-09) is index 4

  const playableOffsets = [
    { relativeDays: 0, relativeLabel: "Today" },
    { relativeDays: -1, relativeLabel: "Yesterday" },
    { relativeDays: -2, relativeLabel: "2 Days Ago" },
    { relativeDays: -3, relativeLabel: "3 Days Ago" },
  ];

  const playableSlots: ArchiveDaySlot[] = playableOffsets.map(
    ({ relativeDays, relativeLabel }) => {
      const targetDateStr = addDaysToDateStr(todayStr, relativeDays);
      const exactMatch = all.find((ep) => ep.date === targetDateStr);
      const fallbackEp =
        all[
          Math.max(0, Math.min(all.length - 1, anchorIdx + relativeDays))
        ] ?? all[0];
      const chosen = exactMatch ?? fallbackEp;

      return {
        relativeDays,
        relativeLabel,
        dateStr: targetDateStr,
        isLocked: false,
        episode: {
          ...chosen,
          date: targetDateStr,
        },
      };
    }
  );

  // Older episodes beyond the 3-day window (-4 and -5 days ago) are locked ("Archive expired")
  const expiredOffsets = [
    { relativeDays: -4, relativeLabel: "4 Days Ago" },
    { relativeDays: -5, relativeLabel: "5 Days Ago" },
  ];

  const expiredSlots: ArchiveDaySlot[] = expiredOffsets.map(
    ({ relativeDays, relativeLabel }, idx) => {
      const targetDateStr = addDaysToDateStr(todayStr, relativeDays);
      const exactMatch = all.find((ep) => ep.date === targetDateStr);
      const fallbackEp =
        all[idx] ?? all[all.length - 1 - idx] ?? all[0];
      const chosen = exactMatch ?? fallbackEp;

      return {
        relativeDays,
        relativeLabel,
        dateStr: targetDateStr,
        isLocked: true,
        lockReason: "Archive expired (older than 3 days)",
        episode: {
          ...chosen,
          date: targetDateStr,
        },
      };
    }
  );

  return { playableSlots, expiredSlots };
}

export function getThreeDayArchiveSlots(todayStr: string): ArchiveDaySlot[] {
  return getArchiveWindowSlots(todayStr).playableSlots;
}

/**
 * Converts a unified `Episode` into a `StaticLesson` so it can be played in
 * the main Earshot interface with full scoring, audio slicing, and slang review.
 */
export function episodeToStaticLesson(
  episode: Episode,
  level = "B1"
): StaticLesson {
  const resolvedAudio = resolveEpisodeAudioUrl(episode.audioUrl);

  const dialogue: StaticDialogueTurn[] = episode.dialogue.map((line) => ({
    id: line.id,
    speaker: line.speaker,
    gender: line.gender,
    text: line.spanish,
    spanish: line.spanish,
    englishTranslation: line.english,
    english: line.english,
    startTime: line.startTime,
    endTime: line.endTime,
    slang: line.slang,
  }));

  const slangNotes: StaticSlangNote[] = episode.dialogue
    .filter((l) => Boolean(l.slang))
    .map((l) => ({
      term: l.slang!.term,
      meaning: l.slang!.actualMeaning,
      literalTranslation: l.slang!.literalMeaning,
    }));

  const questions: StaticQuestion[] = episode.questions.map((q, idx) => {
    const isSlang = q.type === "slang";
    const paddedOptions: [string, string, string, string] = [
      q.options[0] ?? "Option A",
      q.options[1] ?? "Option B",
      q.options[2] ?? "Option C",
      q.options[3] ?? "Option D",
    ];
    return {
      id: q.id,
      difficultyLabel: isSlang
        ? `Q${idx + 1} • Slang Side Quest`
        : idx === 0
          ? `Q${idx + 1} • Easy (General Gist)`
          : `Q${idx + 1} • Key Detail`,
      category: isSlang
        ? "Vocab & Slang"
        : idx === 0
          ? "General Gist"
          : "Key Detail",
      questionText: q.question,
      options: paddedOptions,
      correctOptionIndex: q.correctIndex,
      explanation: q.explanation,
      idealAnswerRubric: q.options[q.correctIndex] ?? q.explanation,
    };
  });

  const ambientLabelMap: Record<Episode["ambientType"], string> = {
    cafe: "Café Ambiance ☕",
    street: "Street Traffic 🚗",
    market: "Open Market 🛒",
    transit: "Metro & Transit 🚇",
  };

  return {
    _id: `episode_${episode.id}_${episode.date}`,
    dateStr: episode.date,
    language: "Spanish",
    level,
    isSideQuest: false,
    clipNumber: episode.episodeNumber,
    dialect: `${episode.region} Spanish ${episode.regionFlag}`,
    dialectNotes: `Episode #${episode.episodeNumber} (${episode.date}) • ${episode.regionFlag} ${episode.region} • Ambient scene: ${ambientLabelMap[episode.ambientType]}.`,
    sceneSummary: `Daily regional episode set in ${episode.region} (${ambientLabelMap[episode.ambientType]}).`,
    title: episode.title,
    audioUrl: resolvedAudio,
    durationSeconds: episode.durationSeconds,
    region: episode.region,
    regionFlag: episode.regionFlag,
    ambientType: episode.ambientType,
    episodeNumber: episode.episodeNumber,
    episodeId: episode.id,
    dialogue,
    slangNotes,
    questions,
    episodeMeta: {
      ...episode,
      audioUrl: resolvedAudio,
    },
  };
}
