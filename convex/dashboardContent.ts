import { v } from "convex/values";
import { getAuthInfo, requireRole } from "./shared";
import { mutation, query } from "./_generated/server";

/** Get a dashboard content block by key. Any role can read. */
export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const info = await getAuthInfo(ctx);
    if (!info) {
      return null;
    }
    const row = await ctx.db
      .query("dashboardContent")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    return row ? { _id: row._id, content: row.content } : null;
  },
});

/** Update (or create) a dashboard content block. Admin+ only. */
export const upsert = mutation({
  args: {
    key: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const existing = await ctx.db
      .query("dashboardContent")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { content: args.content });
    } else {
      await ctx.db.insert("dashboardContent", {
        key: args.key,
        content: args.content,
      });
    }
  },
});
