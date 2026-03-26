import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function requireUserId(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity.subject;
}

/** Goals page editor content for the signed-in user (or null if not signed in). */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const row = await ctx.db
      .query("goalsEditor")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
    return {
      _id: row?._id,
      content: row?.content ?? "[]",
    };
  },
});

export const updateContent = mutation({
  args: { content: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("goalsEditor")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { content: args.content });
    } else {
      await ctx.db.insert("goalsEditor", {
        userId,
        content: args.content,
      });
    }
  },
});
