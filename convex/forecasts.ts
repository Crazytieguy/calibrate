import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrCrash } from "./users";

export const submit = mutation({
  args: {
    questionId: v.id("questions"),
    probability: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCrash(ctx);
    const question = await ctx.db.get(args.questionId);

    if (!question) {
      throw new Error("Question not found");
    }

    if (question.status !== "open") {
      throw new Error("Question is not open for forecasts");
    }

    if (Date.now() > question.closeTime) {
      throw new Error("Question has closed");
    }

    if (args.probability < 1 || args.probability > 99) {
      throw new Error("Probability must be between 1% and 99%");
    }

    const existingForecast = await ctx.db
      .query("forecasts")
      .withIndex("by_question_and_user", (q) =>
        q.eq("questionId", args.questionId).eq("userId", user._id)
      )
      .unique();

    if (existingForecast) {
      await ctx.db.patch(existingForecast._id, {
        probability: args.probability,
      });
      return existingForecast._id;
    }

    return await ctx.db.insert("forecasts", {
      questionId: args.questionId,
      userId: user._id,
      probability: args.probability,
    });
  },
});

export const getForQuestion = query({
  args: { questionId: v.id("questions") },
  handler: async (ctx, { questionId }) => {
    const user = await getCurrentUserOrCrash(ctx);

    return await ctx.db
      .query("forecasts")
      .withIndex("by_question_and_user", (q) =>
        q.eq("questionId", questionId).eq("userId", user._id)
      )
      .unique();
  },
});

export const listForQuestion = query({
  args: { questionId: v.id("questions") },
  handler: async (ctx, { questionId }) => {
    const forecasts = await ctx.db
      .query("forecasts")
      .withIndex("by_question", (q) => q.eq("questionId", questionId))
      .collect();

    return await Promise.all(
      forecasts.map(async (forecast) => {
        const user = await ctx.db.get(forecast.userId);
        return {
          ...forecast,
          userName: user?.name ?? "Anonymous",
        };
      })
    );
  },
});

export const scoreForecasts = mutation({
  args: { questionId: v.id("questions") },
  handler: async (ctx, { questionId }) => {
    const question = await ctx.db.get(questionId);

    if (!question || question.status !== "resolved" || question.resolution === undefined) {
      throw new Error("Question must be resolved to score forecasts");
    }

    const forecasts = await ctx.db
      .query("forecasts")
      .withIndex("by_question", (q) => q.eq("questionId", questionId))
      .collect();

    for (const forecast of forecasts) {
      const p = forecast.probability / 100;
      const outcomeProb = question.resolution ? p : (1 - p);

      const logScore = Math.log2(outcomeProb) * 100 + 100;
      const clipsChange = Math.round(logScore);

      await ctx.db.patch(forecast._id, {
        score: logScore,
        clipsChange,
      });

      const user = await ctx.db.get(forecast.userId);
      if (user) {
        await ctx.db.patch(user._id, {
          clips: user.clips + clipsChange,
        });
      }
    }
  },
});
