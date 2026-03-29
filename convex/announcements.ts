import { v } from "convex/values";
import { getAuthInfo, requireRole } from "./shared";
import { mutation, query } from "./_generated/server";

/** List all announcements, newest first. Any role can read. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const info = await getAuthInfo(ctx);
    if (!info) {
      return [];
    }
    const rows = await ctx.db
      .query("announcements")
      .withIndex("by_createdAt")
      .order("desc")
      .take(50);
    return rows.map((r) => ({
      _id: r._id,
      title: r.title,
      content: r.content,
      authorUserId: r.authorUserId,
      createdAt: r.createdAt,
    }));
  },
});

/** Create an announcement. Admin+ only. */
export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireRole(ctx, "admin");
    const title = args.title.trim();
    if (title.length === 0) {
      throw new Error("Title is required.");
    }
    return await ctx.db.insert("announcements", {
      authorUserId: userId,
      title,
      content: args.content,
      createdAt: Date.now(),
    });
  },
});

/** Delete an announcement. Admin+ only. */
export const remove = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const doc = await ctx.db.get(args.id);
    if (!doc) {
      throw new Error("Announcement not found.");
    }
    await ctx.db.delete(args.id);
  },
});
