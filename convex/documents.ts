import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

async function requireUserId(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity.subject;
}

/** Create a new document. `userId` comes from the signed-in Clerk user. */
export const create = mutation({
  args: {
    title: v.string(),
    parentDocument: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (args.parentDocument) {
      const parent = await ctx.db.get(args.parentDocument);
      if (!parent || parent.userId !== userId) {
        throw new Error("Parent not found");
      }
    }
    return await ctx.db.insert("documents", {
      title: args.title,
      userId,
      isArchived: false,
      parentDocument: args.parentDocument,
      content: "[]",
      coverImage: "",
      isPublished: false,
    });
  },
});

/** Mark a document as archived. */
export const archive = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== userId) {
      throw new Error("Document not found");
    }
    await ctx.db.patch(args.id, { isArchived: true });
  },
});

/** Load a single document by id (owner only). Returns null if unauthenticated or not found. */
export const getById = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== identity.subject) {
      return null;
    }
    return doc;
  },
});

export const update = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
    parentDocument: v.optional(v.union(v.id("documents"), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== userId) {
      throw new Error("Document not found");
    }
    const { id, title, content, coverImage, isPublished, parentDocument } = args;
    const patch: {
      title?: string;
      content?: string;
      coverImage?: string;
      isPublished?: boolean;
      parentDocument?: Id<"documents"> | undefined;
    } = {};
    if (title !== undefined) patch.title = title;
    if (content !== undefined) patch.content = content;
    if (coverImage !== undefined) patch.coverImage = coverImage;
    if (isPublished !== undefined) patch.isPublished = isPublished;
    if (parentDocument !== undefined) {
      if (parentDocument === null) {
        patch.parentDocument = undefined;
      } else {
        const parent = await ctx.db.get(parentDocument);
        if (!parent || parent.userId !== userId) {
          throw new Error("Parent not found");
        }
        patch.parentDocument = parentDocument;
      }
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(id, patch);
    }
  },
});

/** Permanently delete a document. */
export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== userId) {
      throw new Error("Document not found");
    }
    await ctx.db.delete(args.id);
  },
});

/**
 * All non-archived documents for the current user (for sidebar tree).
 * Not in the original five operations, but required to render the tree.
 */
export const listForSidebar = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    return await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("isArchived"), false))
      .collect();
  },
});
