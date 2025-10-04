import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.optional(v.string()),
    clips: v.number(),
  }).index("by_clerkId", ["clerkId"]),

  questions: defineTable({
    title: v.string(),
    description: v.string(),
    type: v.union(v.literal("binary"), v.literal("numeric")),
    createdBy: v.id("users"),
    status: v.union(
      v.literal("open"),
      v.literal("closed"),
      v.literal("resolved")
    ),
    closeTime: v.number(),
    resolutionTime: v.optional(v.number()),
    resolution: v.optional(
      v.union(v.boolean(), v.number())
    ),
    minValue: v.optional(v.number()),
    maxValue: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_createdBy", ["createdBy"]),

  forecasts: defineTable({
    questionId: v.id("questions"),
    userId: v.id("users"),
    probability: v.optional(v.number()),
    prediction: v.optional(v.number()),
    confidence: v.number(),
    score: v.optional(v.number()),
    clipsChange: v.optional(v.number()),
  })
    .index("by_question", ["questionId"])
    .index("by_user", ["userId"])
    .index("by_question_and_user", ["questionId", "userId"]),
});
