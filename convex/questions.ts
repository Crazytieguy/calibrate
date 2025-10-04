import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrCrash } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_status")
      .order("desc")
      .collect();

    const questionsWithCreator = await Promise.all(
      questions.map(async (question) => {
        const creator = await ctx.db.get(question.createdBy);
        return {
          ...question,
          creatorName: creator?.name ?? "Anonymous",
        };
      })
    );

    return questionsWithCreator;
  },
});

export const get = query({
  args: { id: v.id("questions") },
  handler: async (ctx, { id }) => {
    const question = await ctx.db.get(id);
    if (!question) return null;

    const creator = await ctx.db.get(question.createdBy);
    return {
      ...question,
      creatorName: creator?.name ?? "Anonymous",
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    type: v.union(v.literal("binary"), v.literal("numeric")),
    closeTime: v.number(),
    minValue: v.optional(v.number()),
    maxValue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCrash(ctx);

    const questionId = await ctx.db.insert("questions", {
      title: args.title,
      description: args.description,
      type: args.type,
      createdBy: user._id,
      status: "open",
      closeTime: args.closeTime,
      minValue: args.minValue,
      maxValue: args.maxValue,
    });

    return questionId;
  },
});

export const resolve = mutation({
  args: {
    id: v.id("questions"),
    resolution: v.union(v.boolean(), v.number()),
  },
  handler: async (ctx, { id, resolution }) => {
    await getCurrentUserOrCrash(ctx);

    await ctx.db.patch(id, {
      status: "resolved",
      resolution,
      resolutionTime: Date.now(),
    });
  },
});
