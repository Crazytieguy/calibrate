import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

test("time-weighted scoring: single forecast", async () => {
  const t = convexTest(schema, modules);

  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      clerkId: "test-user",
      name: "Test User",
      clips: 100,
    });
  });

  const asUser = t.withIdentity({ subject: "test-user" });

  const questionId = await asUser.mutation(api.questions.create, {
    title: "Will it rain tomorrow?",
    description: "Test question",
    closeTime: Date.now() + 24 * 60 * 60 * 1000,
  });

  await asUser.mutation(api.forecasts.submit, {
    questionId,
    probability: 80,
  });

  await asUser.mutation(api.questions.resolve, {
    id: questionId,
    resolution: true,
  });

  await asUser.mutation(api.forecasts.scoreForecasts, {
    questionId,
  });

  const user = await t.run(async (ctx) => {
    return await ctx.db.get(userId);
  });

  const forecasts = await t.run(async (ctx) => {
    return await ctx.db
      .query("forecasts")
      .withIndex("by_question", (q) => q.eq("questionId", questionId))
      .collect();
  });

  const forecast = forecasts[0];
  expect(forecast.score).toBeDefined();
  expect(forecast.clipsChange).toBeDefined();
  expect(user?.clips).toBe(100 + forecast.clipsChange!);
});

test("time-weighted scoring: multiple forecasts", async () => {
  const t = convexTest(schema, modules);

  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      clerkId: "test-user-2",
      name: "Test User 2",
      clips: 100,
    });
  });

  const asUser = t.withIdentity({ subject: "test-user-2" });

  const questionId = await asUser.mutation(api.questions.create, {
    title: "Will it rain?",
    description: "Test question",
    closeTime: Date.now() + 24 * 60 * 60 * 1000,
  });

  await asUser.mutation(api.forecasts.submit, {
    questionId,
    probability: 50,
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  await asUser.mutation(api.forecasts.submit, {
    questionId,
    probability: 80,
  });

  await asUser.mutation(api.questions.resolve, {
    id: questionId,
    resolution: true,
  });

  await asUser.mutation(api.forecasts.scoreForecasts, {
    questionId,
  });

  const forecasts = await t.run(async (ctx) => {
    return await ctx.db
      .query("forecasts")
      .withIndex("by_question", (q) => q.eq("questionId", questionId))
      .collect();
  });

  expect(forecasts.length).toBe(2);

  const latestForecast = forecasts.reduce((latest, f) =>
    f._creationTime > latest._creationTime ? f : latest
  );

  expect(latestForecast.score).toBeDefined();
  expect(latestForecast.clipsChange).toBeDefined();
});

test("baseline comparison: 50% should score ~0", async () => {
  const t = convexTest(schema, modules);

  await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      clerkId: "test-user-3",
      name: "Test User 3",
      clips: 100,
    });
  });

  const asUser = t.withIdentity({ subject: "test-user-3" });

  const questionId = await asUser.mutation(api.questions.create, {
    title: "Test question",
    description: "Test",
    closeTime: Date.now() + 24 * 60 * 60 * 1000,
  });

  await asUser.mutation(api.forecasts.submit, {
    questionId,
    probability: 50,
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  await asUser.mutation(api.questions.resolve, {
    id: questionId,
    resolution: true,
  });

  await asUser.mutation(api.forecasts.scoreForecasts, {
    questionId,
  });

  const forecasts = await t.run(async (ctx) => {
    return await ctx.db
      .query("forecasts")
      .withIndex("by_question", (q) => q.eq("questionId", questionId))
      .collect();
  });

  const forecast = forecasts[0];

  expect(Math.abs(forecast.score!)).toBeLessThan(1);
  expect(forecast.clipsChange).toBe(0);
});

test("getForQuestion returns latest forecast", async () => {
  const t = convexTest(schema, modules);

  await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      clerkId: "test-user-4",
      name: "Test User 4",
      clips: 100,
    });
  });

  const asUser = t.withIdentity({ subject: "test-user-4" });

  const questionId = await asUser.mutation(api.questions.create, {
    title: "Test",
    description: "Test",
    closeTime: Date.now() + 24 * 60 * 60 * 1000,
  });

  await asUser.mutation(api.forecasts.submit, {
    questionId,
    probability: 30,
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  await asUser.mutation(api.forecasts.submit, {
    questionId,
    probability: 70,
  });

  const latest = await asUser.query(api.forecasts.getForQuestion, {
    questionId,
  });

  expect(latest?.probability).toBe(70);
});
