import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const goalScope = v.union(
  v.literal("main"),
  v.literal("tech"),
  v.literal("marketing"),
  v.literal("partnership"),
);

async function requireUserId(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity.subject;
}

function normalizeScope(scope: "main" | "tech" | "marketing" | "partnership" | undefined) {
  return scope ?? "main";
}

function findRowForScope<
  T extends { scope?: "main" | "tech" | "marketing" | "partnership" },
>(rows: T[], scope: "main" | "tech" | "marketing" | "partnership") {
  if (scope === "main") {
    const explicitMain = rows.find((r) => r.scope === "main");
    if (explicitMain) {
      return explicitMain;
    }
    return rows.find((r) => r.scope === undefined) ?? null;
  }
  return rows.find((r) => r.scope === scope) ?? null;
}

/** Editor content for a Goals scope (main or sub-page). Legacy rows without `scope` are treated as "main". */
export const get = query({
  args: { scope: v.optional(goalScope) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const scope = normalizeScope(args.scope);
    const rows = await ctx.db
      .query("goalsEditor")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    const row = findRowForScope(rows, scope);
    return {
      _id: row?._id,
      content: row?.content ?? "[]",
    };
  },
});

export const updateContent = mutation({
  args: { content: v.string(), scope: v.optional(goalScope) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const scope = normalizeScope(args.scope);
    const rows = await ctx.db
      .query("goalsEditor")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const existing = findRowForScope(rows, scope);
    if (existing) {
      await ctx.db.patch(existing._id, { content: args.content });
    } else {
      await ctx.db.insert("goalsEditor", {
        userId,
        content: args.content,
        scope,
      });
    }
  },
});
