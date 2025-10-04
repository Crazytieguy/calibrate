import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrCrash } from "./users";

export const submit = mutation({
  args: {
    questionId: v.id("questions"),
    probability: v.optional(v.number()),
    prediction: v.optional(v.number()),
    confidence: v.number(),
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

    const existingForecast = await ctx.db
      .query("forecasts")
      .withIndex("by_question_and_user", (q) =>
        q.eq("questionId", args.questionId).eq("userId", user._id)
      )
      .unique();

    if (existingForecast) {
      await ctx.db.patch(existingForecast._id, {
        probability: args.probability,
        prediction: args.prediction,
        confidence: args.confidence,
      });
      return existingForecast._id;
    }

    return await ctx.db.insert("forecasts", {
      questionId: args.questionId,
      userId: user._id,
      probability: args.probability,
      prediction: args.prediction,
      confidence: args.confidence,
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
      let score = 0;
      let clipsChange = 0;

      if (question.type === "binary" && typeof question.resolution === "boolean") {
        const prob = forecast.probability ?? 50;
        const actualProb = question.resolution ? 100 : 0;
        const error = Math.abs(prob - actualProb);
        score = 100 - error;

        const baseReward = (score / 100) * 100;
        clipsChange = Math.round(baseReward * (forecast.confidence / 10));
      } else if (question.type === "numeric" && typeof question.resolution === "number") {
        const pred = forecast.prediction ?? ((question.minValue ?? 0) + (question.maxValue ?? 100)) / 2;
        const range = (question.maxValue ?? 100) - (question.minValue ?? 0);
        const error = Math.abs(pred - question.resolution);
        const normalizedError = error / range;
        score = Math.max(0, 100 * (1 - normalizedError));

        const baseReward = (score / 100) * 100;
        clipsChange = Math.round(baseReward * (forecast.confidence / 10));
      }

      await ctx.db.patch(forecast._id, {
        score,
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
