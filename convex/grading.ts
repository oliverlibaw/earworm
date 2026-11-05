import { GoogleGenAI, Type } from "@google/genai";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";

export interface QuestionFeedback {
  questionId: string;
  score: number; // 0-34 (sum across 3 questions = 0-100)
  explanation: string;
  missedNuance: string;
}

export interface GradingResult {
  rawScore: number;
  feedback: QuestionFeedback[];
}

/**
 * Deterministic rubric-keyword grader fallback when live Gemini API is unavailable.
 * Strictly checks concept overlap so unrelated answers score low (0-5 pts)
 * while genuine gist comprehension is rewarded (18-34 pts).
 */
function gradeWithHeuristicFallback(params: {
  questions: Array<{
    id: string;
    questionText: string;
    idealAnswerRubric: string;
  }>;
  slangNotes: Array<{
    term: string;
    meaning: string;
    literalTranslation: string;
  }>;
  userAnswers: Array<{ questionId: string; answerText: string }>;
}): GradingResult {
  const maxPerQuestion = [34, 33, 33];
  const stopWords = new Set([
    "the",
    "and",
    "that",
    "this",
    "with",
    "from",
    "they",
    "their",
    "have",
    "has",
    "was",
    "were",
    "for",
    "are",
    "but",
    "not",
    "she",
    "him",
    "her",
    "his",
    "because",
    "about",
    "into",
    "while",
    "when",
    "what",
    "where",
    "which",
    "after",
    "before",
    "also",
    "very",
    "some",
    "them",
    "then",
  ]);

  const feedback: QuestionFeedback[] = params.questions.map((q, idx) => {
    const maxPts = maxPerQuestion[idx] ?? 33;
    const userObj = params.userAnswers.find((a) => a.questionId === q.id);
    const answer = (userObj?.answerText ?? "").trim();
    const relatedSlang = params.slangNotes[idx] ?? params.slangNotes[0];

    if (!answer || answer.length < 2) {
      return {
        questionId: q.id,
        score: 0,
        explanation: `No answer provided (0/${maxPts} pts). Expected answer: ${q.idealAnswerRubric}`,
        missedNuance: relatedSlang
          ? `Slang tip: "${relatedSlang.term}" means "${relatedSlang.meaning}" (literally "${relatedSlang.literalTranslation}").`
          : "Listen closely for the speaker's main reason in this turn.",
      };
    }

    const rubricWords = q.idealAnswerRubric
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñüçàèìòù\s]/gi, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

    const lowerAnswer = answer.toLowerCase();
    let matchedCount = 0;
    for (const rw of rubricWords) {
      const stem = rw.slice(0, Math.max(4, rw.length - 2));
      if (lowerAnswer.includes(stem)) {
        matchedCount++;
      }
    }

    // If zero concept overlap with rubric, score is 0-4 pts (not 20 pts!)
    if (matchedCount === 0) {
      const minimalEffortScore =
        lowerAnswer.includes("don't know") ||
        lowerAnswer.includes("idk") ||
        answer.length < 8
          ? 0
          : 4;
      return {
        questionId: q.id,
        score: minimalEffortScore,
        explanation: `Missed the key details on this question (${minimalEffortScore}/${maxPts} pts). What actually happened: ${q.idealAnswerRubric}`,
        missedNuance: relatedSlang
          ? `Key phrase to listen for: "${relatedSlang.term}" — ${relatedSlang.meaning} (literally "${relatedSlang.literalTranslation}").`
          : `Check the transcript below to see how the speakers phrased this.`,
      };
    }

    const matchRatio =
      rubricWords.length > 0 ? matchedCount / rubricWords.length : 0.5;
    const normalizedScore = Math.min(
      1,
      Math.max(0.45, matchRatio * 1.7 + (matchedCount >= 3 ? 0.25 : 0.1))
    );
    const score = Math.round(normalizedScore * maxPts);

    const mentionedSlang =
      relatedSlang &&
      (lowerAnswer.includes(relatedSlang.term.toLowerCase()) ||
        lowerAnswer.includes(
          relatedSlang.meaning.toLowerCase().split(/\s+/)[0] ?? ""
        ));

    return {
      questionId: q.id,
      score,
      explanation:
        score >= maxPts * 0.82
          ? `Spot on! (${score}/${maxPts} pts) — You caught the key details: ${q.idealAnswerRubric}`
          : `Partial gist captured (${score}/${maxPts} pts) — You caught part of it! Full answer: ${q.idealAnswerRubric}`,
      missedNuance: mentionedSlang
        ? `Nice job catching the slang nuance around "${relatedSlang.term}"!`
        : relatedSlang
          ? `Slang spotlight: "${relatedSlang.term}" literally means "${relatedSlang.literalTranslation}", used here to mean "${relatedSlang.meaning}".`
          : `Notice how the speakers use conversational fillers to soften the conflict.`,
    };
  });

  const rawScore = Math.min(
    100,
    feedback.reduce((sum, f) => sum + f.score, 0)
  );
  return { rawScore, feedback };
}

export const submitAndGrade = action({
  args: {
    deviceId: v.string(),
    username: v.string(),
    groupId: v.string(),
    lessonId: v.id("lessons"),
    userAnswers: v.array(
      v.object({
        questionId: v.string(),
        answerText: v.string(),
      })
    ),
    playCount: v.number(),
    usedSlowdown: v.boolean(),
    usedCafeMode: v.optional(v.boolean()),
    isRoundOneCheck: v.optional(v.boolean()),
    apiKey: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    submissionId: Id<"submissions"> | null;
    rawScore: number;
    multiplier: number;
    finalScore: number;
    currentStreak: number;
    feedback: QuestionFeedback[];
    gradedBy: string;
  }> => {
    const lesson = await ctx.runQuery(internal.lessons.getLessonByIdInternal, {
      lessonId: args.lessonId,
    });

    if (!lesson) {
      throw new Error(`Lesson not found for ID: ${args.lessonId}`);
    }

    const apiKey = args.apiKey || process.env.GEMINI_API_KEY;
    let gradingResult: GradingResult | null = null;
    let gradedBy = "rubric-grader";

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are a supportive, fair, and transparent listening comprehension grader for the daily language game "Earworm".
Grade the player's 3 open-ended answers against the dialogue transcript, slang notes, and question rubrics.

Scoring Rubric (0 to 100 total):
- Question 1 is worth 0 to 34 points.
- Question 2 is worth 0 to 33 points.
- Question 3 is worth 0 to 33 points.
- 28–34 pts = Spot-on gist comprehension (reward informal phrasing generously if they understood what happened).
- 15–27 pts = Partial gist (caught one part of the question or general topic, missed a specific detail).
- 0–14 pts = Incorrect, vague, or missed the point.
- "rawScore" MUST equal the sum of the 3 question scores (0 to 100).
- In "explanation", state clearly what they got right and what the full answer was.
- In "missedNuance", highlight a specific regional slang term or idiom from this part of the dialogue.

Dialogue (${lesson.language} - ${lesson.level} - ${lesson.dialect ?? ""}):
${JSON.stringify(lesson.dialogue, null, 2)}

Slang Notes:
${JSON.stringify(lesson.slangNotes, null, 2)}

Questions & Rubrics:
${JSON.stringify(lesson.questions, null, 2)}

Player's Submitted Answers:
${JSON.stringify(args.userAnswers, null, 2)}`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              required: ["rawScore", "feedback"],
              properties: {
                rawScore: { type: Type.NUMBER },
                feedback: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    required: [
                      "questionId",
                      "score",
                      "explanation",
                      "missedNuance",
                    ],
                    properties: {
                      questionId: { type: Type.STRING },
                      score: { type: Type.NUMBER },
                      explanation: { type: Type.STRING },
                      missedNuance: { type: Type.STRING },
                    },
                  },
                },
              },
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text) as GradingResult;
          if (parsed && Array.isArray(parsed.feedback)) {
            const mappedFeedback = lesson.questions.map(
              (
                q: {
                  id: string;
                  questionText: string;
                  idealAnswerRubric: string;
                },
                idx: number
              ) => {
                const maxPts = idx === 0 ? 34 : 33;
                const match =
                  parsed.feedback.find((f) => f.questionId === q.id) ??
                  parsed.feedback[idx];
                return {
                  questionId: q.id,
                  score: Math.max(
                    0,
                    Math.min(maxPts, Math.round(match?.score ?? 0))
                  ),
                  explanation:
                    match?.explanation ?? `Expected: ${q.idealAnswerRubric}`,
                  missedNuance:
                    match?.missedNuance ??
                    "Listen for the regional slang expressions in the transcript below.",
                };
              }
            );
            const sumRaw = Math.min(
              100,
              mappedFeedback.reduce((acc, f) => acc + f.score, 0)
            );
            gradingResult = {
              rawScore: sumRaw,
              feedback: mappedFeedback,
            };
            gradedBy = "gemini-2.5-flash";
          }
        }
      } catch (err) {
        console.warn(
          "[submitAndGrade] gemini-2.5-flash call failed, using deterministic rubric grader:",
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    if (!gradingResult) {
      gradingResult = gradeWithHeuristicFallback({
        questions: lesson.questions,
        slangNotes: lesson.slangNotes,
        userAnswers: args.userAnswers,
      });
    }

    // Transparent Score Modifiers:
    // Base = 1.0x
    // Slowdown (0.75x) = -20% (-0.20x) penalty ("Slow the clip down if you need, but it'll hurt your score")
    // Crowded Cafe Mode = +15% (+0.15x) bonus ("For bonus points, add Crowded Cafe background noise")
    let multiplier = 1.0;
    if (args.usedSlowdown) {
      multiplier -= 0.2;
    }
    if (args.usedCafeMode) {
      multiplier += 0.15;
    }
    multiplier = Number(multiplier.toFixed(2));

    const finalScore = Math.round(gradingResult.rawScore * multiplier);

    // If this is the Round 1 mid-game check, return question scores without locking final submission in DB
    if (args.isRoundOneCheck) {
      return {
        submissionId: null,
        rawScore: gradingResult.rawScore,
        multiplier,
        finalScore,
        currentStreak: 0,
        feedback: gradingResult.feedback,
        gradedBy,
      };
    }

    const saved = await ctx.runMutation(
      internal.users.recordGradedSubmissionInternal,
      {
        deviceId: args.deviceId,
        username: args.username,
        groupId: args.groupId,
        lessonId: args.lessonId,
        dateStr: lesson.dateStr,
        rawScore: gradingResult.rawScore,
        multiplier,
        finalScore,
        playCount: args.playCount,
        usedSlowdown: args.usedSlowdown,
        usedCafeMode: args.usedCafeMode ?? false,
        feedback: gradingResult.feedback,
      }
    );

    return {
      submissionId: saved.submissionId,
      rawScore: gradingResult.rawScore,
      multiplier,
      finalScore,
      currentStreak: saved.currentStreak,
      feedback: gradingResult.feedback,
      gradedBy,
    };
  },
});
