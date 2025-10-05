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
      .order("desc")
      .first();
  },
});

export const listForQuestion = query({
  args: { questionId: v.id("questions") },
  handler: async (ctx, { questionId }) => {
    const forecasts = await ctx.db
      .query("forecasts")
      .withIndex("by_question", (q) => q.eq("questionId", questionId))
      .collect();

    const latestByUser = new Map();
    for (const forecast of forecasts) {
      const existing = latestByUser.get(forecast.userId);
      if (!existing || forecast._creationTime > existing._creationTime) {
        latestByUser.set(forecast.userId, forecast);
      }
    }

    return await Promise.all(
      Array.from(latestByUser.values()).map(async (forecast) => {
        const user = await ctx.db.get(forecast.userId);
        return {
          ...forecast,
          userName: user && "name" in user ? (user.name ?? "Anonymous") : "Anonymous",
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

    const allForecasts = await ctx.db
      .query("forecasts")
      .withIndex("by_question", (q) => q.eq("questionId", questionId))
      .collect();

    const forecastsByUser = new Map();
    for (const forecast of allForecasts) {
      if (!forecastsByUser.has(forecast.userId)) {
        forecastsByUser.set(forecast.userId, []);
      }
      forecastsByUser.get(forecast.userId)!.push(forecast);
    }

    const resolutionTime = question.resolutionTime ?? Date.now();

    for (const [userId, userForecasts] of forecastsByUser) {
      userForecasts.sort((a: any, b: any) => a._creationTime - b._creationTime);

      let totalWeightedScore = 0;
      let totalDuration = 0;

      for (let i = 0; i < userForecasts.length; i++) {
        const forecast = userForecasts[i];
        const nextTime = i < userForecasts.length - 1
          ? userForecasts[i + 1]._creationTime
          : Math.min(question.closeTime, resolutionTime);

        const duration = nextTime - forecast._creationTime;

        if (duration > 0) {
          const p = forecast.probability / 100;
          const outcomeProb = question.resolution ? p : (1 - p);
          const logScore = Math.log(outcomeProb);

          totalWeightedScore += logScore * duration;
          totalDuration += duration;
        }
      }

      const baselineLogScore = Math.log(0.5);

      const avgLogScore = totalDuration > 0 ? totalWeightedScore / totalDuration : 0;
      const relativeScore = avgLogScore - baselineLogScore;

      const scaledScore = relativeScore * 100;
      const clipsChange = Math.round(scaledScore);

      const latestForecast = userForecasts[userForecasts.length - 1];
      await ctx.db.patch(latestForecast._id, {
        score: scaledScore,
        clipsChange,
      });

      const user = await ctx.db.get(userId);
      if (user && "clips" in user) {
        await ctx.db.patch(user._id, {
          clips: user.clips + clipsChange,
        });
      }
    }
  },
});
