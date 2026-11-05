"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  Clock,
  Copy,
  Ear,
  Eye,
  EyeOff,
  Flame,
  Loader2,
  Lock,
  Moon,
  RotateCcw,
  Share2,
  Sparkles,
  Sun,
  TrendingUp,
  Trophy,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { EarwormAudioPlayer } from "@/components/EarwormAudioPlayer";
import { InteractiveTranscript } from "@/components/InteractiveTranscript";
import {
  calculateScoreOutOf5,
  DEFAULT_ACCESS_PASSWORD,
  GameScoreHistoryEntry,
  getStaticMexicanSpanishLesson,
  gradeAnswersLocally,
  SEEDED_PREVIOUS_DAYS_VOCAB,
  VocabHistoryEntry,
} from "@/lib/staticLessons";
import { cn } from "@/lib/utils";

const LEVEL_OPTIONS = [
  {
    id: "A2",
    label: "Intro",
    subtitle: "Clear speech, everyday phrases, gentler pace",
  },
  {
    id: "B1",
    label: "Conversational",
    subtitle: "Natural speed, everyday situations & idioms",
  },
  {
    id: "B2",
    label: "Advanced",
    subtitle: "Fast street banter & heavy Mexican slang",
  },
] as const;

export type RatingTierId = "TERRIBLE" | "OK" | "GREAT" | "AMAZING";

interface RatingTierInfo {
  id: RatingTierId;
  label: string;
  rangeLabel: string;
  tagline: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  pillActiveClass: string;
  emoji: string;
}

const RATING_TIERS: RatingTierInfo[] = [
  {
    id: "TERRIBLE",
    label: "Terrible",
    rangeLabel: "0.0–1.7 / 5",
    tagline: "Tough clip! Read the transcript below or review Today's Vocab.",
    bgClass: "bg-zinc-200/80 dark:bg-zinc-800/90",
    textClass: "text-zinc-700 dark:text-zinc-300",
    borderClass: "border-zinc-400/50 dark:border-zinc-700",
    pillActiveClass: "bg-zinc-700 text-white dark:bg-zinc-600 dark:text-white",
    emoji: "⬜",
  },
  {
    id: "OK",
    label: "OK",
    rangeLabel: "1.8–3.2 / 5",
    tagline: "You caught parts of the conversation, but missed key details.",
    bgClass: "bg-amber-500/15 dark:bg-amber-500/20",
    textClass: "text-amber-800 dark:text-amber-300",
    borderClass: "border-amber-500/40",
    pillActiveClass: "bg-[#b59f3b] text-white",
    emoji: "🟨",
  },
  {
    id: "GREAT",
    label: "Great",
    rangeLabel: "3.3–4.4 / 5",
    tagline: "Sharp ear! You understood the story and most of the details.",
    bgClass: "bg-emerald-500/15 dark:bg-emerald-500/20",
    textClass: "text-emerald-800 dark:text-emerald-300",
    borderClass: "border-emerald-500/40",
    pillActiveClass: "bg-[#538d4e] text-white",
    emoji: "🟩",
  },
  {
    id: "AMAZING",
    label: "Amazing",
    rangeLabel: "4.5–5.0 / 5",
    tagline: "Native-level ear! You nailed the story, nuances, and slang.",
    bgClass: "bg-emerald-600/20 dark:bg-emerald-500/25",
    textClass: "text-emerald-900 dark:text-emerald-200",
    borderClass: "border-emerald-500",
    pillActiveClass: "bg-emerald-600 text-white ring-2 ring-emerald-400/50",
    emoji: "🌟",
  },
];

function getRatingTierFrom5(scoreOutOf5: number): RatingTierInfo {
  if (scoreOutOf5 >= 4.5) return RATING_TIERS[3]; // AMAZING
  if (scoreOutOf5 >= 3.3) return RATING_TIERS[2]; // GREAT
  if (scoreOutOf5 >= 1.8) return RATING_TIERS[1]; // OK
  return RATING_TIERS[0]; // TERRIBLE
}

function getQuestionWordleTile(score: number): {
  tile: string;
  label: "Terrible" | "OK" | "Great" | "Amazing";
  colorClass: string;
} {
  if (score >= 30) {
    return {
      tile: "🟩",
      label: "Amazing",
      colorClass: "bg-[#538d4e] text-white border-[#538d4e]",
    };
  }
  if (score >= 22) {
    return {
      tile: "🟩",
      label: "Great",
      colorClass: "bg-[#538d4e]/85 text-white border-[#538d4e]",
    };
  }
  if (score >= 12) {
    return {
      tile: "🟨",
      label: "OK",
      colorClass: "bg-[#b59f3b] text-white border-[#b59f3b]",
    };
  }
  return {
    tile: "⬜",
    label: "Terrible",
    colorClass:
      "bg-zinc-500 text-white border-zinc-500 dark:bg-zinc-700 dark:border-zinc-600",
  };
}

function NextPuzzleCountdown() {
  const [timeLeft, setTimeLeft] = useState("12:00:00");

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const diffMs = Math.max(0, tomorrow.getTime() - now.getTime());
      const hrs = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      setTimeLeft(
        `${hrs.toString().padStart(2, "0")}:${mins
          .toString()
          .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      );
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-3.5 text-center dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        <Clock className="h-3.5 w-3.5 text-[#538d4e] dark:text-emerald-400" />
        <span>Next Daily Earworm in</span>
      </div>
      <div className="mt-1 font-mono text-xl font-black tracking-wider text-zinc-900 dark:text-zinc-100">
        {timeLeft}
      </div>
    </div>
  );
}

function AutoExpandingTextarea({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(68, el.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      rows={2}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full resize-none overflow-hidden rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-[#538d4e] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#538d4e]/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500 dark:focus:bg-zinc-950 transition-colors"
    />
  );
}

interface LocalLeaderboardEntry {
  userId: string;
  deviceId: string;
  username: string;
  groupId: string;
  currentStreak: number;
  todayFinalScore: number | null;
}

function EarwormGameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const urlGroup = searchParams.get("group")?.trim() || "global";

  // Password Protection Gate state
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [passwordError, setPasswordError] = useState<boolean>(false);

  // Theme state
  const [darkMode, setDarkMode] = useState(true);

  // Wordle Screen Flow: "splash" (Landing page) vs "play" (Game page)
  const [screen, setScreen] = useState<"splash" | "play">("splash");

  // User & Level state (Defaulting to Mexican Spanish)
  const language = "Spanish";
  const [level, setLevel] = useState<string>("B1");
  const [deviceId, setDeviceId] = useState<string>("");
  const [username, setUsername] = useState<string>("Oliver");
  const [handleInput, setHandleInput] = useState<string>("Oliver");

  // Group / Leaderboard / Vocab / Score Pop-Up Modals
  const [groupId, setGroupId] = useState<string>(urlGroup);
  const [groupInput, setGroupInput] = useState<string>(
    urlGroup === "global" ? "" : urlGroup
  );
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showVocabModal, setShowVocabModal] = useState(false);
  const [showScorePopup, setShowScorePopup] = useState(false);

  // QA clip switcher (Dialog #1 or Dialog #2 per level)
  const [clipNumber, setClipNumber] = useState<number>(1);

  // Gameplay stage:
  // "round1" (First attempt) -> "round2" (2nd listen & second attempt) -> "final" (Score pop-up + post-game practice mode)
  const [stage, setStage] = useState<"round1" | "round2" | "final">("round1");
  const [playCount, setPlayCount] = useState(0);
  const [usedSlowdown, setUsedSlowdown] = useState(false);
  const [usedCafeMode, setUsedCafeMode] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({
    q1: "",
    q2: "",
    q3: "",
  });
  const [round1Scores, setRound1Scores] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Persistent Player Score History & Vocab History
  const [scoreHistory, setScoreHistory] = useState<GameScoreHistoryEntry[]>([]);
  const [vocabHistory, setVocabHistory] = useState<VocabHistoryEntry[]>([]);
  const [localScores, setLocalScores] = useState<LocalLeaderboardEntry[]>([]);

  // Official Final Grade Result (from 2nd submission)
  const [finalGradeResult, setFinalGradeResult] = useState<{
    rawScore: number;
    multiplier: number;
    finalScore: number;
    scoreOutOf5: number;
    formattedScoreOutOf5: string;
    baseScoreOutOf5: number;
    bonusesAndPenalties: Array<{
      label: string;
      effectText: string;
      type: "bonus" | "penalty" | "neutral";
    }>;
    currentStreak: number;
    playCount: number;
    usedSlowdown: boolean;
    usedCafeMode: boolean;
    feedback: Array<{
      questionId: string;
      score: number;
      explanation: string;
      missedNuance: string;
    }>;
  } | null>(null);

  // Post-Game Unscored Practice State (read transcript & try answering again)
  const [showPracticeTranscript, setShowPracticeTranscript] = useState(false);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, string>>({
    q1: "",
    q2: "",
    q3: "",
  });
  const [practiceGradeResult, setPracticeGradeResult] = useState<{
    scoreOutOf5: number;
    formattedScoreOutOf5: string;
    feedback: Array<{
      questionId: string;
      score: number;
      explanation: string;
      missedNuance: string;
    }>;
  } | null>(null);

  // Authoritative Mexican Spanish lesson for the selected (level, clipNumber)
  // Guaranteed 1-to-1 match between audio clip, dialogue transcript, vocabulary, and questions.
  const lesson = useMemo(
    () => getStaticMexicanSpanishLesson(todayStr, level, clipNumber),
    [todayStr, level, clipNumber]
  );

  // Optional Convex queries/mutations when connected locally
  const convexLesson = useQuery(api.lessons.getLessonForPuzzle, {
    dateStr: todayStr,
    language,
    level,
    isSideQuest: false,
    clipNumber,
  });

  const convexScoreboard = useQuery(api.users.getGroupScoreboard, {
    groupId,
    dateStr: todayStr,
    lessonId: convexLesson?._id,
  });

  const upsertUserMutation = useMutation(api.users.upsertUser);
  const resetUserSubmissionMutation = useMutation(
    api.users.resetUserSubmission
  );
  const submitAndGradeAction = useAction(api.grading.submitAndGrade);

  const activeLevelOption =
    LEVEL_OPTIONS.find((l) => l.id === level) ?? LEVEL_OPTIONS[1];

  // Load persistent state from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const unlocked =
      localStorage.getItem("earworm_password_unlocked") === "true";
    setIsUnlocked(unlocked);
    setAuthChecked(true);

    let storedDeviceId = localStorage.getItem("earworm_device_id");
    if (!storedDeviceId) {
      storedDeviceId =
        "ew_" +
        Math.random().toString(36).substring(2, 11) +
        "_" +
        Date.now().toString(36);
      localStorage.setItem("earworm_device_id", storedDeviceId);
    }
    setDeviceId(storedDeviceId);

    const storedHandle = localStorage.getItem("earworm_username") || "Oliver";
    const storedLevel = localStorage.getItem("earworm_level") || "B1";
    setUsername(storedHandle);
    setHandleInput(storedHandle);
    setLevel(storedLevel);

    try {
      const savedHistory = localStorage.getItem("earworm_score_history_v1");
      if (savedHistory) {
        setScoreHistory(JSON.parse(savedHistory) as GameScoreHistoryEntry[]);
      }
    } catch {
      // ignore
    }

    try {
      const savedVocab = localStorage.getItem("earworm_vocab_history_v1");
      if (savedVocab) {
        setVocabHistory(JSON.parse(savedVocab) as VocabHistoryEntry[]);
      }
    } catch {
      // ignore
    }

    try {
      const savedBoard = localStorage.getItem("earworm_local_scoreboard");
      if (savedBoard) {
        setLocalScores(JSON.parse(savedBoard) as LocalLeaderboardEntry[]);
      }
    } catch {
      // ignore
    }
  }, []);

  // Automatically record the current dialog's vocabulary into history when played/loaded
  const recordVocabForCurrentLesson = useCallback(() => {
    if (typeof window === "undefined") return;
    const entryKey = `${lesson.dateStr}:${lesson.level}:${lesson.clipNumber}`;
    const levelLabel =
      LEVEL_OPTIONS.find((l) => l.id === lesson.level)?.label ?? lesson.level;

    setVocabHistory((prev) => {
      const existingIdx = prev.findIndex((item) => item.key === entryKey);
      const newEntry: VocabHistoryEntry = {
        key: entryKey,
        dateStr: lesson.dateStr,
        levelLabel,
        dialogTitle: lesson.title,
        items: lesson.slangNotes,
      };
      const next =
        existingIdx >= 0
          ? prev.map((it, i) => (i === existingIdx ? newEntry : it))
          : [newEntry, ...prev];
      try {
        localStorage.setItem("earworm_vocab_history_v1", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [lesson]);

  useEffect(() => {
    if (screen === "play") {
      recordVocabForCurrentLesson();
    }
  }, [screen, recordVocabForCurrentLesson]);

  useEffect(() => {
    setGroupId(urlGroup);
    setGroupInput(urlGroup === "global" ? "" : urlGroup);
  }, [urlGroup]);

  useEffect(() => {
    if (!deviceId || !username) return;
    void upsertUserMutation({
      deviceId,
      username,
      groupId,
      selectedLanguage: language,
      selectedLevel: level,
    }).catch(() => {
      // Ignore in static mode
    });
  }, [deviceId, username, groupId, language, level, upsertUserMutation]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Reset local round state when switching level or dialog clip
  useEffect(() => {
    setStage("round1");
    setPlayCount(0);
    setUsedSlowdown(false);
    setUsedCafeMode(false);
    setAnswers({ q1: "", q2: "", q3: "" });
    setRound1Scores({});
    setFinalGradeResult(null);
    setShowScorePopup(false);
    setShowPracticeTranscript(false);
    setPracticeAnswers({ q1: "", q2: "", q3: "" });
    setPracticeGradeResult(null);
  }, [level, clipNumber]);

  // Compute Player Stats from scoreHistory
  const playerStats = useMemo(() => {
    const history = scoreHistory;
    if (history.length === 0) {
      return {
        streakDays: 1,
        averageScoreOutOf5: finalGradeResult?.scoreOutOf5 ?? 0,
        highScoresCount:
          (finalGradeResult?.scoreOutOf5 ?? 0) >= 4.0 ? 1 : 0,
        comparisonText: "This is your first recorded daily score!",
      };
    }

    // Calculate consecutive daily streak
    const uniqueDates = Array.from(
      new Set(history.map((h) => h.dateStr))
    ).sort();
    let streak = 1;
    for (let i = uniqueDates.length - 1; i > 0; i--) {
      const curr = new Date(uniqueDates[i] + "T00:00:00Z");
      const prev = new Date(uniqueDates[i - 1] + "T00:00:00Z");
      const diffDays = Math.round(
        (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays === 1) {
        streak++;
      } else if (diffDays > 1) {
        break;
      }
    }

    const total = history.reduce((sum, h) => sum + h.scoreOutOf5, 0);
    const avg = Number((total / history.length).toFixed(1));
    const count4Plus = history.filter((h) => h.scoreOutOf5 >= 4.0).length;

    const todayScore =
      finalGradeResult?.scoreOutOf5 ??
      history[0]?.scoreOutOf5 ??
      avg;
    const diff = Number((todayScore - avg).toFixed(1));

    let comparisonText = `Right on your ${avg.toFixed(1)} / 5 average`;
    if (history.length === 1) {
      comparisonText = `Baseline set! Your average is ${avg.toFixed(1)} / 5`;
    } else if (diff > 0.05) {
      comparisonText = `+${diff.toFixed(1)} pts above your ${avg.toFixed(1)} / 5 average`;
    } else if (diff < -0.05) {
      comparisonText = `${diff.toFixed(1)} pts below your ${avg.toFixed(1)} / 5 average`;
    }

    return {
      streakDays: Math.max(1, streak),
      averageScoreOutOf5: avg,
      highScoresCount: count4Plus,
      comparisonText,
    };
  }, [scoreHistory, finalGradeResult]);

  // Previous days / other dialogs vocabulary list for the "Review Vocab" modal
  const previousDaysVocabList = useMemo(() => {
    const currentKey = `${lesson.dateStr}:${lesson.level}:${lesson.clipNumber}`;
    const fromHistory = vocabHistory.filter((entry) => entry.key !== currentKey);
    return [...fromHistory, ...SEEDED_PREVIOUS_DAYS_VOCAB];
  }, [vocabHistory, lesson]);

  const scoreboard = useMemo(() => {
    if (convexScoreboard && convexScoreboard.length > 0) {
      return convexScoreboard;
    }
    const filtered = localScores.filter((s) => s.groupId === groupId);
    if (filtered.length > 0) {
      return [...filtered].sort(
        (a, b) => (b.todayFinalScore ?? -1) - (a.todayFinalScore ?? -1)
      );
    }
    return [];
  }, [convexScoreboard, localScores, groupId]);

  const handlePasswordUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === DEFAULT_ACCESS_PASSWORD) {
      localStorage.setItem("earworm_password_unlocked", "true");
      setIsUnlocked(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleLockApp = () => {
    localStorage.removeItem("earworm_password_unlocked");
    setPasswordInput("");
    setIsUnlocked(false);
  };

  const handleStartPlay = async () => {
    const cleanName = handleInput.trim() || username || "Oliver";
    setUsername(cleanName);
    localStorage.setItem("earworm_username", cleanName);
    localStorage.setItem("earworm_level", level);
    setScreen("play");
    if (deviceId) {
      try {
        await upsertUserMutation({
          deviceId,
          username: cleanName,
          groupId,
          selectedLanguage: "Spanish",
          selectedLevel: level,
        });
      } catch {
        // Static mode fallback
      }
    }
  };

  const handleJoinGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = handleInput.trim() || username || "Oliver";
    const nextGroup =
      groupInput
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, "") || "global";
    setUsername(cleanName);
    setGroupId(nextGroup);
    localStorage.setItem("earworm_username", cleanName);

    const params = new URLSearchParams(searchParams.toString());
    if (nextGroup === "global") {
      params.delete("group");
    } else {
      params.set("group", nextGroup);
    }
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/");

    if (deviceId) {
      try {
        await upsertUserMutation({
          deviceId,
          username: cleanName,
          groupId: nextGroup,
          selectedLanguage: "Spanish",
          selectedLevel: level,
        });
      } catch {
        // Static mode fallback
      }
    }
  };

  /**
   * First Attempt ("Submit (First Attempt)"):
   * Grades against the current dialog's questions, shows per-question score badges,
   * and unlocks the 2nd listen + Second/Final submission.
   */
  const handleRoundOneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson || !deviceId) return;

    setIsSubmitting(true);
    try {
      const userAnswers = lesson.questions.map((q) => ({
        questionId: q.id,
        answerText: answers[q.id] ?? "",
      }));

      const localRes = gradeAnswersLocally({
        lesson,
        userAnswers,
        usedSlowdown,
        usedCafeMode,
      });

      const scoreMap: Record<string, number> = {};
      for (const fb of localRes.feedback) {
        scoreMap[fb.questionId] = fb.score;
      }
      setRound1Scores(scoreMap);
      setStage("round2");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Second Attempt ("Submit (Second Attempt)" / "Final Submission"):
   * Computes the bottom-line score out of 5, records player history (streak, average, 4+ count),
   * opens the dismissible Score Pop-Up, and unlocks Post-Game Transcript & Practice Mode.
   */
  const handleFinalSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson || !deviceId) return;

    setIsSubmitting(true);
    try {
      const userAnswers = lesson.questions.map((q) => ({
        questionId: q.id,
        answerText: answers[q.id] ?? "",
      }));

      const graded = gradeAnswersLocally({
        lesson,
        userAnswers,
        usedSlowdown,
        usedCafeMode,
      });

      if (convexLesson?._id && convexLesson.title === lesson.title) {
        try {
          await submitAndGradeAction({
            deviceId,
            username: username || "Oliver",
            groupId,
            lessonId: convexLesson._id,
            userAnswers,
            playCount: Math.max(1, playCount),
            usedSlowdown,
            usedCafeMode,
            isRoundOneCheck: false,
          });
        } catch {
          // Static fallback
        }
      }

      const outOf5Info = calculateScoreOutOf5({
        rawScore: graded.rawScore,
        usedSlowdown,
        usedCafeMode,
      });

      // Save to score history in localStorage
      const newHistoryEntry: GameScoreHistoryEntry = {
        id: `${todayStr}:${level}:${clipNumber}:${Date.now()}`,
        dateStr: todayStr,
        level,
        clipNumber,
        scoreOutOf5: outOf5Info.scoreOutOf5,
        rawScore: graded.rawScore,
        finalScore: graded.finalScore,
        usedSlowdown,
        usedCafeMode,
        timestamp: Date.now(),
      };

      let nextStreak = 1;
      setScoreHistory((prev) => {
        const next = [newHistoryEntry, ...prev];
        try {
          localStorage.setItem(
            "earworm_score_history_v1",
            JSON.stringify(next)
          );
        } catch {
          // ignore
        }
        const uniqueDates = Array.from(
          new Set(next.map((h) => h.dateStr))
        ).sort();
        let s = 1;
        for (let i = uniqueDates.length - 1; i > 0; i--) {
          const c = new Date(uniqueDates[i] + "T00:00:00Z");
          const p = new Date(uniqueDates[i - 1] + "T00:00:00Z");
          const d = Math.round(
            (c.getTime() - p.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (d === 1) s++;
          else if (d > 1) break;
        }
        nextStreak = Math.max(1, s);
        return next;
      });

      recordVocabForCurrentLesson();

      // Update local group scoreboard
      const updatedEntry: LocalLeaderboardEntry = {
        userId: deviceId,
        deviceId,
        username: username || "Oliver",
        groupId,
        currentStreak: nextStreak,
        todayFinalScore: graded.finalScore,
      };
      setLocalScores((prev) => {
        const next = [
          ...prev.filter(
            (item) => !(item.deviceId === deviceId && item.groupId === groupId)
          ),
          updatedEntry,
        ];
        try {
          localStorage.setItem(
            "earworm_local_scoreboard",
            JSON.stringify(next)
          );
        } catch {
          // ignore
        }
        return next;
      });

      setFinalGradeResult({
        ...graded,
        ...outOf5Info,
        currentStreak: nextStreak,
        playCount: Math.max(1, playCount),
        usedSlowdown,
        usedCafeMode,
      });

      // Initialize practice answers with their submitted answers so they can tweak or retry
      setPracticeAnswers({ ...answers });
      setPracticeGradeResult(null);
      setStage("final");
      setShowScorePopup(true);

      if (outOf5Info.scoreOutOf5 >= 3.5) {
        try {
          void confetti({
            particleCount: 65,
            spread: 65,
            origin: { y: 0.65 },
          });
        } catch {
          // ignore
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Unscored Post-Game Practice Check:
   * Lets the user read the transcript and try answering the questions again
   * without affecting their official score or stats.
   */
  const handlePracticeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const userAnswers = lesson.questions.map((q) => ({
      questionId: q.id,
      answerText: practiceAnswers[q.id] ?? "",
    }));

    const graded = gradeAnswersLocally({
      lesson,
      userAnswers,
      usedSlowdown: false,
      usedCafeMode: false,
    });

    const outOf5Info = calculateScoreOutOf5({
      rawScore: graded.rawScore,
      usedSlowdown: false,
      usedCafeMode: false,
    });

    setPracticeGradeResult({
      scoreOutOf5: outOf5Info.scoreOutOf5,
      formattedScoreOutOf5: outOf5Info.formattedScoreOutOf5,
      feedback: graded.feedback,
    });
  };

  const handleResetAttempt = async () => {
    if (convexLesson?._id && deviceId) {
      try {
        await resetUserSubmissionMutation({
          deviceId,
          lessonId: convexLesson._id,
        });
      } catch {
        // ignore in static mode
      }
    }
    setStage("round1");
    setPlayCount(0);
    setUsedSlowdown(false);
    setUsedCafeMode(false);
    setAnswers({ q1: "", q2: "", q3: "" });
    setRound1Scores({});
    setFinalGradeResult(null);
    setShowScorePopup(false);
    setShowPracticeTranscript(false);
    setPracticeAnswers({ q1: "", q2: "", q3: "" });
    setPracticeGradeResult(null);
  };

  const handleShareScore = async () => {
    if (!finalGradeResult || !lesson) return;
    const tier = getRatingTierFrom5(finalGradeResult.scoreOutOf5);
    const tiles = finalGradeResult.feedback
      .map((f) => getQuestionWordleTile(f.score).tile)
      .join("");

    const shareText = [
      `Earworm ${lesson.dateStr} • Mexican Spanish 🇲🇽 (${activeLevelOption.label})`,
      `Score: ${finalGradeResult.formattedScoreOutOf5} / 5 ${tiles} (${tier.label})`,
      `🔥 Streak: ${playerStats.streakDays}d`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleCopyGroupInvite = async () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("group", groupId === "global" ? "amigos" : groupId);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2500);
    } catch {
      // ignore
    }
  };

  const allQuestionsAnswered =
    lesson?.questions.every((q) => (answers[q.id] ?? "").trim().length > 0) ??
    false;

  const activeRatingTier = finalGradeResult
    ? getRatingTierFrom5(finalGradeResult.scoreOutOf5)
    : null;

  if (!authChecked) {
    return null;
  }

  // =========================================================================
  // PASSWORD GATE SCREEN (Protects public GitHub Pages deployment)
  // =========================================================================
  if (!isUnlocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f8f8] px-6 py-10 text-center text-zinc-900 dark:bg-[#121213] dark:text-zinc-100">
        <div className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#538d4e] text-white shadow-md">
            <Ear className="h-8 w-8" />
          </div>

          <h1 className="font-serif text-3xl font-black tracking-tight">
            Earworm
          </h1>
          <p className="mt-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Private Preview • Enter password to play
          </p>

          <form onSubmit={handlePasswordUnlock} className="mt-6 space-y-3">
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(false);
                }}
                placeholder="Enter access password..."
                autoFocus
                className="w-full rounded-xl border border-zinc-300 bg-white py-3 pl-10 pr-4 text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:border-[#538d4e] focus:outline-none focus:ring-2 focus:ring-[#538d4e]/25 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              />
            </div>

            {passwordError && (
              <p className="text-xs font-bold text-red-500">
                Incorrect password. Please try again.
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="h-12 w-full rounded-full bg-[#538d4e] text-sm font-black text-white hover:bg-[#467a42]"
            >
              Unlock Earworm
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8] text-zinc-900 dark:bg-[#121213] dark:text-zinc-100">
      {/* =====================================================================
          BOTTOM-LINE SCORE POP-UP MODAL (Out of 5 + Bonuses/Penalties + Stats)
          Clicking anywhere outside the card dismisses the pop-up immediately.
      ===================================================================== */}
      {showScorePopup && finalGradeResult && activeRatingTier && (
        <div
          onClick={() => setShowScorePopup(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 cursor-default"
          >
            <button
              type="button"
              onClick={() => setShowScorePopup(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
              aria-label="Close score pop-up"
            >
              <X className="h-5 w-5" />
            </button>

            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Bottom-Line Score
            </span>

            {/* Score Out of 5 */}
            <div className="mt-2 flex items-baseline justify-center gap-1.5">
              <span className="font-mono text-5xl font-black tracking-tight text-[#538d4e] dark:text-emerald-400">
                {finalGradeResult.formattedScoreOutOf5}
              </span>
              <span className="font-mono text-2xl font-bold text-zinc-400 dark:text-zinc-500">
                / 5
              </span>
            </div>

            {/* Rating Badge */}
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-3.5 py-1 text-xs font-black uppercase tracking-wider dark:border-zinc-700 dark:bg-zinc-800">
              <span>{activeRatingTier.emoji}</span>
              <span>{activeRatingTier.label}</span>
            </div>

            <p className="mx-auto mt-2 max-w-xs text-xs font-medium text-zinc-600 dark:text-zinc-300">
              {activeRatingTier.tagline}
            </p>

            {/* Bonuses & Penalties Section */}
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 text-left dark:border-zinc-800 dark:bg-zinc-950/70">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Score Breakdown & Modifiers
                </span>
                <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                  Base: {finalGradeResult.baseScoreOutOf5.toFixed(1)} / 5
                </span>
              </div>
              <div className="space-y-1.5">
                {finalGradeResult.bonusesAndPenalties.map((mod) => (
                  <div
                    key={mod.label}
                    className="flex items-center justify-between rounded-xl bg-white px-3 py-1.5 text-xs font-semibold dark:bg-zinc-900"
                  >
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {mod.label}
                    </span>
                    <span
                      className={cn(
                        "font-bold",
                        mod.type === "bonus" &&
                          "text-emerald-600 dark:text-emerald-400",
                        mod.type === "penalty" &&
                          "text-amber-600 dark:text-amber-400",
                        mod.type === "neutral" && "text-zinc-500"
                      )}
                    >
                      {mod.effectText}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Player Statistics: Streak, Average Score Comparison, Times Scored 4+ */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/70">
                <Flame className="mb-1 h-4 w-4 fill-orange-500 text-orange-500" />
                <span className="font-mono text-xl font-black text-zinc-900 dark:text-white">
                  {playerStats.streakDays}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Day Streak
                </span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/70">
                <TrendingUp className="mb-1 h-4 w-4 text-[#538d4e] dark:text-emerald-400" />
                <span className="font-mono text-xl font-black text-zinc-900 dark:text-white">
                  {playerStats.averageScoreOutOf5.toFixed(1)}
                  <span className="text-xs font-normal text-zinc-400">/5</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Avg Score
                </span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/70">
                <Award className="mb-1 h-4 w-4 text-amber-500" />
                <span className="font-mono text-xl font-black text-zinc-900 dark:text-white">
                  {playerStats.highScoresCount}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Scored 4+
                </span>
              </div>
            </div>

            {/* Comparison with Average Score */}
            <div className="mt-2.5 rounded-xl bg-[#538d4e]/10 px-3 py-2 text-xs font-bold text-[#538d4e] dark:text-emerald-300">
              Today vs. Average: {playerStats.comparisonText}
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                size="lg"
                onClick={handleShareScore}
                className="flex-1 bg-[#538d4e] text-white hover:bg-[#467a42]"
              >
                {copiedShare ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    <span>Share Score</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                size="lg"
                variant="outline"
                onClick={() => setShowScorePopup(false)}
                className="flex-1"
              >
                Practice & Transcript
              </Button>
            </div>

            <p className="mt-3 text-[11px] text-zinc-400 dark:text-zinc-500">
              Click anywhere outside this pop-up to dismiss
            </p>
          </div>
        </div>
      )}

      {/* =====================================================================
          REVIEW VOCABULARY MODAL (Today's Dialog + Previous Days Played)
      ===================================================================== */}
      {showVocabModal && (
        <div
          onClick={() => setShowVocabModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 cursor-default"
          >
            <div className="mb-4 flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#538d4e]/15 text-[#538d4e] dark:text-emerald-400">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-black">
                    Review Vocabulary & Slang
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Mexican Spanish 🇲🇽 • Today&apos;s Dialog & Previous Days
                    Played
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVocabModal(false)}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* SECTION 1: TODAY'S DIALOG VOCABULARY */}
            <div className="mb-6 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#538d4e] dark:text-emerald-400">
                  Today&apos;s Dialog: {lesson.title}
                </h3>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {activeLevelOption.label}
                </span>
              </div>

              {lesson.slangNotes.map((note) => {
                // Find a dialogue line that uses this word/phrase (if any) to show Spanish + English context
                const firstWord = note.term
                  .toLowerCase()
                  .replace(/[¿?¡!]/g, "")
                  .split(/\s+/)[0];
                const matchingLine = lesson.dialogue.find((d) =>
                  d.text.toLowerCase().includes(firstWord)
                );

                return (
                  <div
                    key={note.term}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/70"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-black text-[#538d4e] dark:text-emerald-400">
                        🇲🇽 “{note.term}”
                      </span>
                      <span className="text-xs italic text-zinc-500 dark:text-zinc-400">
                        Literal: “{note.literalTranslation}”
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
                      <strong className="text-zinc-900 dark:text-white">
                        English Translation:{" "}
                      </strong>
                      {note.meaning}
                    </p>
                    {matchingLine && (
                      <div className="mt-2 rounded-xl border border-zinc-200/80 bg-white p-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-900">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                          <span className="text-zinc-400">
                            {matchingLine.speaker}:{" "}
                          </span>
                          “{matchingLine.text}”
                        </p>
                        <p className="mt-0.5 italic text-zinc-500 dark:text-zinc-400">
                          “{matchingLine.englishTranslation}”
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* SECTION 2: PREVIOUS DAYS PLAYED VOCABULARY */}
            <div className="space-y-4 border-t border-zinc-200 pt-5 dark:border-zinc-800">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Previous Days Played
              </h3>

              {previousDaysVocabList.map((entry) => (
                <div
                  key={entry.key}
                  className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/70 pb-2 dark:border-zinc-800">
                    <div>
                      <span className="text-xs font-black text-zinc-900 dark:text-white">
                        {entry.dialogTitle}
                      </span>
                      <span className="ml-2 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                        ({entry.dateStr})
                      </span>
                    </div>
                    <span className="rounded-md bg-zinc-200/70 px-2 py-0.5 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {entry.levelLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {entry.items.map((item) => (
                      <div
                        key={item.term}
                        className="rounded-xl border border-zinc-200/80 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="text-xs font-black text-[#538d4e] dark:text-emerald-400">
                            “{item.term}”
                          </span>
                          <span className="text-[10px] italic text-zinc-400">
                            Lit: “{item.literalTranslation}”
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-300">
                          <strong className="text-zinc-900 dark:text-white">
                            English:{" "}
                          </strong>
                          {item.meaning}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <Button
                type="button"
                size="lg"
                onClick={() => setShowVocabModal(false)}
                className="w-full bg-[#538d4e] text-white hover:bg-[#467a42]"
              >
                Close Vocabulary Review
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          LEADERBOARD & "JOIN GROUP" MODAL
      ===================================================================== */}
      {showLeaderboardModal && (
        <div
          onClick={() => setShowLeaderboardModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 cursor-default"
          >
            <div className="mb-4 flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-black">Leaderboard</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Group:{" "}
                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                      {groupId}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaderboardModal(false)}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Join Group & Player Name Form */}
            <form
              onSubmit={handleJoinGroupSubmit}
              className="mb-5 space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/70"
            >
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Your Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={handleInput}
                    onChange={(e) => setHandleInput(e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    placeholder="Your name (e.g., Oliver)"
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 pr-8 text-sm font-bold text-zinc-900 focus:border-[#538d4e] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                  />
                  {handleInput && (
                    <button
                      type="button"
                      onClick={() => setHandleInput("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Join Group (Room Name)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={groupInput}
                    onChange={(e) => setGroupInput(e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    placeholder="e.g., amigos"
                    className="flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 font-mono text-sm font-bold text-zinc-900 focus:border-[#538d4e] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="h-10 rounded-xl bg-[#538d4e] px-4 text-white hover:bg-[#467a42]"
                  >
                    Join Group
                  </Button>
                </div>
              </div>
            </form>

            {/* Today's Group Rankings */}
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Today&apos;s Rank
                </span>
                <button
                  type="button"
                  onClick={handleCopyGroupInvite}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#538d4e] hover:underline dark:text-emerald-400 cursor-pointer"
                >
                  {copiedInvite ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Invite Link Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Group Invite Link
                    </>
                  )}
                </button>
              </div>

              {!scoreboard || scoreboard.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  No scores in <strong>{groupId}</strong> yet today. Play to
                  take the #1 spot!
                </div>
              ) : (
                <div className="divide-y divide-zinc-200/70 dark:divide-zinc-800">
                  {scoreboard.map((row, index) => {
                    const isMe = row.deviceId === deviceId;
                    const rowOutOf5 =
                      row.todayFinalScore !== null
                        ? Number(
                            Math.min(5, (row.todayFinalScore / 100) * 5).toFixed(
                              1
                            )
                          )
                        : null;
                    return (
                      <div
                        key={row.userId}
                        className={cn(
                          "flex items-center justify-between rounded-xl px-2.5 py-3",
                          isMe && "bg-[#538d4e]/10"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-bold",
                              index === 0
                                ? "bg-amber-500 text-zinc-950"
                                : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            )}
                          >
                            {index + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-zinc-900 dark:text-white">
                                {row.username}
                              </span>
                              {isMe && (
                                <span className="rounded bg-[#538d4e]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#538d4e] dark:text-emerald-300">
                                  YOU
                                </span>
                              )}
                            </div>
                            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                              <Flame className="h-3 w-3 fill-orange-500 text-orange-500" />
                              {row.currentStreak}d streak
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          {rowOutOf5 !== null ? (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 font-mono text-xs font-bold dark:border-zinc-700">
                              <span>{rowOutOf5} / 5</span>
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-400">
                              Playing...
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SCREEN 1: WORDLE SPLASH SCREEN (Logo, App Name, Description, Level Select, Play)
      ===================================================================== */}
      {screen === "splash" && (
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10 text-center">
          {/* Top Nav Bar on Splash Screen */}
          <div className="fixed right-4 top-4 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowVocabModal(true)}
              className="h-9 rounded-full px-3 text-xs font-bold"
            >
              <BookOpen className="h-3.5 w-3.5 text-[#538d4e] dark:text-emerald-400" />
              <span>Review Vocab</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowLeaderboardModal(true)}
              className="h-9 rounded-full px-3 text-xs font-bold"
            >
              <Users className="h-3.5 w-3.5" />
              <span>
                {groupId === "global" ? "Join Group" : `Group: ${groupId}`}
              </span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowLeaderboardModal(true)}
              className="h-9 w-9 rounded-full"
              title="Leaderboard"
            >
              <Trophy className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setDarkMode((prev) => !prev)}
              className="h-9 w-9 rounded-full"
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-zinc-700" />
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleLockApp}
              className="h-9 w-9 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              title="Lock App"
            >
              <Lock className="h-4 w-4" />
            </Button>
          </div>

          {/* Earworm Logo */}
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#538d4e] text-white shadow-lg shadow-[#538d4e]/25">
            <Ear className="h-9 w-9" />
          </div>

          {/* App Name */}
          <h1 className="font-serif text-4xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
            Earworm
          </h1>

          {/* Brief Description */}
          <p className="mt-3 max-w-xs text-base font-medium leading-snug text-zinc-600 dark:text-zinc-300">
            Improve your Spanish! Listen, answer questions, compare your score
            with friends.
          </p>

          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-zinc-200/80 px-3 py-1 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <span>🇲🇽 Mexican Spanish Edition</span>
          </div>

          {/* Select Level: Intro / Conversational / Advanced */}
          <div className="mt-7 w-full space-y-2 text-left">
            <label className="block text-center text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Select Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {LEVEL_OPTIONS.map((opt) => {
                const selected = level === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLevel(opt.id)}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-2xl border-2 px-3 py-3 text-center transition-all cursor-pointer",
                      selected
                        ? "border-[#538d4e] bg-[#538d4e] text-white shadow-md"
                        : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                    )}
                  >
                    <span className="text-sm font-black">{opt.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="pt-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
              {activeLevelOption.subtitle}
            </p>
          </div>

          {/* Simple Play Button */}
          <Button
            type="button"
            size="lg"
            onClick={handleStartPlay}
            className="mt-6 h-14 w-full rounded-full bg-zinc-900 text-lg font-black tracking-wide text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Play
          </Button>

          <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
            {todayStr} • Daily Challenge
          </p>
        </div>
      )}

      {/* =====================================================================
          SCREEN 2, 3 & 4: CLEAN GAMEPLAY, POP-UP SCORE & POST-GAME PRACTICE
      ===================================================================== */}
      {screen === "play" && (
        <>
          {/* Sticky Top Navigation Bar with Review Vocab & Leaderboard */}
          <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur-md dark:border-zinc-800 dark:bg-[#121213]/95">
            <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
              {/* Left: Back to Splash / Level */}
              <button
                type="button"
                onClick={() => setScreen("splash")}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{activeLevelOption.label}</span>
              </button>

              {/* Center: EARWORM */}
              <div className="flex items-center gap-1.5">
                <Ear className="h-4 w-4 text-[#538d4e] dark:text-emerald-400" />
                <span className="font-serif text-lg font-black tracking-tight sm:text-xl">
                  EARWORM
                </span>
              </div>

              {/* Right: Review Vocab, Leaderboard & Theme Toggle */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowVocabModal(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-[#538d4e]/40 bg-[#538d4e]/10 px-2.5 py-1 text-xs font-bold text-[#538d4e] hover:bg-[#538d4e]/20 dark:text-emerald-300 cursor-pointer"
                  title="Review Slang & New Vocabulary"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Review Vocab</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLeaderboardModal(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
                  title="Join Group & Leaderboard"
                >
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Leaderboard</span>
                </button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setDarkMode((prev) => !prev)}
                  className="h-8 w-8 rounded-full"
                  aria-label="Toggle theme"
                >
                  {darkMode ? (
                    <Sun className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Moon className="h-4 w-4 text-zinc-700" />
                  )}
                </Button>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-lg px-4 pb-16 pt-5">
            {lesson && (
              <div className="space-y-5">
                {/* Dialog Header Strip: Shows current Level, Dialog Title & Quick Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#538d4e] dark:text-emerald-400">
                      <span>🇲🇽 Mexican Spanish</span>
                      <span>•</span>
                      <span>{activeLevelOption.label}</span>
                    </div>
                    <h2 className="text-sm font-black text-zinc-900 dark:text-white">
                      “{lesson.title}”
                    </h2>
                  </div>

                  {/* Quick Level Pills */}
                  <div className="flex items-center gap-1">
                    {LEVEL_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setLevel(opt.id)}
                        className={cn(
                          "rounded-lg px-2 py-1 text-[11px] font-bold transition-colors cursor-pointer",
                          level === opt.id
                            ? "bg-[#538d4e] text-white"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ===========================================================
                    ROUND 1 & ROUND 2: PLAYING THE CHALLENGE (2 ATTEMPTS)
                =========================================================== */}
                {stage !== "final" && (
                  <>
                    {/* Audio Player:
                        Play Audio
                        Slow Playback (20% Penalty) | Add Background Noise (15% Bonus)
                    */}
                    <EarwormAudioPlayer
                      audioUrl={lesson.audioUrl}
                      lessonId={String(lesson._id)}
                      playCount={playCount}
                      allowedPlays={stage === "round1" ? 1 : 2}
                      usedSlowdown={usedSlowdown}
                      usedCafeMode={usedCafeMode}
                      isPostSubmit={false}
                      onPlayStarted={() => setPlayCount((c) => c + 1)}
                      onSlowdownActivated={() => setUsedSlowdown(true)}
                      onCafeModeChange={(enabled) => setUsedCafeMode(enabled)}
                    />

                    {/* Round 2 Notice Banner (Shown after clicking "Submit (First Attempt)") */}
                    {stage === "round2" && (
                      <div className="rounded-2xl border border-[#538d4e]/40 bg-[#538d4e]/10 px-4 py-3 text-center text-xs font-bold text-zinc-800 dark:text-zinc-100">
                        First Attempt Checked! See your question scores below.
                        You can now{" "}
                        <span className="underline">listen a second time</span>{" "}
                        and revise your answers before clicking{" "}
                        <strong>Final Submission</strong>.
                      </div>
                    )}

                    {/* Questions Form (Changes dynamically for each dialog!) */}
                    <form
                      onSubmit={
                        stage === "round1"
                          ? handleRoundOneSubmit
                          : handleFinalSubmission
                      }
                      className="space-y-4"
                    >
                      {lesson.questions.map((q, idx) => {
                        const r1Score = round1Scores[q.id];
                        const hasR1Score =
                          stage === "round2" && typeof r1Score === "number";
                        const r1Tile = hasR1Score
                          ? getQuestionWordleTile(r1Score)
                          : null;

                        return (
                          <div
                            key={`${lesson._id}_${q.id}`}
                            className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                Question {idx + 1}:
                              </span>

                              {/* In Round 2 (after first Submit), show ONLY the score for each question */}
                              {hasR1Score && r1Tile && (
                                <span
                                  className={cn(
                                    "rounded-lg px-2.5 py-0.5 text-xs font-extrabold",
                                    r1Tile.colorClass
                                  )}
                                >
                                  {r1Tile.tile} Score: {r1Tile.label}
                                </span>
                              )}
                            </div>

                            <label className="block text-sm font-bold leading-snug text-zinc-900 dark:text-zinc-100">
                              {q.questionText}
                            </label>

                            <AutoExpandingTextarea
                              value={answers[q.id] ?? ""}
                              onChange={(val) =>
                                setAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: val,
                                }))
                              }
                              placeholder="Type your answer..."
                              disabled={isSubmitting}
                            />
                          </div>
                        );
                      })}

                      <Button
                        type="submit"
                        size="lg"
                        disabled={isSubmitting || !allQuestionsAnswered}
                        className="h-13 w-full rounded-2xl bg-[#538d4e] text-base font-black text-white hover:bg-[#467a42]"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Grading...
                          </>
                        ) : stage === "round1" ? (
                          "Submit (First Attempt)"
                        ) : (
                          "Final Submission"
                        )}
                      </Button>

                      {stage === "round1" && (
                        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                          You get 2 chances! After your first attempt, you can
                          listen a second time and update your answers.
                        </p>
                      )}
                    </form>
                  </>
                )}

                {/* ===========================================================
                    POST-GAME PAGE (After 2nd Submission):
                    - Official Score Banner (with button to re-open Score Pop-Up)
                    - Option to Read the Transcript of the Dialog
                    - Option to Try Answering the Questions Again (Unscored Practice)
                =========================================================== */}
                {stage === "final" && finalGradeResult && activeRatingTier && (
                  <div className="space-y-5">
                    {/* Compact Official Score Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-[#538d4e]/50 bg-[#538d4e]/10 p-5">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                          Official Daily Score
                        </span>
                        <div className="mt-0.5 flex items-baseline gap-2">
                          <span className="font-mono text-3xl font-black text-[#538d4e] dark:text-emerald-400">
                            {finalGradeResult.formattedScoreOutOf5} / 5
                          </span>
                          <span className="text-sm font-black uppercase text-zinc-800 dark:text-zinc-200">
                            {activeRatingTier.emoji} {activeRatingTier.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300">
                          🔥 {playerStats.streakDays}d streak •{" "}
                          {playerStats.comparisonText}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setShowScorePopup(true)}
                          className="bg-[#538d4e] text-white hover:bg-[#467a42]"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Score Pop-Up</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setShowVocabModal(true)}
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Review Vocab</span>
                        </Button>
                      </div>
                    </div>

                    {/* Replay Audio Player in Post-Game */}
                    <EarwormAudioPlayer
                      audioUrl={lesson.audioUrl}
                      lessonId={String(lesson._id)}
                      playCount={playCount}
                      allowedPlays={99}
                      usedSlowdown={usedSlowdown}
                      usedCafeMode={usedCafeMode}
                      isPostSubmit={true}
                      onPlayStarted={() => setPlayCount((c) => c + 1)}
                      onSlowdownActivated={() => {}}
                      onCafeModeChange={() => {}}
                    />

                    {/* OPTION 1: Read the Transcript of the Dialog */}
                    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="font-serif text-lg font-black text-zinc-900 dark:text-white">
                            Dialog Transcript
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Read the Spanish transcript and try answering the
                            questions again below.
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant={showPracticeTranscript ? "outline" : "default"}
                          size="sm"
                          onClick={() =>
                            setShowPracticeTranscript((prev) => !prev)
                          }
                          className={cn(
                            !showPracticeTranscript &&
                              "bg-[#538d4e] text-white hover:bg-[#467a42]"
                          )}
                        >
                          {showPracticeTranscript ? (
                            <>
                              <EyeOff className="h-4 w-4" />
                              <span>Hide Transcript</span>
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4" />
                              <span>Read Dialog Transcript</span>
                            </>
                          )}
                        </Button>
                      </div>

                      {showPracticeTranscript && (
                        <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                          <InteractiveTranscript
                            dialogue={lesson.dialogue}
                            slangNotes={lesson.slangNotes}
                          />
                        </div>
                      )}
                    </div>

                    {/* OPTION 2: Try Answering the Questions Again (Unscored Practice Mode) */}
                    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-serif text-lg font-black text-zinc-900 dark:text-white">
                              Try Answering Again
                            </h3>
                            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                              Unscored Practice
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            Practice with the transcript! These answers won&apos;t
                            count toward your official daily score.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setPracticeAnswers({ q1: "", q2: "", q3: "" });
                            setPracticeGradeResult(null);
                          }}
                          className="text-xs font-bold text-[#538d4e] hover:underline dark:text-emerald-400 cursor-pointer"
                        >
                          Clear Answers
                        </button>
                      </div>

                      <form onSubmit={handlePracticeSubmit} className="space-y-4">
                        {lesson.questions.map((q, idx) => {
                          const officialFb =
                            finalGradeResult.feedback.find(
                              (f) => f.questionId === q.id
                            ) ?? finalGradeResult.feedback[idx];
                          const practiceFb =
                            practiceGradeResult?.feedback.find(
                              (f) => f.questionId === q.id
                            ) ?? practiceGradeResult?.feedback[idx];

                          const activeFb = practiceFb ?? officialFb;
                          const tileInfo = getQuestionWordleTile(
                            activeFb?.score ?? 0
                          );

                          return (
                            <div
                              key={`practice_${q.id}`}
                              className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/60"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                  Question {idx + 1}:
                                </span>
                                <span
                                  className={cn(
                                    "rounded-md px-2 py-0.5 text-[11px] font-bold",
                                    tileInfo.colorClass
                                  )}
                                >
                                  {practiceFb ? "Practice: " : "Official: "}
                                  {tileInfo.label}
                                </span>
                              </div>

                              <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                {q.questionText}
                              </label>

                              <AutoExpandingTextarea
                                value={practiceAnswers[q.id] ?? ""}
                                onChange={(val) =>
                                  setPracticeAnswers((prev) => ({
                                    ...prev,
                                    [q.id]: val,
                                  }))
                                }
                                placeholder="Try answering again (unscored)..."
                              />

                              {activeFb && (
                                <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                                  {activeFb.explanation}
                                </p>
                              )}
                            </div>
                          );
                        })}

                        {practiceGradeResult && (
                          <div className="rounded-2xl border border-[#538d4e]/40 bg-[#538d4e]/10 p-3 text-center text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            Practice Check:{" "}
                            <span className="font-mono text-sm font-black text-[#538d4e] dark:text-emerald-400">
                              {practiceGradeResult.formattedScoreOutOf5} / 5
                            </span>{" "}
                            (Unscored — your official score remains{" "}
                            {finalGradeResult.formattedScoreOutOf5} / 5)
                          </div>
                        )}

                        <Button
                          type="submit"
                          size="lg"
                          className="h-12 w-full rounded-2xl bg-zinc-900 text-sm font-black text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                        >
                          Check Practice Answers (Unscored)
                        </Button>
                      </form>
                    </div>

                    <NextPuzzleCountdown />
                  </div>
                )}

                {/* Compact QA & Dialog Switcher at bottom */}
                <div className="pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200/80 bg-white/70 px-3.5 py-2.5 text-xs dark:border-zinc-800/80 dark:bg-zinc-900/60">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="font-bold text-zinc-500">
                        Switch Dialog:
                      </span>
                      {[1, 2].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setClipNumber(num)}
                          className={cn(
                            "rounded-md px-2.5 py-0.5 font-mono text-xs font-bold cursor-pointer",
                            clipNumber === num
                              ? "bg-[#538d4e] text-white"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          )}
                        >
                          Dialog #{num}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleResetAttempt}
                      className="inline-flex items-center gap-1 font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reset Attempt</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}

export default function EarwormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#121213] text-zinc-100">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <EarwormGameContent />
    </Suspense>
  );
}
