"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
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
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Ear,
  Eye,
  EyeOff,
  Flame,
  Info,
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
  Volume2,
  Wrench,
  X,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { EarwormAudioPlayer } from "@/components/EarwormAudioPlayer";
import { InteractiveTranscript } from "@/components/InteractiveTranscript";
import { speakSpanishText } from "@/lib/speechAudio";
import {
  buildAudioVocabQuizQuestions,
  calculateScoreOutOf5,
  DEFAULT_ACCESS_PASSWORD,
  GameScoreHistoryEntry,
  getStaticMexicanSpanishLesson,
  getVocabStarInfo,
  getVocabStarInfoByTier,
  gradeMultipleChoiceLocally,
  SEEDED_PREVIOUS_DAYS_VOCAB,
  SIMULATED_GROUP_FRIENDS,
  VocabHistoryEntry,
  VocabStarTier,
} from "@/lib/staticLessons";
import { cn } from "@/lib/utils";

const LEVEL_OPTIONS = [
  {
    id: "A2",
    label: "Intro",
    subtitle: "Clear speech, everyday phrases, gentler pace",
    cueBadge: "🌱 Intro Pace",
    cueDesc: "Clear articulation • Everyday vocabulary",
    tempoBars: 1,
    frameBorderClass:
      "border-sky-500/35 dark:border-sky-500/30 shadow-sky-500/5",
    topStripClass: "from-sky-500 via-teal-400 to-emerald-400",
    pillBadgeClass:
      "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    barActiveClass: "bg-sky-500 dark:bg-sky-400",
    glowBgClass:
      "bg-gradient-to-b from-sky-500/[0.05] via-transparent to-transparent",
  },
  {
    id: "B1",
    label: "Conversational",
    subtitle: "Natural speed, everyday situations & idioms",
    cueBadge: "💬 Conversational Pace",
    cueDesc: "Natural speed • Everyday Mexican idioms",
    tempoBars: 2,
    frameBorderClass:
      "border-emerald-500/35 dark:border-emerald-500/30 shadow-emerald-500/5",
    topStripClass: "from-[#538d4e] via-emerald-500 to-amber-400",
    pillBadgeClass:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
    barActiveClass: "bg-emerald-500 dark:bg-emerald-400",
    glowBgClass:
      "bg-gradient-to-b from-emerald-500/[0.05] via-transparent to-transparent",
  },
  {
    id: "B2",
    label: "Advanced",
    subtitle: "Fast street banter & heavy Mexican slang",
    cueBadge: "🌶️ Advanced Street Pace",
    cueDesc: "Rapid-fire banter • Heavy CDMX slang",
    tempoBars: 3,
    frameBorderClass:
      "border-rose-500/35 dark:border-rose-500/30 shadow-rose-500/5",
    topStripClass: "from-amber-500 via-orange-500 to-rose-500",
    pillBadgeClass:
      "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    barActiveClass: "bg-rose-500 dark:bg-rose-400",
    glowBgClass:
      "bg-gradient-to-b from-rose-500/[0.06] via-transparent to-transparent",
  },
] as const;

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

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
    rangeLabel: "3.3–4.6 / 5",
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
    rangeLabel: "4.7–6.0 / 5",
    tagline: "Native-level ear! You nailed the story, nuances, and slang.",
    bgClass: "bg-emerald-600/20 dark:bg-emerald-500/25",
    textClass: "text-emerald-900 dark:text-emerald-200",
    borderClass: "border-emerald-500",
    pillActiveClass: "bg-emerald-600 text-white ring-2 ring-emerald-400/50",
    emoji: "🌟",
  },
];

function getRatingTierFrom5(scoreOutOf5: number): RatingTierInfo {
  if (scoreOutOf5 >= 4.7) return RATING_TIERS[3]; // AMAZING
  if (scoreOutOf5 >= 3.3) return RATING_TIERS[2]; // GREAT
  if (scoreOutOf5 >= 1.8) return RATING_TIERS[1]; // OK
  return RATING_TIERS[0]; // TERRIBLE
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
        <span>Next Daily Earshot in</span>
      </div>
      <div className="mt-1 font-mono text-xl font-black tracking-wider text-zinc-900 dark:text-zinc-100">
        {timeLeft}
      </div>
    </div>
  );
}

interface LocalLeaderboardEntry {
  userId: string;
  deviceId: string;
  username: string;
  groupId: string;
  currentStreak: number;
  todayFinalScore: number | null;
  vocabStar?: VocabStarTier;
}

function EarshotGameContent() {
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

  // Modals: Leaderboard, Vocab Review (Audio Quiz + Study Vault), Score Pop-Up, MVP Debug Info Pop-Up
  const [groupId, setGroupId] = useState<string>(urlGroup);
  const [groupInput, setGroupInput] = useState<string>(
    urlGroup === "global" ? "" : urlGroup
  );
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showVocabModal, setShowVocabModal] = useState(false);
  const [vocabModalTab, setVocabModalTab] = useState<"quiz" | "vault">("quiz");
  const [showScorePopup, setShowScorePopup] = useState(false);
  const [showMvpDebugModal, setShowMvpDebugModal] = useState(false);
  const [showDemoFriends, setShowDemoFriends] = useState(true);

  // QA clip switcher (Dialog #1 or Dialog #2 per level)
  const [clipNumber, setClipNumber] = useState<number>(1);

  // Gameplay stage:
  // "round1" (First attempt) -> "round2" (2nd listen & retake missed questions) -> "final" (Score pop-up + post-game practice mode)
  const [stage, setStage] = useState<"round1" | "round2" | "final">("round1");
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [playCount, setPlayCount] = useState(0);
  const [usedSlowdown, setUsedSlowdown] = useState(false);
  const [usedCafeMode, setUsedCafeMode] = useState(false);

  // Selected multiple-choice option index (0..3) per question ("q1".."q5")
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, number | undefined>
  >({});
  // First attempt results (boolean correct/incorrect per question)
  const [round1CorrectMap, setRound1CorrectMap] = useState<
    Record<string, boolean>
  >({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Persistent Player Score History, Vocab History & Vocab Star
  const [scoreHistory, setScoreHistory] = useState<GameScoreHistoryEntry[]>([]);
  const [vocabHistory, setVocabHistory] = useState<VocabHistoryEntry[]>([]);
  const [localScores, setLocalScores] = useState<LocalLeaderboardEntry[]>([]);

  // Audio Vocab Review Quiz State (Earns Gold / Silver / Bronze Star)
  const [vocabQuizAnswers, setVocabQuizAnswers] = useState<
    Record<string, number | undefined>
  >({});
  const [vocabQuizSubmitted, setVocabQuizSubmitted] = useState(false);
  const [vocabQuizCorrectCount, setVocabQuizCorrectCount] = useState(0);
  const [todayVocabStar, setTodayVocabStar] = useState<VocabStarTier>("none");
  const [playingVocabId, setPlayingVocabId] = useState<string | null>(null);
  const [revealedSpanishTerms, setRevealedSpanishTerms] = useState<
    Record<string, boolean>
  >({});

  // Official Final Grade Result (from 1st-try sweep or 2nd submission)
  const [finalGradeResult, setFinalGradeResult] = useState<{
    rawScore: number;
    correctCount: number;
    firstTryCorrectCount: number;
    secondTryCorrectCount: number;
    usedSecondAttempt: boolean;
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
      isCorrect: boolean;
      wasFirstTryCorrect: boolean;
      selectedOptionIndex: number;
      correctOptionIndex: number;
      score: number;
      explanation: string;
      missedNuance: string;
    }>;
  } | null>(null);

  // Post-Game Unscored Practice State (read transcript & try answering again)
  const [showPracticeTranscript, setShowPracticeTranscript] = useState(false);
  const [practiceOptions, setPracticeOptions] = useState<
    Record<string, number | undefined>
  >({});
  const [practiceGradeResult, setPracticeGradeResult] = useState<{
    correctCount: number;
    scoreOutOf5: number;
    formattedScoreOutOf5: string;
    feedback: Array<{
      questionId: string;
      isCorrect: boolean;
      wasFirstTryCorrect: boolean;
      selectedOptionIndex: number;
      correctOptionIndex: number;
      score: number;
      explanation: string;
      missedNuance: string;
    }>;
  } | null>(null);

  // Authoritative Mexican Spanish lesson for the selected (level, clipNumber)
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
    const storedStar =
      (localStorage.getItem(
        `earworm_vocab_star_${todayStr}`
      ) as VocabStarTier | null) || "none";
    setUsername(storedHandle);
    setHandleInput(storedHandle);
    setLevel(storedLevel);
    setTodayVocabStar(storedStar);

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
  }, [todayStr]);

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
    setCurrentQuestionIdx(0);
    setPlayCount(0);
    setUsedSlowdown(false);
    setUsedCafeMode(false);
    setSelectedOptions({});
    setRound1CorrectMap({});
    setFinalGradeResult(null);
    setShowScorePopup(false);
    setShowPracticeTranscript(false);
    setPracticeOptions({});
    setPracticeGradeResult(null);
    setVocabQuizAnswers({});
    setVocabQuizSubmitted(false);
    setRevealedSpanishTerms({});
  }, [level, clipNumber]);

  // Previous days / other dialogs vocabulary list for the "Review Vocab" modal
  const previousDaysVocabList = useMemo(() => {
    const currentKey = `${lesson.dateStr}:${lesson.level}:${lesson.clipNumber}`;
    const fromHistory = vocabHistory.filter(
      (entry) => entry.key !== currentKey
    );
    return [...fromHistory, ...SEEDED_PREVIOUS_DAYS_VOCAB];
  }, [vocabHistory, lesson]);

  // 5-question Audio Vocabulary Quiz combining Today's Dialog + Previous Days
  const audioVocabQuizQuestions = useMemo(
    () => buildAudioVocabQuizQuestions(lesson, previousDaysVocabList),
    [lesson, previousDaysVocabList]
  );

  // Compute Player Stats from scoreHistory
  const playerStats = useMemo(() => {
    const history = scoreHistory;
    if (history.length === 0) {
      return {
        streakDays: 1,
        averageScoreOutOf5: finalGradeResult?.scoreOutOf5 ?? 0,
        highScoresCount: (finalGradeResult?.scoreOutOf5 ?? 0) >= 4.0 ? 1 : 0,
        comparisonText: "This is your first recorded daily score!",
      };
    }

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
      finalGradeResult?.scoreOutOf5 ?? history[0]?.scoreOutOf5 ?? avg;
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

  // Combined Friend Leaderboard (Player + Simulated Demo Friends when enabled)
  const combinedLeaderboard = useMemo(() => {
    const myScoreOutOf5 =
      finalGradeResult?.scoreOutOf5 ??
      scoreHistory[0]?.scoreOutOf5 ??
      null;

    const myEntry = {
      userId: deviceId || "me",
      deviceId: deviceId || "me",
      username: username || "Oliver",
      currentStreak: playerStats.streakDays,
      scoreOutOf5: myScoreOutOf5,
      vocabStar: todayVocabStar,
      isDemo: false,
    };

    const extraLocal = localScores
      .filter((s) => s.groupId === groupId && s.deviceId !== deviceId)
      .map((s) => ({
        userId: s.userId,
        deviceId: s.deviceId,
        username: s.username,
        currentStreak: s.currentStreak,
        scoreOutOf5:
          s.todayFinalScore !== null
            ? Number(Math.min(6, (s.todayFinalScore / 100) * 5).toFixed(1))
            : null,
        vocabStar: s.vocabStar ?? ("none" as VocabStarTier),
        isDemo: false,
      }));

    const demoEntries = showDemoFriends
      ? SIMULATED_GROUP_FRIENDS.map((f) => ({
          ...f,
          isDemo: true,
        }))
      : [];

    const all = [myEntry, ...extraLocal, ...demoEntries];
    const starWeight: Record<VocabStarTier, number> = {
      gold: 3,
      silver: 2,
      bronze: 1,
      none: 0,
    };

    return all.sort((a, b) => {
      const scoreDiff = (b.scoreOutOf5 ?? -1) - (a.scoreOutOf5 ?? -1);
      if (Math.abs(scoreDiff) > 0.01) return scoreDiff;
      return starWeight[b.vocabStar] - starWeight[a.vocabStar];
    });
  }, [
    finalGradeResult,
    scoreHistory,
    deviceId,
    username,
    playerStats.streakDays,
    todayVocabStar,
    localScores,
    groupId,
    showDemoFriends,
  ]);

  const activeStarInfo = useMemo(
    () => getVocabStarInfoByTier(todayVocabStar),
    [todayVocabStar]
  );

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
   * Shared helper to finalize the player's official score (called either immediately
   * when getting 5/5 on the first attempt, or after submitting the 2nd attempt).
   */
  const finalizeOfficialSubmission = async (params: {
    graded: ReturnType<typeof gradeMultipleChoiceLocally>;
    usedSecondAttempt: boolean;
    finalSelections: Record<string, number | undefined>;
  }) => {
    const { graded, usedSecondAttempt, finalSelections } = params;

    if (convexLesson?._id && convexLesson.title === lesson.title && deviceId) {
      try {
        const userAnswers = lesson.questions.map((q) => {
          const idx = finalSelections[q.id];
          return {
            questionId: q.id,
            answerText: idx !== undefined ? (q.options[idx] ?? "") : "",
          };
        });
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
      usedSecondAttempt,
      usedSecondListen: playCount >= 2 || usedSecondAttempt,
      firstTryCorrectCount: graded.firstTryCorrectCount,
      secondTryCorrectCount: graded.secondTryCorrectCount,
    });

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
      vocabStar: todayVocabStar,
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

    if (deviceId) {
      const updatedEntry: LocalLeaderboardEntry = {
        userId: deviceId,
        deviceId,
        username: username || "Oliver",
        groupId,
        currentStreak: nextStreak,
        todayFinalScore: graded.finalScore,
        vocabStar: todayVocabStar,
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
    }

    setFinalGradeResult({
      ...graded,
      ...outOf5Info,
      usedSecondAttempt,
      currentStreak: nextStreak,
      playCount: Math.max(1, playCount),
      usedSlowdown,
      usedCafeMode,
    });

    setPracticeOptions({ ...finalSelections });
    setPracticeGradeResult(null);
    setStage("final");
    setShowScorePopup(true);

    if (outOf5Info.scoreOutOf5 >= 3.5) {
      try {
        void confetti({
          particleCount: 70,
          spread: 65,
          origin: { y: 0.65 },
        });
      } catch {
        // ignore
      }
    }
  };

  /**
   * First Attempt ("Submit (First Attempt)"):
   * - If the user got all 5 questions right on the first try, skip "Take 2" completely
   *   and immediately show the "Great Job!" Score Pop-Up!
   * - Otherwise, lock the questions they got right on the 1st try (marked "Correct"),
   *   clear their wrong selections so their original wrong guess is NOT visible,
   *   and jump to the first missed question for Round 2.
   */
  const handleRoundOneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson) return;

    setIsSubmitting(true);
    try {
      const localRes = gradeMultipleChoiceLocally({
        lesson,
        selectedIndices: selectedOptions,
        usedSlowdown,
        usedCafeMode,
        isSecondAttempt: false,
      });

      const correctMap: Record<string, boolean> = {};
      for (const fb of localRes.feedback) {
        correctMap[fb.questionId] = fb.isCorrect;
      }
      setRound1CorrectMap(correctMap);

      // If all 5 questions are correct on the 1st try, skip "Take 2" and show the Great Job! popup immediately!
      if (localRes.correctCount === lesson.questions.length) {
        await finalizeOfficialSubmission({
          graded: localRes,
          usedSecondAttempt: false,
          finalSelections: selectedOptions,
        });
        return;
      }

      // Otherwise, keep only the 1st-try correct answers and CLEAR the missed questions
      // so the user's original wrong guess is not visible in Round 2.
      const cleanedSelections: Record<string, number | undefined> = {};
      for (const q of lesson.questions) {
        if (correctMap[q.id]) {
          cleanedSelections[q.id] = q.correctOptionIndex;
        } else {
          cleanedSelections[q.id] = undefined;
        }
      }
      setSelectedOptions(cleanedSelections);

      const firstMissedIdx = lesson.questions.findIndex(
        (q) => !correctMap[q.id]
      );
      setCurrentQuestionIdx(firstMissedIdx >= 0 ? firstMissedIdx : 0);
      setStage("round2");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Second Attempt ("Final Submission"):
   * Grades final multiple-choice selections (with 1st-try correct questions locked and
   * 2nd-try questions carrying the retry penalty), calculates bottom-line score out of 5,
   * and opens the Score Pop-Up.
   */
  const handleFinalSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson) return;

    setIsSubmitting(true);
    try {
      const graded = gradeMultipleChoiceLocally({
        lesson,
        selectedIndices: selectedOptions,
        usedSlowdown,
        usedCafeMode,
        round1CorrectMap,
        isSecondAttempt: true,
      });

      await finalizeOfficialSubmission({
        graded,
        usedSecondAttempt: true,
        finalSelections: selectedOptions,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Unscored Post-Game Practice Check:
   * Lets the user read the transcript and try answering the 5 questions again
   * without affecting their official score or stats.
   */
  const handlePracticeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const graded = gradeMultipleChoiceLocally({
      lesson,
      selectedIndices: practiceOptions,
      usedSlowdown: false,
      usedCafeMode: false,
      isSecondAttempt: false,
    });

    const outOf5Info = calculateScoreOutOf5({
      rawScore: graded.rawScore,
      usedSlowdown: false,
      usedCafeMode: false,
      usedSecondAttempt: false,
      firstTryCorrectCount: graded.correctCount,
      secondTryCorrectCount: 0,
    });

    setPracticeGradeResult({
      correctCount: graded.correctCount,
      scoreOutOf5: outOf5Info.scoreOutOf5,
      formattedScoreOutOf5: outOf5Info.formattedScoreOutOf5,
      feedback: graded.feedback,
    });
  };

  /**
   * Audio Vocab Review Quiz Submit:
   * Grades the 5 oral-comprehension vocab questions and awards a Gold (100%),
   * Silver (80%), or Bronze (40-60%) Star on the user's Total Score & Leaderboard!
   */
  const handleVocabQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let correct = 0;
    for (const q of audioVocabQuizQuestions) {
      if (vocabQuizAnswers[q.id] === q.correctOptionIndex) {
        correct++;
      }
    }
    setVocabQuizCorrectCount(correct);
    setVocabQuizSubmitted(true);

    const earnedStar = getVocabStarInfo(
      correct,
      audioVocabQuizQuestions.length
    );

    const starRank: Record<VocabStarTier, number> = {
      gold: 3,
      silver: 2,
      bronze: 1,
      none: 0,
    };

    const bestTier =
      starRank[earnedStar.tier] >= starRank[todayVocabStar]
        ? earnedStar.tier
        : todayVocabStar;

    setTodayVocabStar(bestTier);
    try {
      localStorage.setItem(`earworm_vocab_star_${todayStr}`, bestTier);
    } catch {
      // ignore
    }

    if (earnedStar.tier === "gold" || earnedStar.tier === "silver") {
      try {
        void confetti({
          particleCount: 55,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    }
  };

  const handlePlayVocabAudio = (id: string, textToSpeak: string) => {
    setPlayingVocabId(id);
    speakSpanishText(textToSpeak, {
      rate: 0.9,
      fallbackAudioUrl: lesson.audioUrl,
      onEnd: () => setPlayingVocabId((curr) => (curr === id ? null : curr)),
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
    setCurrentQuestionIdx(0);
    setPlayCount(0);
    setUsedSlowdown(false);
    setUsedCafeMode(false);
    setSelectedOptions({});
    setRound1CorrectMap({});
    setFinalGradeResult(null);
    setShowScorePopup(false);
    setShowPracticeTranscript(false);
    setPracticeOptions({});
    setPracticeGradeResult(null);
  };

  const handleShareScore = async () => {
    if (!finalGradeResult || !lesson) return;
    const tier = getRatingTierFrom5(finalGradeResult.scoreOutOf5);
    const tiles = finalGradeResult.feedback
      .map((f) =>
        !f.isCorrect ? "⬜" : f.wasFirstTryCorrect ? "🟩" : "🟨"
      )
      .join("");
    const starLine =
      todayVocabStar !== "none"
        ? `${activeStarInfo.icon} ${activeStarInfo.shortLabel} (Audio Vocab)`
        : "";

    const shareText = [
      `Earshot ${lesson.dateStr} • Mexican Spanish 🇲🇽 (${activeLevelOption.label})`,
      `Score: ${finalGradeResult.formattedScoreOutOf5} / 5 ${tiles} (${tier.label})`,
      starLine,
      `🔥 Streak: ${playerStats.streakDays}d`,
    ]
      .filter(Boolean)
      .join("\n");

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
    lesson?.questions.every((q) => {
      if (stage === "round2" && round1CorrectMap[q.id]) return true;
      return selectedOptions[q.id] !== undefined;
    }) ?? false;

  const answeredCount =
    lesson?.questions.filter((q) => {
      if (stage === "round2" && round1CorrectMap[q.id]) return true;
      return selectedOptions[q.id] !== undefined;
    }).length ?? 0;

  const activeQuestion =
    lesson?.questions[currentQuestionIdx] ?? lesson?.questions[0];

  const allVocabQuizAnswered = audioVocabQuizQuestions.every(
    (q) => vocabQuizAnswers[q.id] !== undefined
  );

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
            Earshot
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
              Unlock Earshot
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8] text-zinc-900 dark:bg-[#121213] dark:text-zinc-100">
      {/* =====================================================================
          PROTOTYPE / MVP DEBUG POP-UP MODAL
          Explains how the static prototype simulates the live friend leaderboard
      ===================================================================== */}
      {showMvpDebugModal && (
        <div
          onClick={() => setShowMvpDebugModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 cursor-default"
          >
            <div className="mb-3 flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-500">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-black">
                    Prototype / MVP Mode
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Static GitHub Pages Preview
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMvpDebugModal(false)}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
              <p>
                <strong>How the Final Version Works:</strong> In the production
                release backed by Convex Cloud, sharing your group link (
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
                  ?group={groupId}
                </code>
                ) automatically syncs live daily <strong>/ 5 scores</strong>,{" "}
                <strong>streaks</strong>, and{" "}
                <strong>Audio Vocab Stars (🥇 Gold, 🥈 Silver, 🥉 Bronze)</strong>{" "}
                across all of your friends&apos; devices in real time.
              </p>
              <p>
                <strong>What You See Right Now:</strong> Because this prototype
                is hosted statically on GitHub Pages, your scores, streaks, and
                Vocab Stars are saved in your browser, and we include{" "}
                <strong>3 simulated demo friends</strong> on the Leaderboard so
                you can preview how your score and Vocab Star rank against a
                friend group.
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/70">
              <span className="text-xs font-bold">
                Show Demo Friends on Leaderboard
              </span>
              <button
                type="button"
                onClick={() => setShowDemoFriends((prev) => !prev)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-extrabold transition-colors cursor-pointer",
                  showDemoFriends
                    ? "bg-[#538d4e] text-white"
                    : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                )}
              >
                {showDemoFriends ? "ON" : "OFF"}
              </button>
            </div>

            <Button
              type="button"
              size="lg"
              onClick={() => setShowMvpDebugModal(false)}
              className="mt-5 w-full bg-[#538d4e] text-white hover:bg-[#467a42]"
            >
              Got It
            </Button>
          </div>
        </div>
      )}

      {/* =====================================================================
          BOTTOM-LINE SCORE POP-UP MODAL (Out of 5, up to 6/5 with Traffic Noise)
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
              {finalGradeResult.correctCount === 5 &&
              !finalGradeResult.usedSecondAttempt
                ? "🎉 Great Job! Perfect First-Try Sweep!"
                : "Bottom-Line Earshot Score"}
            </span>

            {/* Score Out of 5 (or 6/5 with Traffic Noise!) + Vocab Star */}
            <div className="mt-2 flex items-center justify-center gap-2">
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-5xl font-black tracking-tight text-[#538d4e] dark:text-emerald-400">
                  {finalGradeResult.formattedScoreOutOf5}
                </span>
                <span className="font-mono text-2xl font-bold text-zinc-400 dark:text-zinc-500">
                  / 5
                </span>
              </div>

              {todayVocabStar !== "none" && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black",
                    activeStarInfo.badgeClass
                  )}
                  title={activeStarInfo.description}
                >
                  <span>{activeStarInfo.icon}</span>
                  <span>{activeStarInfo.shortLabel}</span>
                </span>
              )}
            </div>

            {finalGradeResult.scoreOutOf5 > 5 && (
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-0.5 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
                <span>🚗 Over-the-Top Bonus! Traffic Noise + Perfect 1st Try!</span>
              </div>
            )}

            {/* 5-Question Wordle Tile Row (Green = 1st Try, Gold/Yellow = 2nd Try, Gray = Missed) */}
            <div className="mt-2.5 flex justify-center gap-1.5">
              {finalGradeResult.feedback.map((fb, idx) => (
                <div
                  key={fb.questionId}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg font-mono text-xs font-black text-white",
                    !fb.isCorrect
                      ? "bg-zinc-400 dark:bg-zinc-700"
                      : fb.wasFirstTryCorrect
                        ? "bg-[#538d4e]"
                        : "bg-[#b59f3b]"
                  )}
                  title={`Question ${idx + 1}: ${
                    !fb.isCorrect
                      ? "Missed"
                      : fb.wasFirstTryCorrect
                        ? "Correct on 1st Try (1.0 pt)"
                        : "Correct on 2nd Try (0.7 pt)"
                  }`}
                >
                  Q{idx + 1}
                </div>
              ))}
            </div>

            {/* Rating Badge */}
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-3.5 py-1 text-xs font-black uppercase tracking-wider dark:border-zinc-700 dark:bg-zinc-800">
              <span>{activeRatingTier.emoji}</span>
              <span>
                {activeRatingTier.label} ({finalGradeResult.correctCount}/5
                Questions)
              </span>
            </div>

            {/* Audio Vocab Star Callout inside Score Pop-Up */}
            <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-left">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-zinc-900 dark:text-white">
                    {todayVocabStar !== "none"
                      ? `${activeStarInfo.icon} ${activeStarInfo.label}`
                      : "⭐ Bonus: Daily Audio Vocab Star"}
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                    {todayVocabStar !== "none"
                      ? "Included on your Total Score & Friend Leaderboard!"
                      : "Take the 30-sec Audio Vocab Quiz to add a 🥇 Gold, 🥈 Silver, or 🥉 Bronze star to your score!"}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setShowScorePopup(false);
                    setVocabModalTab("quiz");
                    setShowVocabModal(true);
                  }}
                  className="shrink-0 rounded-xl bg-amber-500 text-xs font-black text-zinc-950 hover:bg-amber-400"
                >
                  {todayVocabStar !== "none" ? "Retake" : "Earn Star"}
                </Button>
              </div>
            </div>

            {/* Bonuses & Penalties Section */}
            <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 text-left dark:border-zinc-800 dark:bg-zinc-950/70">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Bonuses & Penalties
                </span>
                <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                  Questions: {finalGradeResult.baseScoreOutOf5.toFixed(1)} / 5
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
            <div className="mt-3 grid grid-cols-3 gap-2">
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
          AUDIO VOCABULARY REVIEW & STAR CHALLENGE MODAL
          Tab 1: 🎧 Audio Vocab Quiz (Earns 🥇 Gold / 🥈 Silver / 🥉 Bronze Star)
          Tab 2: 📖 Study Vault (Today's Dialog + Previous Days Played with Audio)
      ===================================================================== */}
      {showVocabModal && (
        <div
          onClick={() => setShowVocabModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 cursor-default"
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#538d4e]/15 text-[#538d4e] dark:text-emerald-400">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-xl font-black">
                      Audio Vocab Review
                    </h2>
                    {todayVocabStar !== "none" && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-black",
                          activeStarInfo.badgeClass
                        )}
                      >
                        <span>{activeStarInfo.icon}</span>
                        <span>{activeStarInfo.shortLabel}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Listen &amp; test your ear to earn a 🥇 Gold, 🥈 Silver, or
                    🥉 Bronze Star!
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

            {/* Mode Switcher Tabs: Audio Quiz (Star Challenge) vs Study Vault */}
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-zinc-100 p-1.5 dark:bg-zinc-950">
              <button
                type="button"
                onClick={() => setVocabModalTab("quiz")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition-all cursor-pointer",
                  vocabModalTab === "quiz"
                    ? "bg-[#538d4e] text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                )}
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span>🎧 Audio Vocab Quiz (Earn Star)</span>
              </button>

              <button
                type="button"
                onClick={() => setVocabModalTab("vault")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition-all cursor-pointer",
                  vocabModalTab === "vault"
                    ? "bg-[#538d4e] text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                )}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>📖 Study Vault (Today + Past)</span>
              </button>
            </div>

            {/* ===============================================================
                TAB 1: 🎧 AUDIO VOCAB QUIZ (EARN GOLD / SILVER / BRONZE STAR)
            =============================================================== */}
            {vocabModalTab === "quiz" && (
              <div className="space-y-4">
                {/* Star Rubric Banner */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-950/70">
                  <span className="font-bold text-zinc-600 dark:text-zinc-300">
                    Oral Comprehension Star Tiers:
                  </span>
                  <div className="flex items-center gap-2 font-bold">
                    <span>🥇 Gold: 5/5 (100%)</span>
                    <span>•</span>
                    <span>🥈 Silver: 4/5</span>
                    <span>•</span>
                    <span>🥉 Bronze: 2–3/5</span>
                  </div>
                </div>

                {/* Result Banner once submitted */}
                {vocabQuizSubmitted && (
                  <div
                    className={cn(
                      "rounded-2xl border-2 p-4 text-center",
                      getVocabStarInfo(
                        vocabQuizCorrectCount,
                        audioVocabQuizQuestions.length
                      ).badgeClass
                    )}
                  >
                    <div className="text-2xl">
                      {
                        getVocabStarInfo(
                          vocabQuizCorrectCount,
                          audioVocabQuizQuestions.length
                        ).icon
                      }
                    </div>
                    <h3 className="mt-1 font-serif text-lg font-black">
                      {
                        getVocabStarInfo(
                          vocabQuizCorrectCount,
                          audioVocabQuizQuestions.length
                        ).label
                      }{" "}
                      — {vocabQuizCorrectCount}/
                      {audioVocabQuizQuestions.length} Correct
                    </h3>
                    <p className="mt-0.5 text-xs">
                      {
                        getVocabStarInfo(
                          vocabQuizCorrectCount,
                          audioVocabQuizQuestions.length
                        ).description
                      }
                    </p>
                  </div>
                )}

                <form onSubmit={handleVocabQuizSubmit} className="space-y-4">
                  {audioVocabQuizQuestions.map((vq, idx) => {
                    const selected = vocabQuizAnswers[vq.id];
                    const isPlayingThis = playingVocabId === vq.id;
                    const isRevealed =
                      revealedSpanishTerms[vq.id] || vocabQuizSubmitted;

                    return (
                      <div
                        key={vq.id}
                        className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/60"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Audio Word #{idx + 1}
                          </span>
                          <span className="rounded-md bg-zinc-200/70 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {vq.sourceLabel}
                          </span>
                        </div>

                        {/* Oral Comprehension Prompt: Play Spanish Audio Button */}
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                handlePlayVocabAudio(
                                  vq.id,
                                  vq.spokenContextSentence
                                );
                              }}
                              className={cn(
                                "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition-all cursor-pointer",
                                isPlayingThis
                                  ? "bg-amber-500 text-zinc-950"
                                  : "bg-[#538d4e] text-white hover:bg-[#467a42]"
                              )}
                            >
                              <Volume2 className="h-4 w-4" />
                              <span>
                                {isPlayingThis
                                  ? "Playing Spanish..."
                                  : "Play Spanish Audio"}
                              </span>
                            </button>

                            <div>
                              {isRevealed ? (
                                <span className="text-sm font-black text-zinc-900 dark:text-white">
                                  “{vq.spanishTerm}”
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRevealedSpanishTerms((prev) => ({
                                      ...prev,
                                      [vq.id]: true,
                                    }))
                                  }
                                  className="text-xs font-semibold text-zinc-400 underline hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                                >
                                  Show Spanish spelling
                                </button>
                              )}
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                Listen &amp; pick the correct English meaning:
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* 4 Multiple Choice Options */}
                        <div className="grid grid-cols-1 gap-2">
                          {vq.options.map((optText, optIdx) => {
                            const isSelected = selected === optIdx;
                            const isRightOption =
                              optIdx === vq.correctOptionIndex;

                            let optionStyle =
                              "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200";
                            if (vocabQuizSubmitted) {
                              if (isRightOption) {
                                optionStyle =
                                  "border-[#538d4e] bg-[#538d4e] text-white font-bold";
                              } else if (isSelected && !isRightOption) {
                                optionStyle =
                                  "border-red-500/60 bg-red-500/15 text-red-800 dark:text-red-300";
                              }
                            } else if (isSelected) {
                              optionStyle =
                                "border-[#538d4e] bg-[#538d4e]/15 text-[#538d4e] dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-200 font-bold";
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                disabled={vocabQuizSubmitted}
                                onClick={() =>
                                  setVocabQuizAnswers((prev) => ({
                                    ...prev,
                                    [vq.id]: optIdx,
                                  }))
                                }
                                className={cn(
                                  "flex items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-left text-xs transition-all cursor-pointer",
                                  optionStyle
                                )}
                              >
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-black/10 font-mono text-[11px] font-black dark:bg-white/10">
                                  {OPTION_LETTERS[optIdx]}
                                </span>
                                <span className="flex-1">{optText}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex gap-2">
                    {!vocabQuizSubmitted ? (
                      <Button
                        type="submit"
                        size="lg"
                        disabled={!allVocabQuizAnswered}
                        className="w-full bg-[#538d4e] text-white hover:bg-[#467a42]"
                      >
                        Submit Audio Vocab Review &amp; Earn Star
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="lg"
                        onClick={() => {
                          setVocabQuizAnswers({});
                          setVocabQuizSubmitted(false);
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>Retry Audio Vocab Quiz</span>
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* ===============================================================
                TAB 2: 📖 STUDY VAULT (TODAY'S DIALOG + PREVIOUS DAYS PLAYED)
            =============================================================== */}
            {vocabModalTab === "vault" && (
              <div className="space-y-6">
                {/* Today's Dialog Vocabulary */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#538d4e] dark:text-emerald-400">
                      Today&apos;s Dialog: {lesson.title}
                    </h3>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {activeLevelOption.label}
                    </span>
                  </div>

                  {lesson.slangNotes.map((note) => {
                    const firstWord = note.term
                      .toLowerCase()
                      .replace(/[¿?¡!]/g, "")
                      .split(/\s+/)[0];
                    const matchingLine = lesson.dialogue.find((d) =>
                      d.text.toLowerCase().includes(firstWord)
                    );
                    const playId = `vault_today_${note.term}`;
                    const isPlaying = playingVocabId === playId;

                    return (
                      <div
                        key={note.term}
                        className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/70"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-[#538d4e] dark:text-emerald-400">
                              🇲🇽 “{note.term}”
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handlePlayVocabAudio(
                                  playId,
                                  matchingLine
                                    ? `${note.term}. ${matchingLine.text}`
                                    : note.term
                                )
                              }
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition-colors cursor-pointer",
                                isPlaying
                                  ? "border-[#538d4e] bg-[#538d4e] text-white"
                                  : "border-zinc-200 bg-white text-zinc-700 hover:border-[#538d4e] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                              )}
                            >
                              <Volume2 className="h-3 w-3" />
                              <span>{isPlaying ? "Playing..." : "Listen"}</span>
                            </button>
                          </div>
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

                {/* Previous Days Played Vocabulary */}
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
                        {entry.items.map((item) => {
                          const pId = `vault_prev_${entry.key}_${item.term}`;
                          const isPlaying = playingVocabId === pId;
                          return (
                            <div
                              key={item.term}
                              className="rounded-xl border border-zinc-200/80 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-black text-[#538d4e] dark:text-emerald-400">
                                  “{item.term}”
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handlePlayVocabAudio(pId, item.term)
                                  }
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold cursor-pointer",
                                    isPlaying
                                      ? "border-[#538d4e] bg-[#538d4e] text-white"
                                      : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                  )}
                                >
                                  <Volume2 className="h-2.5 w-2.5" />
                                  <span>Listen</span>
                                </button>
                              </div>
                              <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-300">
                                <strong className="text-zinc-900 dark:text-white">
                                  English:{" "}
                                </strong>
                                {item.meaning}
                              </p>
                              <p className="mt-0.5 text-[10px] italic text-zinc-400">
                                Literal: “{item.literalTranslation}”
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5">
              <Button
                type="button"
                size="lg"
                onClick={() => setShowVocabModal(false)}
                className="w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                Close Vocabulary Review
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          FRIEND LEADERBOARD MODAL (Includes `/ 5` Score + Vocab Star + MVP Notice)
      ===================================================================== */}
      {showLeaderboardModal && (
        <div
          onClick={() => setShowLeaderboardModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs cursor-pointer"
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
                  <h2 className="font-serif text-xl font-black">
                    Friend Leaderboard
                  </h2>
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

            {/* Prototype / Static MVP Explanation Banner */}
            <div className="mb-4 flex items-start justify-between gap-2 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-zinc-700 dark:text-zinc-200">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <div>
                  <strong className="text-zinc-900 dark:text-white">
                    Static Prototype Preview:
                  </strong>{" "}
                  The final release automatically syncs live scores &amp; Vocab
                  Stars with friends in your group.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowLeaderboardModal(false);
                  setShowMvpDebugModal(true);
                }}
                className="shrink-0 font-bold text-indigo-600 underline dark:text-indigo-400 cursor-pointer"
              >
                Details
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

            {/* Today's Group Rankings (Score out of 5 + Vocab Star) */}
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Today&apos;s Rank (Score + Vocab Star)
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

              <div className="divide-y divide-zinc-200/70 dark:divide-zinc-800">
                {combinedLeaderboard.map((row, index) => {
                  const isMe = row.deviceId === (deviceId || "me");
                  const rowStar = getVocabStarInfoByTier(row.vocabStar);

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

                      <div className="flex items-center gap-1.5 text-right">
                        {row.vocabStar !== "none" && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold",
                              rowStar.badgeClass
                            )}
                            title={rowStar.label}
                          >
                            <span>{rowStar.icon}</span>
                            <span className="hidden sm:inline">
                              {rowStar.shortLabel}
                            </span>
                          </span>
                        )}

                        {row.scoreOutOf5 !== null ? (
                          <span className="inline-flex items-center rounded-lg border border-zinc-200 px-2.5 py-1 font-mono text-xs font-bold dark:border-zinc-700">
                            {row.scoreOutOf5.toFixed(1)} / 5
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
              {todayVocabStar !== "none" && (
                <span>{activeStarInfo.icon}</span>
              )}
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

          {/* Earshot Logo */}
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#538d4e] text-white shadow-lg shadow-[#538d4e]/25">
            <Ear className="h-9 w-9" />
          </div>

          {/* App Name */}
          <h1 className="font-serif text-4xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
            Earshot
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
            {todayStr} • 5 Sequential Questions + Audio Vocab Star
          </p>
        </div>
      )}

      {/* =====================================================================
          SCREEN 2, 3 & 4: CLEAN GAMEPLAY, POP-UP SCORE & POST-GAME PRACTICE
      ===================================================================== */}
      {screen === "play" && (
        <>
          {/* Sticky Top Navigation Bar with Review Vocab (with Star Badge) & Leaderboard */}
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

              {/* Center: EARSHOT */}
              <div className="flex items-center gap-1.5">
                <Ear className="h-4 w-4 text-[#538d4e] dark:text-emerald-400" />
                <span className="font-serif text-lg font-black tracking-tight sm:text-xl">
                  EARSHOT
                </span>
              </div>

              {/* Right: Review Vocab (+ Star), Leaderboard & Theme Toggle */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowVocabModal(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-[#538d4e]/40 bg-[#538d4e]/10 px-2.5 py-1 text-xs font-bold text-[#538d4e] hover:bg-[#538d4e]/20 dark:text-emerald-300 cursor-pointer"
                  title="Audio Vocab Review & Star Challenge"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Review Vocab</span>
                  <span>
                    {todayVocabStar !== "none" ? activeStarInfo.icon : "⭐"}
                  </span>
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
              <div
                className={cn(
                  "relative overflow-hidden rounded-3xl border-2 p-4 sm:p-5 shadow-lg transition-all space-y-5",
                  activeLevelOption.frameBorderClass,
                  activeLevelOption.glowBgClass,
                  "bg-white/90 dark:bg-zinc-900/70"
                )}
              >
                {/* Top Level-Specific Accent Gradient Strip (Subtle visual level cue) */}
                <div
                  className={cn(
                    "absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r",
                    activeLevelOption.topStripClass
                  )}
                />

                {/* Dialog Header Strip with Subtle Level Cues (Tempo Meter + Level Badge + Quick Switcher) */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200/90 bg-white px-4 py-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#538d4e] dark:text-emerald-400">
                        🇲🇽 Mexican Spanish
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold",
                          activeLevelOption.pillBadgeClass
                        )}
                      >
                        <span>{activeLevelOption.cueBadge}</span>
                        {/* Subtle 3-bar tempo/complexity meter */}
                        <span
                          className="inline-flex items-end gap-0.5 pl-0.5"
                          title={activeLevelOption.cueDesc}
                        >
                          {[1, 2, 3].map((bar) => (
                            <span
                              key={bar}
                              className={cn(
                                "w-1 rounded-full transition-all",
                                bar === 1 && "h-2",
                                bar === 2 && "h-2.5",
                                bar === 3 && "h-3.5",
                                bar <= activeLevelOption.tempoBars
                                  ? activeLevelOption.barActiveClass
                                  : "bg-zinc-300 dark:bg-zinc-700"
                              )}
                            />
                          ))}
                        </span>
                      </span>
                    </div>
                    <h2 className="mt-1 text-sm font-black text-zinc-900 dark:text-white">
                      “{lesson.title}”
                    </h2>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {activeLevelOption.cueDesc}
                    </p>
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
                    ROUND 1 & ROUND 2: SEQUENTIAL ONE-AT-A-TIME QUESTIONS
                =========================================================== */}
                {stage !== "final" && activeQuestion && (
                  <>
                    {/* Audio Player:
                        Play Audio
                        Slow Playback (20% Penalty) | Add Background Noise (+1 Pt Bonus)
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

                    {/* Round 2 Notice Banner (Shown after clicking "Submit (First Attempt)" when < 5/5) */}
                    {stage === "round2" && (
                      <div className="rounded-2xl border border-[#b59f3b]/50 bg-[#b59f3b]/15 px-4 py-3 text-center text-xs font-bold text-zinc-800 dark:text-zinc-100">
                        You got{" "}
                        <span className="font-mono font-black text-[#538d4e] dark:text-emerald-400">
                          {
                            Object.values(round1CorrectMap).filter(Boolean)
                              .length
                          }{" "}
                          / {lesson.questions.length}
                        </span>{" "}
                        right on your 1st try! Questions you got right stay
                        locked{" "}
                        <span className="text-[#538d4e] dark:text-emerald-400">
                          (🟩 Correct)
                        </span>
                        . Listen a 2nd time and retry the remaining questions
                        (worth <strong>0.7 pts</strong> each on 2nd try).
                      </div>
                    )}

                    {/* Sequential One-at-a-Time Question Form */}
                    <form
                      onSubmit={
                        stage === "round1"
                          ? handleRoundOneSubmit
                          : handleFinalSubmission
                      }
                      className="space-y-4"
                    >
                      {/* 5-Question Sequential Stepper Bar */}
                      <div className="flex items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/70">
                        <div className="flex items-center gap-1.5">
                          {lesson.questions.map((q, idx) => {
                            const isCurrent = idx === currentQuestionIdx;
                            const isR1Correct =
                              stage === "round2" && round1CorrectMap[q.id];
                            const isR1Missed =
                              stage === "round2" &&
                              round1CorrectMap[q.id] === false;
                            const hasSelection =
                              isR1Correct ||
                              selectedOptions[q.id] !== undefined;

                            return (
                              <button
                                key={q.id}
                                type="button"
                                onClick={() => setCurrentQuestionIdx(idx)}
                                className={cn(
                                  "flex h-8 w-9 items-center justify-center rounded-xl font-mono text-xs font-black transition-all cursor-pointer",
                                  isCurrent &&
                                    "ring-2 ring-zinc-900 ring-offset-1 dark:ring-white dark:ring-offset-zinc-900",
                                  isR1Correct
                                    ? "bg-[#538d4e] text-white"
                                    : isR1Missed && hasSelection
                                      ? "bg-[#b59f3b] text-white"
                                      : isR1Missed
                                        ? "border-2 border-[#b59f3b] bg-[#b59f3b]/15 text-amber-800 dark:text-amber-300"
                                        : hasSelection
                                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                          : "bg-zinc-200/80 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-400"
                                )}
                                title={`Question ${idx + 1}`}
                              >
                                {isR1Correct ? "✓" : `Q${idx + 1}`}
                              </button>
                            );
                          })}
                        </div>

                        <span className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400">
                          {answeredCount}/{lesson.questions.length} Answered
                        </span>
                      </div>

                      {/* Single Active Question Card (Sequential One-at-a-Time) */}
                      {(() => {
                        const q = activeQuestion;
                        const wasCorrectR1 = round1CorrectMap[q.id];
                        const isLockedCorrect =
                          stage === "round2" && wasCorrectR1 === true;
                        const isRetryingMissed =
                          stage === "round2" && wasCorrectR1 === false;
                        const selectedIdx = isLockedCorrect
                          ? q.correctOptionIndex
                          : selectedOptions[q.id];

                        return (
                          <div
                            key={`${lesson._id}_${q.id}_step`}
                            className={cn(
                              "space-y-3.5 rounded-2xl border-2 bg-white p-5 shadow-xs transition-all dark:bg-zinc-900",
                              isLockedCorrect
                                ? "border-[#538d4e]/60 dark:border-[#538d4e]/60"
                                : isRetryingMissed
                                  ? "border-[#b59f3b]/60 dark:border-[#b59f3b]/60"
                                  : "border-zinc-200 dark:border-zinc-800"
                            )}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                Question {currentQuestionIdx + 1} of{" "}
                                {lesson.questions.length} •{" "}
                                {q.difficultyLabel.replace(
                                  /^Q\d+\s*•\s*/,
                                  ""
                                )}
                              </span>

                              {isLockedCorrect && (
                                <span className="rounded-lg bg-[#538d4e] px-2.5 py-0.5 text-xs font-extrabold text-white">
                                  🟩 Correct on 1st Try (Locked)
                                </span>
                              )}

                              {isRetryingMissed && (
                                <span className="rounded-lg bg-[#b59f3b] px-2.5 py-0.5 text-xs font-extrabold text-white">
                                  🟨 Try Again (2nd Try)
                                </span>
                              )}
                            </div>

                            <p className="text-base font-bold leading-snug text-zinc-900 dark:text-zinc-100">
                              {q.questionText}
                            </p>

                            {isLockedCorrect && (
                              <p className="rounded-xl bg-[#538d4e]/10 px-3 py-2 text-xs font-semibold text-[#538d4e] dark:text-emerald-300">
                                You nailed this question on your first attempt!
                                Your correct answer is locked in.
                              </p>
                            )}

                            {/* 4 Multiple Choice Options (In Round 2, missed questions have NO prior guess shown!) */}
                            <div className="grid grid-cols-1 gap-2">
                              {q.options.map((optionText, optIdx) => {
                                const isSelected = selectedIdx === optIdx;
                                return (
                                  <button
                                    key={optIdx}
                                    type="button"
                                    disabled={isSubmitting || isLockedCorrect}
                                    onClick={() => {
                                      if (isLockedCorrect) return;
                                      setSelectedOptions((prev) => ({
                                        ...prev,
                                        [q.id]: optIdx,
                                      }));
                                    }}
                                    className={cn(
                                      "flex items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left text-xs font-medium transition-all",
                                      isLockedCorrect
                                        ? "cursor-default"
                                        : "cursor-pointer",
                                      isSelected
                                        ? "border-[#538d4e] bg-[#538d4e]/15 text-zinc-950 font-bold dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-white"
                                        : "border-zinc-200 bg-zinc-50/70 text-zinc-800 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200 dark:hover:border-zinc-700"
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-black",
                                        isSelected
                                          ? "bg-[#538d4e] text-white"
                                          : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                      )}
                                    >
                                      {OPTION_LETTERS[optIdx]}
                                    </span>
                                    <span className="flex-1 leading-snug">
                                      {optionText}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Sequential Navigation Controls: Previous / Next Question */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-200/70 dark:border-zinc-800">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={currentQuestionIdx === 0}
                                onClick={() =>
                                  setCurrentQuestionIdx((i) =>
                                    Math.max(0, i - 1)
                                  )
                                }
                                className="rounded-xl"
                              >
                                <ChevronLeft className="h-4 w-4" />
                                <span>Previous</span>
                              </Button>

                              <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
                                {currentQuestionIdx + 1} /{" "}
                                {lesson.questions.length}
                              </span>

                              {currentQuestionIdx <
                              lesson.questions.length - 1 ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() =>
                                    setCurrentQuestionIdx((i) =>
                                      Math.min(
                                        lesson.questions.length - 1,
                                        i + 1
                                      )
                                    )
                                  }
                                  className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                >
                                  <span>Next Question</span>
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              ) : (
                                <span className="text-xs font-bold text-[#538d4e] dark:text-emerald-400">
                                  Last Question ✓
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Submit Button (Enabled once all 5 questions have answers) */}
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
                          `Submit (First Attempt) • ${answeredCount}/${lesson.questions.length}`
                        ) : (
                          `Final Submission • ${answeredCount}/${lesson.questions.length}`
                        )}
                      </Button>

                      {stage === "round1" && (
                        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                          Get all 5 right on your 1st try for a{" "}
                          <strong>perfect 5/5</strong> (or{" "}
                          <strong>6/5 with Traffic Noise</strong>)! If you miss
                          any, you&apos;ll get a 2nd listen to retry them.
                        </p>
                      )}
                    </form>
                  </>
                )}

                {/* ===========================================================
                    POST-GAME PAGE (After 1st-Try Sweep or 2nd Submission):
                    - Official Score Banner (with Vocab Star + button to re-open Score Pop-Up)
                    - Option to Read the Interactive Audio Transcript of the Dialog
                    - Option to Try Answering the Questions Again (Unscored Practice)
                =========================================================== */}
                {stage === "final" && finalGradeResult && activeRatingTier && (
                  <div className="space-y-5">
                    {/* Compact Official Score Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-[#538d4e]/50 bg-[#538d4e]/10 p-5">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                          Official Daily Earshot Score
                        </span>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="font-mono text-3xl font-black text-[#538d4e] dark:text-emerald-400">
                            {finalGradeResult.formattedScoreOutOf5} / 5
                          </span>
                          <span className="text-sm font-black uppercase text-zinc-800 dark:text-zinc-200">
                            {activeRatingTier.emoji} {activeRatingTier.label}
                          </span>
                          {todayVocabStar !== "none" && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-black",
                                activeStarInfo.badgeClass
                              )}
                            >
                              <span>{activeStarInfo.icon}</span>
                              <span>{activeStarInfo.shortLabel}</span>
                            </span>
                          )}
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
                          onClick={() => {
                            setVocabModalTab("quiz");
                            setShowVocabModal(true);
                          }}
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>
                            {todayVocabStar !== "none"
                              ? `Vocab ${activeStarInfo.icon}`
                              : "Earn Vocab Star ⭐"}
                          </span>
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

                    {/* OPTION 1: Read the Interactive Audio Transcript of the Dialog */}
                    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="font-serif text-lg font-black text-zinc-900 dark:text-white">
                            Dialog Transcript (with Line-by-Line Audio)
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Read the Spanish transcript, tap any line to hear it
                            aloud, and try answering the questions again below.
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant={
                            showPracticeTranscript ? "outline" : "default"
                          }
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
                            audioUrl={lesson.audioUrl}
                          />
                        </div>
                      )}
                    </div>

                    {/* OPTION 2: Try Answering the 5 Questions Again (Unscored Practice Mode) */}
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
                            setPracticeOptions({});
                            setPracticeGradeResult(null);
                          }}
                          className="text-xs font-bold text-[#538d4e] hover:underline dark:text-emerald-400 cursor-pointer"
                        >
                          Clear Selections
                        </button>
                      </div>

                      <form
                        onSubmit={handlePracticeSubmit}
                        className="space-y-4"
                      >
                        {lesson.questions.map((q) => {
                          const officialFb = finalGradeResult.feedback.find(
                            (f) => f.questionId === q.id
                          );
                          const practiceFb = practiceGradeResult?.feedback.find(
                            (f) => f.questionId === q.id
                          );
                          const activeFb = practiceFb ?? officialFb;
                          const selectedIdx = practiceOptions[q.id];

                          return (
                            <div
                              key={`practice_${q.id}`}
                              className="space-y-2.5 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/60"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                  {q.difficultyLabel}
                                </span>
                                {activeFb && (
                                  <span
                                    className={cn(
                                      "rounded-md px-2 py-0.5 text-[11px] font-bold text-white",
                                      activeFb.isCorrect
                                        ? "bg-[#538d4e]"
                                        : "bg-zinc-500 dark:bg-zinc-700"
                                    )}
                                  >
                                    {practiceFb ? "Practice: " : "Official: "}
                                    {activeFb.isCorrect
                                      ? "🟩 Correct"
                                      : "⬜ Missed"}
                                  </span>
                                )}
                              </div>

                              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                {q.questionText}
                              </p>

                              <div className="grid grid-cols-1 gap-1.5">
                                {q.options.map((optText, optIdx) => {
                                  const isSelected = selectedIdx === optIdx;
                                  return (
                                    <button
                                      key={optIdx}
                                      type="button"
                                      onClick={() =>
                                        setPracticeOptions((prev) => ({
                                          ...prev,
                                          [q.id]: optIdx,
                                        }))
                                      }
                                      className={cn(
                                        "flex items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-left text-xs transition-all cursor-pointer",
                                        isSelected
                                          ? "border-[#538d4e] bg-[#538d4e]/15 font-bold text-zinc-950 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-white"
                                          : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                                      )}
                                    >
                                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-black/10 font-mono text-[11px] font-black dark:bg-white/10">
                                        {OPTION_LETTERS[optIdx]}
                                      </span>
                                      <span className="flex-1">{optText}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              {activeFb && (
                                <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                                  <strong>Explanation: </strong>
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
                              {practiceGradeResult.correctCount} / 5 Correct (
                              {practiceGradeResult.formattedScoreOutOf5} / 5)
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

                {/* Compact QA, Dialog Switcher & MVP Prototype Info Button at bottom */}
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

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowMvpDebugModal(true)}
                        className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer"
                      >
                        <Info className="h-3 w-3" />
                        <span>MVP Leaderboard Info</span>
                      </button>

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
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}

export default function EarshotPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#121213] text-zinc-100">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <EarshotGameContent />
    </Suspense>
  );
}
