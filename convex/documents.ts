import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

async function requireAuth(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity.subject;
}

/** Create a new shared document (global workspace). */
export const create = mutation({
  args: {
    title: v.string(),
    parentDocument: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    if (args.parentDocument) {
      const parent = await ctx.db.get(args.parentDocument);
      if (!parent) {
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
    await requireAuth(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) {
      throw new Error("Document not found");
    }
    await ctx.db.patch(args.id, { isArchived: true });
  },
});

/** Load a single shared document by id. */
export const getById = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) {
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
    await requireAuth(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) {
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
        if (!parent) {
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
    await requireAuth(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) {
      throw new Error("Document not found");
    }
    await ctx.db.delete(args.id);
  },
});

/**
 * All non-archived documents in the shared workspace (for sidebar tree).
 * Shared workspace: returns all rows (no per-user filter); `userId` on rows is metadata only.
 */
export const listForSidebar = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const all = await ctx.db.query("documents").collect();
    return all.filter((d) => !d.isArchived);
  },
});
