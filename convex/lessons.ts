import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

export const getLessonById = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.lessonId);
  },
});

export const getLessonByIdInternal = internalQuery({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.lessonId);
  },
});

export const getLessonForPuzzle = query({
  args: {
    dateStr: v.string(),
    language: v.string(),
    level: v.string(),
    isSideQuest: v.boolean(),
    clipNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const targetClip = args.clipNumber ?? 1;

    // Query all lessons matching (dateStr, language, level, isSideQuest)
    const matchesForDate = await ctx.db
      .query("lessons")
      .withIndex("by_date_lang_level_quest", (q) =>
        q
          .eq("dateStr", args.dateStr)
          .eq("language", args.language)
          .eq("level", args.level)
          .eq("isSideQuest", args.isSideQuest)
      )
      .collect();

    const exactMatch =
      matchesForDate.find((l) => (l.clipNumber ?? 1) === targetClip) ??
      (targetClip === 1 ? matchesForDate[0] : undefined);

    if (exactMatch) {
      const freshUrl = await ctx.storage.getUrl(exactMatch.audioStorageId);
      return {
        ...exactMatch,
        audioUrl: freshUrl ?? exactMatch.audioUrl,
      };
    }

    // Check QA static bank ("qa-bank") for matching language, level, isSideQuest, and clipNumber
    const qaMatches = await ctx.db
      .query("lessons")
      .withIndex("by_date_lang_level_quest", (q) =>
        q
          .eq("dateStr", "qa-bank")
          .eq("language", args.language)
          .eq("level", args.level)
          .eq("isSideQuest", args.isSideQuest)
      )
      .collect();

    const qaMatch =
      qaMatches.find((l) => (l.clipNumber ?? 1) === targetClip) ??
      (targetClip === 1 ? qaMatches[0] : undefined);

    if (!qaMatch) return null;
    const freshUrl = await ctx.storage.getUrl(qaMatch.audioStorageId);
    return {
      ...qaMatch,
      audioUrl: freshUrl ?? qaMatch.audioUrl,
    };
  },
});

export const checkExistingLessonInternal = internalQuery({
  args: {
    dateStr: v.string(),
    language: v.string(),
    level: v.string(),
    isSideQuest: v.boolean(),
    clipNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const targetClip = args.clipNumber ?? 1;
    const matches = await ctx.db
      .query("lessons")
      .withIndex("by_date_lang_level_quest", (q) =>
        q
          .eq("dateStr", args.dateStr)
          .eq("language", args.language)
          .eq("level", args.level)
          .eq("isSideQuest", args.isSideQuest)
      )
      .collect();

    return (
      matches.find((l) => (l.clipNumber ?? 1) === targetClip) ?? null
    );
  },
});

export const saveLessonInternal = internalMutation({
  args: {
    dateStr: v.string(),
    language: v.string(),
    level: v.string(),
    isSideQuest: v.boolean(),
    clipNumber: v.optional(v.number()),
    dialect: v.optional(v.string()),
    dialectNotes: v.optional(v.string()),
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
  },
  handler: async (ctx, args) => {
    const targetClip = args.clipNumber ?? 1;
    const matches = await ctx.db
      .query("lessons")
      .withIndex("by_date_lang_level_quest", (q) =>
        q
          .eq("dateStr", args.dateStr)
          .eq("language", args.language)
          .eq("level", args.level)
          .eq("isSideQuest", args.isSideQuest)
      )
      .collect();

    const existing = matches.find((l) => (l.clipNumber ?? 1) === targetClip);

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        clipNumber: targetClip,
      });
      return existing._id;
    }

    return await ctx.db.insert("lessons", {
      ...args,
      clipNumber: targetClip,
    });
  },
});

/**
 * Deletes any old lessons that lacked clipNumber/dialect so QA starts 100% clean.
 */
export const clearLegacyLessonsInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("lessons").collect();
    let deleted = 0;
    for (const doc of all) {
      if (!doc.dialect || !doc.clipNumber) {
        await ctx.db.delete(doc._id);
        deleted++;
      }
    }
    return { deleted };
  },
});
