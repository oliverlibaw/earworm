import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

function getPreviousDateStr(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return "";
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

export const upsertUser = mutation({
  args: {
    deviceId: v.string(),
    username: v.string(),
    groupId: v.string(),
    selectedLanguage: v.optional(v.string()),
    selectedLevel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanGroup = args.groupId.trim() || "global";
    const cleanUsername = args.username.trim() || "Player";

    const existing = await ctx.db
      .query("users")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        username: cleanUsername,
        groupId: cleanGroup,
        ...(args.selectedLanguage
          ? { selectedLanguage: args.selectedLanguage }
          : {}),
        ...(args.selectedLevel ? { selectedLevel: args.selectedLevel } : {}),
      });
      return await ctx.db.get(existing._id);
    }

    const userId = await ctx.db.insert("users", {
      deviceId: args.deviceId,
      username: cleanUsername,
      groupId: cleanGroup,
      selectedLanguage: args.selectedLanguage ?? "Spanish",
      selectedLevel: args.selectedLevel ?? "B1",
      currentStreak: 0,
      lastCompletedDate: "",
    });
    return await ctx.db.get(userId);
  },
});

export const resetUserSubmission = mutation({
  args: {
    deviceId: v.string(),
    lessonId: v.id("lessons"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();
    if (!user) return { deleted: false };

    const existingSub = await ctx.db
      .query("submissions")
      .withIndex("by_user_lesson", (q) =>
        q.eq("userId", user._id).eq("lessonId", args.lessonId)
      )
      .first();

    if (existingSub) {
      await ctx.db.delete(existingSub._id);
      return { deleted: true };
    }
    return { deleted: false };
  },
});

export const setDemoStreak = mutation({
  args: {
    deviceId: v.string(),
    streak: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();
    if (!existing) return null;
    await ctx.db.patch(existing._id, {
      currentStreak: args.streak,
    });
    return await ctx.db.get(existing._id);
  },
});

export const getUserAndSubmission = query({
  args: {
    deviceId: v.string(),
    lessonId: v.optional(v.id("lessons")),
  },
  handler: async (ctx, args) => {
    if (!args.deviceId) {
      return { user: null, submission: null };
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();

    if (!user || !args.lessonId) {
      return { user: user ?? null, submission: null };
    }

    const lessonId = args.lessonId;
    const submission = await ctx.db
      .query("submissions")
      .withIndex("by_user_lesson", (q) =>
        q.eq("userId", user._id).eq("lessonId", lessonId)
      )
      .first();

    return { user, submission: submission ?? null };
  },
});

export const getGroupScoreboard = query({
  args: {
    groupId: v.string(),
    dateStr: v.string(),
    lessonId: v.optional(v.id("lessons")),
  },
  handler: async (ctx, args) => {
    const cleanGroup = args.groupId.trim() || "global";
    const users = await ctx.db
      .query("users")
      .withIndex("by_groupId", (q) => q.eq("groupId", cleanGroup))
      .collect();

    const rows = await Promise.all(
      users.map(async (u) => {
        let sub = null;
        if (args.lessonId) {
          const lessonId = args.lessonId;
          sub = await ctx.db
            .query("submissions")
            .withIndex("by_user_lesson", (q) =>
              q.eq("userId", u._id).eq("lessonId", lessonId)
            )
            .first();
        }
        if (!sub) {
          const userSubs = await ctx.db
            .query("submissions")
            .withIndex("by_date", (q) => q.eq("dateStr", args.dateStr))
            .collect();
          sub = userSubs.find((s) => s.userId === u._id) ?? null;
        }

        return {
          userId: u._id,
          deviceId: u.deviceId,
          username: u.username,
          groupId: u.groupId,
          selectedLanguage: u.selectedLanguage ?? "Spanish",
          selectedLevel: u.selectedLevel ?? "B1",
          currentStreak: u.currentStreak,
          lastCompletedDate: u.lastCompletedDate,
          todayRawScore: sub?.rawScore ?? null,
          todayMultiplier: sub?.multiplier ?? null,
          todayFinalScore: sub?.finalScore ?? null,
          playCount: sub?.playCount ?? null,
          usedSlowdown: sub?.usedSlowdown ?? null,
          usedCafeMode: sub?.usedCafeMode ?? false,
          completedToday: Boolean(sub),
        };
      })
    );

    rows.sort((a, b) => {
      const scoreA = a.todayFinalScore ?? -1;
      const scoreB = b.todayFinalScore ?? -1;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return b.currentStreak - a.currentStreak;
    });

    return rows;
  },
});

export const recordGradedSubmissionInternal = internalMutation({
  args: {
    deviceId: v.string(),
    username: v.string(),
    groupId: v.string(),
    lessonId: v.id("lessons"),
    dateStr: v.string(),
    rawScore: v.number(),
    multiplier: v.number(),
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
  },
  handler: async (ctx, args) => {
    const cleanGroup = args.groupId.trim() || "global";
    const cleanUsername = args.username.trim() || "Player";

    let user = await ctx.db
      .query("users")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();

    const yesterdayStr = getPreviousDateStr(args.dateStr);
    let newStreak = 1;

    if (user) {
      if (user.lastCompletedDate === args.dateStr) {
        newStreak = Math.max(1, user.currentStreak);
      } else if (user.lastCompletedDate === yesterdayStr) {
        newStreak = user.currentStreak + 1;
      } else {
        newStreak = Math.max(1, user.currentStreak);
      }

      await ctx.db.patch(user._id, {
        username: cleanUsername,
        groupId: cleanGroup,
        currentStreak: newStreak,
        lastCompletedDate: args.dateStr,
      });
    } else {
      const userId = await ctx.db.insert("users", {
        deviceId: args.deviceId,
        username: cleanUsername,
        groupId: cleanGroup,
        selectedLanguage: "Spanish",
        selectedLevel: "B1",
        currentStreak: 1,
        lastCompletedDate: args.dateStr,
      });
      user = await ctx.db.get(userId);
    }

    if (!user) {
      throw new Error("Failed to create or load user record");
    }

    const existingSub = await ctx.db
      .query("submissions")
      .withIndex("by_user_lesson", (q) =>
        q.eq("userId", user._id).eq("lessonId", args.lessonId)
      )
      .first();

    let submissionId;
    if (existingSub) {
      await ctx.db.patch(existingSub._id, {
        dateStr: args.dateStr,
        rawScore: args.rawScore,
        multiplier: args.multiplier,
        finalScore: args.finalScore,
        playCount: args.playCount,
        usedSlowdown: args.usedSlowdown,
        usedCafeMode: args.usedCafeMode ?? false,
        feedback: args.feedback,
      });
      submissionId = existingSub._id;
    } else {
      submissionId = await ctx.db.insert("submissions", {
        userId: user._id,
        lessonId: args.lessonId,
        dateStr: args.dateStr,
        rawScore: args.rawScore,
        multiplier: args.multiplier,
        finalScore: args.finalScore,
        playCount: args.playCount,
        usedSlowdown: args.usedSlowdown,
        usedCafeMode: args.usedCafeMode ?? false,
        feedback: args.feedback,
      });
    }

    return {
      submissionId,
      userId: user._id,
      currentStreak: newStreak,
      lastCompletedDate: args.dateStr,
    };
  },
});
