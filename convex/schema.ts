import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  lessons: defineTable({
    dateStr: v.string(), // YYYY-MM-DD or "qa-bank"
    language: v.string(), // e.g., "Spanish", "French", "Japanese"
    level: v.string(), // e.g., "A2", "B1", "B2"
    isSideQuest: v.boolean(),
    clipNumber: v.optional(v.number()), // 1 or 2 for QA bank clips per level
    dialect: v.optional(v.string()), // e.g., "Mexican Spanish (CDMX) 🇲🇽", "Argentine Spanish (Buenos Aires) 🇦🇷"
    dialectNotes: v.optional(v.string()), // Accent & slang cue for the listener
    title: v.string(),
    audioStorageId: v.id("_storage"),
    audioUrl: v.string(),
    dialogue: v.array(
      v.object({
        speaker: v.string(),
        text: v.string(),
        englishTranslation: v.string(),
      })
    ),
    slangNotes: v.array(
      v.object({
        term: v.string(),
        meaning: v.string(),
        literalTranslation: v.string(),
      })
    ),
    questions: v.array(
      v.object({
        id: v.string(),
        questionText: v.string(),
        idealAnswerRubric: v.string(),
      })
    ),
  })
    .index("by_date", ["dateStr"])
    .index("by_date_lang_level_quest", [
      "dateStr",
      "language",
      "level",
      "isSideQuest",
    ]),

  users: defineTable({
    deviceId: v.string(),
    username: v.string(),
    groupId: v.string(), // defaults to "global"
    selectedLanguage: v.optional(v.string()),
    selectedLevel: v.optional(v.string()),
    currentStreak: v.number(),
    lastCompletedDate: v.string(),
  })
    .index("by_deviceId", ["deviceId"])
    .index("by_groupId", ["groupId"]),

  submissions: defineTable({
    userId: v.id("users"),
    lessonId: v.id("lessons"),
    dateStr: v.string(),
    rawScore: v.number(), // 0-100
    multiplier: v.number(), // e.g. 1.0, 1.15, 0.8
    finalScore: v.number(),
    playCount: v.number(),
    usedSlowdown: v.boolean(),
    usedCafeMode: v.optional(v.boolean()),
    feedback: v.array(
      v.object({
        questionId: v.string(),
        score: v.number(),
        explanation: v.string(),
        missedNuance: v.string(),
      })
    ),
  })
    .index("by_user_lesson", ["userId", "lessonId"])
    .index("by_date", ["dateStr"])
    .index("by_lesson", ["lessonId"]),
});
