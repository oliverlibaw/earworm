import { EPISODES_14_DAY_BUFFER } from "@/lib/episodesBuffer";
import type {
  StaticDialogueTurn,
  StaticLesson,
  StaticQuestion,
  StaticSlangNote,
} from "@/lib/staticLessons";
import type { Episode } from "@/types/episode";

function getPublicBasePath(): string {
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
 * Returns the 14-day content buffer of episodes with basePath-resolved `audioUrl`s.
 */
export function getAllBufferEpisodes(): Episode[] {
  return EPISODES_14_DAY_BUFFER.map((ep) => ({
    ...ep,
    audioUrl: resolveEpisodeAudioUrl(ep.audioUrl),
  }));
}

export interface ArchiveDaySlot {
  relativeDays: number; // 0 = Today, -1 = Yesterday, -2 = 2 Days Ago, -3 = 3 Days Ago
  relativeLabel: string;
  dateStr: string;
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
 * Returns Today's episode + the Past 3 Days' episodes (`[0, -1, -2, -3]`) for the
 * 3-Day Archive Drawer. If `todayStr` matches an episode in the buffer (e.g. `2026-11-09`),
 * uses the exact matching dates (`2026-11-09`, `2026-11-08`, `2026-11-07`, `2026-11-06`).
 * Otherwise maps Today and the past 3 days cleanly onto `ep-004`, `ep-003`, `ep-002`, `ep-001`.
 */
export function getThreeDayArchiveSlots(todayStr: string): ArchiveDaySlot[] {
  const all = getAllBufferEpisodes();
  const exactTodayIdx = all.findIndex((ep) => ep.date === todayStr);
  const anchorIdx = exactTodayIdx >= 3 ? exactTodayIdx : 3; // ep-004 is index 3

  const offsets = [
    { relativeDays: 0, relativeLabel: "Today" },
    { relativeDays: -1, relativeLabel: "Yesterday" },
    { relativeDays: -2, relativeLabel: "2 Days Ago" },
    { relativeDays: -3, relativeLabel: "3 Days Ago" },
  ];

  return offsets.map(({ relativeDays, relativeLabel }) => {
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
      episode: {
        ...chosen,
        date: targetDateStr,
      },
    };
  });
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
      idealAnswerRubric:
        q.options[q.correctIndex] ?? q.explanation,
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
