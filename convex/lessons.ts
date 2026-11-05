import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
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

    // Query all lessons matching (dateStr, language, level, isSideQuest), newest first
    const matchesForDate = (
      await ctx.db
        .query("lessons")
        .withIndex("by_date_lang_level_quest", (q) =>
          q
            .eq("dateStr", args.dateStr)
            .eq("language", args.language)
            .eq("level", args.level)
            .eq("isSideQuest", args.isSideQuest)
        )
        .collect()
    ).reverse();

    const exactMatch =
      matchesForDate.find(
        (l) =>
          (l.clipNumber ?? 1) === targetClip &&
          l.dialect === "Mexican Spanish 🇲🇽"
      ) ?? matchesForDate.find((l) => (l.clipNumber ?? 1) === targetClip);

    if (exactMatch) {
      const freshUrl = await ctx.storage.getUrl(exactMatch.audioStorageId);
      return {
        ...exactMatch,
        audioUrl: freshUrl ?? exactMatch.audioUrl,
      };
    }

    // Check QA static bank ("qa-bank") for matching language, level, isSideQuest, and clipNumber
    const qaMatches = (
      await ctx.db
        .query("lessons")
        .withIndex("by_date_lang_level_quest", (q) =>
          q
            .eq("dateStr", "qa-bank")
            .eq("language", args.language)
            .eq("level", args.level)
            .eq("isSideQuest", args.isSideQuest)
        )
        .collect()
    ).reverse();

    const qaMatch =
      qaMatches.find(
        (l) =>
          (l.clipNumber ?? 1) === targetClip &&
          l.dialect === "Mexican Spanish 🇲🇽"
      ) ?? qaMatches.find((l) => (l.clipNumber ?? 1) === targetClip);

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
    const matches = (
      await ctx.db
        .query("lessons")
        .withIndex("by_date_lang_level_quest", (q) =>
          q
            .eq("dateStr", args.dateStr)
            .eq("language", args.language)
            .eq("level", args.level)
            .eq("isSideQuest", args.isSideQuest)
        )
        .collect()
    ).reverse();

    return (
      matches.find(
        (l) =>
          (l.clipNumber ?? 1) === targetClip &&
          l.dialect === "Mexican Spanish 🇲🇽"
      ) ?? null
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

    const sameClipMatches = matches.filter(
      (l) => (l.clipNumber ?? 1) === targetClip
    );

    if (sameClipMatches.length > 0) {
      const [keep, ...duplicates] = sameClipMatches;
      for (const dup of duplicates) {
        await ctx.db.delete(dup._id);
      }
      await ctx.db.patch(keep._id, {
        ...args,
        clipNumber: targetClip,
      });
      return keep._id;
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
      if (doc.dialect !== "Mexican Spanish 🇲🇽" || !doc.clipNumber) {
        await ctx.db.delete(doc._id);
        deleted++;
      }
    }
    return { deleted };
  },
});
