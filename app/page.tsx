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
  BookOpen,
  Check,
  Clock,
  Copy,
  Ear,
  Flame,
  Loader2,
  Lock,
  Moon,
  RotateCcw,
  Share2,
  Sun,
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
  DEFAULT_ACCESS_PASSWORD,
  getStaticMexicanSpanishLesson,
  gradeAnswersLocally,
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
    rangeLabel: "0–34",
    tagline: "Tough clip! Check Today's Vocab to see what you missed.",
    bgClass: "bg-zinc-200/80 dark:bg-zinc-800/90",
    textClass: "text-zinc-700 dark:text-zinc-300",
    borderClass: "border-zinc-400/50 dark:border-zinc-700",
    pillActiveClass: "bg-zinc-700 text-white dark:bg-zinc-600 dark:text-white",
    emoji: "⬜",
  },
  {
    id: "OK",
    label: "OK",
    rangeLabel: "35–64",
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
    rangeLabel: "65–89",
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
    rangeLabel: "90+",
    tagline: "Native-level ear! You nailed the story, nuances, and slang.",
    bgClass: "bg-emerald-600/20 dark:bg-emerald-500/25",
    textClass: "text-emerald-900 dark:text-emerald-200",
    borderClass: "border-emerald-500",
    pillActiveClass: "bg-emerald-600 text-white ring-2 ring-emerald-400/50",
    emoji: "🌟",
  },
];

function getRatingTier(finalScore: number): RatingTierInfo {
  if (finalScore >= 90) return RATING_TIERS[3]; // AMAZING
  if (finalScore >= 65) return RATING_TIERS[2]; // GREAT
  if (finalScore >= 35) return RATING_TIERS[1]; // OK
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-center dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        <Clock className="h-3.5 w-3.5 text-[#538d4e] dark:text-emerald-400" />
        <span>Next Daily Earworm in</span>
      </div>
      <div className="mt-1 font-mono text-2xl font-black tracking-wider text-zinc-900 dark:text-zinc-100">
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

  // Group / Leaderboard / Vocab Modals
  const [groupId, setGroupId] = useState<string>(urlGroup);
  const [groupInput, setGroupInput] = useState<string>(
    urlGroup === "global" ? "" : urlGroup
  );
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showVocabModal, setShowVocabModal] = useState(false);

  // QA clip switcher (Clip #1 or Clip #2 per level)
  const [clipNumber, setClipNumber] = useState<number>(1);

  // Gameplay state:
  // stage: "round1" (First listen + initial Submit) -> "round2" (Shows score per question, unlocks 2nd listen + Final Submission) -> "final" (Scoring page)
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
  const [isSeeding, setIsSeeding] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [localStreak, setLocalStreak] = useState<number>(1);
  const [localScores, setLocalScores] = useState<LocalLeaderboardEntry[]>([]);
  const [finalGradeResult, setFinalGradeResult] = useState<{
    rawScore: number;
    multiplier: number;
    finalScore: number;
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

  // Static Mexican Spanish lesson (always available immediately, including on GitHub Pages)
  const staticLesson = useMemo(
    () => getStaticMexicanSpanishLesson(todayStr, level, clipNumber),
    [todayStr, level, clipNumber]
  );

  // Convex queries, mutations, and actions (used when local/cloud Convex server is reachable)
  const convexLesson = useQuery(api.lessons.getLessonForPuzzle, {
    dateStr: todayStr,
    language,
    level,
    isSideQuest: false,
    clipNumber,
  });

  const userAndSub = useQuery(
    api.users.getUserAndSubmission,
    deviceId && convexLesson?._id
      ? {
          deviceId,
          lessonId: convexLesson._id,
        }
      : "skip"
  );

  const convexScoreboard = useQuery(api.users.getGroupScoreboard, {
    groupId,
    dateStr: todayStr,
    lessonId: convexLesson?._id,
  });

  const upsertUserMutation = useMutation(api.users.upsertUser);
  const resetUserSubmissionMutation = useMutation(
    api.users.resetUserSubmission
  );
  const seedInitialLessonsAction = useAction(
    api.generateLesson.seedInitialLessons
  );
  const submitAndGradeAction = useAction(api.grading.submitAndGrade);

  // Use Convex lesson if available, but always prefer the bundled `/audio/Spanish-...` MP3 if Convex URL points to 127.0.0.1 on a hosted site
  const lesson = useMemo(() => {
    if (convexLesson && convexLesson.dialect === "Mexican Spanish 🇲🇽") {
      const isRemoteHost =
        typeof window !== "undefined" &&
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1";
      const audioPointsToLocal = convexLesson.audioUrl.includes("127.0.0.1");
      return {
        ...convexLesson,
        audioUrl:
          isRemoteHost && audioPointsToLocal
            ? staticLesson.audioUrl
            : convexLesson.audioUrl || staticLesson.audioUrl,
      };
    }
    return staticLesson;
  }, [convexLesson, staticLesson]);

  // Initialize persistent deviceId, password unlock state & saved preferences
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
    const storedStreak = Number(localStorage.getItem("earworm_streak") || "1");
    setUsername(storedHandle);
    setHandleInput(storedHandle);
    setLevel(storedLevel);
    setLocalStreak(Number.isNaN(storedStreak) ? 1 : Math.max(1, storedStreak));

    try {
      const savedBoard = localStorage.getItem("earworm_local_scoreboard");
      if (savedBoard) {
        setLocalScores(JSON.parse(savedBoard) as LocalLeaderboardEntry[]);
      }
    } catch {
      // ignore
    }
  }, []);

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
      // Ignore when running in static GitHub Pages mode without Convex backend
    });
  }, [deviceId, username, groupId, language, level, upsertUserMutation]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Auto-seed Mexican Spanish QA bank if local Convex is connected and missing lesson
  const autoSeededRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (convexLesson === undefined) return;
    const key = `${todayStr}:${level}:${clipNumber}`;
    const needsMexicanSeed =
      convexLesson === null || convexLesson.dialect !== "Mexican Spanish 🇲🇽";
    if (needsMexicanSeed && !autoSeededRef.current.has(key) && !isSeeding) {
      autoSeededRef.current.add(key);
      setIsSeeding(true);
      void seedInitialLessonsAction({
        dateStr: todayStr,
        language: "Spanish",
        level,
        clipNumber,
        seedAllLevelsForQA: true,
        forceRegenerate: true,
      })
        .catch(() => {
          // Ignore in static mode
        })
        .finally(() => {
          setIsSeeding(false);
        });
    }
  }, [
    convexLesson,
    todayStr,
    level,
    clipNumber,
    isSeeding,
    seedInitialLessonsAction,
  ]);

  // Reset local round state when switching level or clip
  useEffect(() => {
    setStage("round1");
    setPlayCount(0);
    setUsedSlowdown(false);
    setUsedCafeMode(false);
    setAnswers({ q1: "", q2: "", q3: "" });
    setRound1Scores({});
    setFinalGradeResult(null);
    setShowVocabModal(false);
  }, [level, clipNumber]);

  const currentStreak = userAndSub?.user?.currentStreak ?? localStreak;
  const activeLevelOption =
    LEVEL_OPTIONS.find((l) => l.id === level) ?? LEVEL_OPTIONS[1];

  const activeFinalSubmission =
    stage === "final"
      ? finalGradeResult ?? userAndSub?.submission ?? null
      : null;

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
   * Round 1 "Submit":
   * Shows ONLY the score for each question, unlocks the 2nd listen,
   * and lets the user modify their answers before clicking "Final Submission".
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

      let feedback = gradeAnswersLocally({
        lesson,
        userAnswers,
        usedSlowdown,
        usedCafeMode,
      }).feedback;

      if (convexLesson?._id) {
        try {
          const res = await submitAndGradeAction({
            deviceId,
            username: username || "Oliver",
            groupId,
            lessonId: convexLesson._id,
            userAnswers,
            playCount: Math.max(1, playCount),
            usedSlowdown,
            usedCafeMode,
            isRoundOneCheck: true,
          });
          feedback = res.feedback;
        } catch {
          // Use local rubric grading when running statically on GitHub Pages
        }
      }

      const scoreMap: Record<string, number> = {};
      for (const fb of feedback) {
        scoreMap[fb.questionId] = fb.score;
      }
      setRound1Scores(scoreMap);
      setStage("round2");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Round 2 "Final Submission":
   * Grades final modified answers, saves to Convex DB (or localStorage on GitHub Pages),
   * and shows the Final Scoring Page.
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

      let result = {
        ...gradeAnswersLocally({
          lesson,
          userAnswers,
          usedSlowdown,
          usedCafeMode,
        }),
        currentStreak: localStreak,
      };

      if (convexLesson?._id) {
        try {
          const convexRes = await submitAndGradeAction({
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
          result = convexRes;
        } catch {
          // Use local grading in static mode
        }
      }

      // Persist in local scoreboard for static / GitHub Pages mode
      const updatedEntry: LocalLeaderboardEntry = {
        userId: deviceId,
        deviceId,
        username: username || "Oliver",
        groupId,
        currentStreak: result.currentStreak || 1,
        todayFinalScore: result.finalScore,
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
        ...result,
        playCount: Math.max(1, playCount),
        usedSlowdown,
        usedCafeMode,
      });
      setStage("final");

      if (result.finalScore >= 65) {
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
  };

  const handleShareScore = async () => {
    if (!activeFinalSubmission || !lesson) return;
    const tier = getRatingTier(activeFinalSubmission.finalScore);
    const tiles = activeFinalSubmission.feedback
      .map((f) => getQuestionWordleTile(f.score).tile)
      .join("");

    const shareText = [
      `Earworm ${lesson.dateStr} • Mexican Spanish 🇲🇽 (${activeLevelOption.label})`,
      `${tiles} ${tier.label.toUpperCase()}`,
      `🔥 Streak: ${Math.max(1, currentStreak)}`,
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

  const activeRatingTier = activeFinalSubmission
    ? getRatingTier(activeFinalSubmission.finalScore)
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
          TODAY'S VOCAB MODAL (Pops up featured slang, idioms & tricky vocabulary)
      ===================================================================== */}
      {showVocabModal && lesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#538d4e]/15 text-[#538d4e] dark:text-emerald-400">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-black">
                    Today&apos;s Vocab
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Mexican Spanish 🇲🇽 • Slang, Idioms & Full Transcript
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

            {/* Featured Slang, Idioms & Tricky Vocabulary Cards */}
            <div className="mb-5 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Featured Slang & Idioms
              </h3>
              {lesson.slangNotes.map((note) => (
                <div
                  key={note.term}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/70"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-black text-[#538d4e] dark:text-emerald-400">
                      “{note.term}”
                    </span>
                    <span className="text-xs italic text-zinc-500 dark:text-zinc-400">
                      Literal: “{note.literalTranslation}”
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-700 dark:text-zinc-200">
                    <strong className="text-zinc-900 dark:text-white">
                      Real Meaning:{" "}
                    </strong>
                    {note.meaning}
                  </p>
                </div>
              ))}
            </div>

            {/* Full Dialogue with Translations */}
            <InteractiveTranscript
              dialogue={lesson.dialogue}
              slangNotes={lesson.slangNotes}
            />

            <div className="mt-5">
              <Button
                type="button"
                size="lg"
                onClick={() => setShowVocabModal(false)}
                className="w-full bg-[#538d4e] text-white hover:bg-[#467a42]"
              >
                Close Vocab
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          LEADERBOARD & "JOIN GROUP" MODAL
      ===================================================================== */}
      {showLeaderboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
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
                    const rowTier =
                      row.todayFinalScore !== null
                        ? getRatingTier(row.todayFinalScore)
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
                          {row.todayFinalScore !== null && rowTier ? (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-bold dark:border-zinc-700">
                              <span>{rowTier.emoji}</span>
                              <span>{rowTier.label}</span>
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
          {/* Top-right Leaderboard / Join Group + Theme + Lock buttons */}
          <div className="fixed right-4 top-4 flex items-center gap-2">
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
          SCREEN 2, 3 & 4: CLEAN GAMEPLAY & SCORING PAGE
      ===================================================================== */}
      {screen === "play" && (
        <>
          {/* Clean Wordle Top Header */}
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
                <span className="font-serif text-xl font-black tracking-tight">
                  EARWORM
                </span>
              </div>

              {/* Right: Join Group, Leaderboard Icon & Theme Toggle */}
              <div className="flex items-center gap-1">
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

          <main className="mx-auto max-w-lg px-4 pb-16 pt-6">
            {lesson && (
              <div className="space-y-6">
                {/* ===========================================================
                    ROUND 1 & ROUND 2: PLAYING THE CHALLENGE
                =========================================================== */}
                {!activeFinalSubmission && (
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

                    {/* Round 2 Notice Banner (Shown after first "Submit") */}
                    {stage === "round2" && (
                      <div className="rounded-2xl border border-[#538d4e]/40 bg-[#538d4e]/10 px-4 py-3 text-center text-xs font-bold text-zinc-800 dark:text-zinc-100">
                        Check your question scores below! You can now{" "}
                        <span className="underline">listen a second time</span>{" "}
                        and update your answers before clicking{" "}
                        <strong>Final Submission</strong>.
                      </div>
                    )}

                    {/* Questions Form */}
                    <form
                      onSubmit={
                        stage === "round1"
                          ? handleRoundOneSubmit
                          : handleFinalSubmission
                      }
                      className="space-y-5"
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
                            key={q.id}
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
                            Checking...
                          </>
                        ) : stage === "round1" ? (
                          "Submit"
                        ) : (
                          "Final Submission"
                        )}
                      </Button>
                    </form>
                  </>
                )}

                {/* ===========================================================
                    FINAL SCORING PAGE (Shown after clicking "Final Submission")
                =========================================================== */}
                {activeFinalSubmission && activeRatingTier && (
                  <div className="space-y-5">
                    <div
                      className={cn(
                        "rounded-3xl border-2 p-6 text-center shadow-lg",
                        activeRatingTier.borderClass,
                        activeRatingTier.bgClass
                      )}
                    >
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                        Today&apos;s Earworm Rating
                      </span>

                      {/* Headline Rating on Terrible / OK / Great / Amazing Scale */}
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <span className="text-3xl">
                          {activeRatingTier.emoji}
                        </span>
                        <h2
                          className={cn(
                            "font-serif text-4xl font-black uppercase tracking-tight",
                            activeRatingTier.textClass
                          )}
                        >
                          {activeRatingTier.label}
                        </h2>
                      </div>

                      <p className="mx-auto mt-1 max-w-sm text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        {activeRatingTier.tagline}
                      </p>

                      {/* 4-Tier Scale Bar: Terrible | OK | Great | Amazing */}
                      <div className="mt-5 grid grid-cols-4 gap-1.5">
                        {RATING_TIERS.map((tier) => {
                          const isCurrent = tier.id === activeRatingTier.id;
                          return (
                            <div
                              key={tier.id}
                              className={cn(
                                "flex flex-col items-center justify-center rounded-xl border py-2.5 text-center transition-all",
                                isCurrent
                                  ? tier.pillActiveClass +
                                      " border-transparent font-black scale-[1.03] shadow-sm"
                                  : "border-zinc-300/70 bg-white/60 text-zinc-500 opacity-60 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400"
                              )}
                            >
                              <span className="text-xs font-extrabold uppercase">
                                {tier.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Question Score Tiles Row */}
                      <div className="mt-4 flex justify-center gap-2">
                        {lesson.questions.map((q, idx) => {
                          const fb =
                            activeFinalSubmission.feedback.find(
                              (f) => f.questionId === q.id
                            ) ?? activeFinalSubmission.feedback[idx];
                          const tileInfo = getQuestionWordleTile(
                            fb?.score ?? 0
                          );
                          return (
                            <div
                              key={q.id}
                              className={cn(
                                "flex h-12 w-24 items-center justify-center gap-1.5 rounded-xl border font-bold",
                                tileInfo.colorClass
                              )}
                            >
                              <span className="text-xs">Q{idx + 1}:</span>
                              <span className="text-xs font-black">
                                {tileInfo.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Next Daily Earworm Countdown */}
                      <div className="mt-5">
                        <NextPuzzleCountdown />
                      </div>

                      {/* Primary Action Buttons: Today's Vocab, Share, Leaderboard */}
                      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                        <Button
                          type="button"
                          size="lg"
                          onClick={() => setShowVocabModal(true)}
                          className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                        >
                          <BookOpen className="h-4 w-4" />
                          <span>Today&apos;s Vocab</span>
                        </Button>

                        <Button
                          type="button"
                          size="lg"
                          onClick={handleShareScore}
                          className="bg-[#538d4e] text-white hover:bg-[#467a42]"
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
                          onClick={() => setShowLeaderboardModal(true)}
                          className="bg-white/90 dark:bg-zinc-900"
                        >
                          <Trophy className="h-4 w-4 text-amber-500" />
                          <span>Leaderboard</span>
                        </Button>
                      </div>
                    </div>

                    {/* Question-by-Question Explanation Cards */}
                    <div className="space-y-2.5">
                      {lesson.questions.map((q, idx) => {
                        const fb =
                          activeFinalSubmission.feedback.find(
                            (f) => f.questionId === q.id
                          ) ?? activeFinalSubmission.feedback[idx];
                        const tileInfo = getQuestionWordleTile(fb?.score ?? 0);

                        return (
                          <div
                            key={q.id}
                            className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                          >
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                Q{idx + 1}. {q.questionText}
                              </span>
                              <span
                                className={cn(
                                  "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold",
                                  tileInfo.colorClass
                                )}
                              >
                                {tileInfo.label}
                              </span>
                            </div>
                            <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                              {fb?.explanation}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Compact QA & Debug Switcher at bottom */}
                <div className="pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200/80 bg-white/70 px-3.5 py-2.5 text-xs dark:border-zinc-800/80 dark:bg-zinc-900/60">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="font-bold text-zinc-500">QA Clips:</span>
                      {[1, 2].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setClipNumber(num)}
                          className={cn(
                            "rounded-md px-2 py-0.5 font-mono text-xs font-bold cursor-pointer",
                            clipNumber === num
                              ? "bg-[#538d4e] text-white"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          )}
                        >
                          Clip #{num}
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
