import { v } from "convex/values";
import { getAuthInfo, requireRole, type AuthInfo, type Role, ROLE_LEVELS } from "./shared";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

function hasMinRole(info: AuthInfo, min: Role): boolean {
  const userLevel = ROLE_LEVELS[info.role as Role] ?? 0;
  return userLevel >= ROLE_LEVELS[min];
}

/** Create a new document. Team members and above can create. */
export const create = mutation({
  args: {
    title: v.string(),
    parentDocument: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const userId = await requireRole(ctx, "team_member");
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

/** Mark a document as archived. Editors+ can archive any; team members can archive their own. */
export const archive = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await requireRole(ctx, "team_member");
    const info = await getAuthInfo(ctx);
    if (!info) throw new Error("Not authenticated");
    const doc = await ctx.db.get(args.id);
    if (!doc) {
      throw new Error("Document not found");
    }
    if (!hasMinRole(info, "editor") && doc.userId !== userId) {
      throw new Error("Forbidden: you can only archive your own notes");
    }
    await ctx.db.patch(args.id, { isArchived: true });
  },
});

/** Load a single document by id. Any role can read. */
export const getById = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const info = await getAuthInfo(ctx);
    if (!info) {
      return null;
    }
    const doc = await ctx.db.get(args.id);
    if (!doc) {
      return null;
    }
    return doc;
  },
});

/** Update a document. Editors+ can update any; team members can only update their own. */
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
    const userId = await requireRole(ctx, "team_member");
    const info = await getAuthInfo(ctx);
    if (!info) throw new Error("Not authenticated");
    const doc = await ctx.db.get(args.id);
    if (!doc) {
      throw new Error("Document not found");
    }
    if (!hasMinRole(info, "editor") && doc.userId !== userId) {
      throw new Error("Forbidden: you can only edit your own notes");
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

/** Permanently delete a document. Admins+ can delete any; lower roles can only delete their own. */
export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await requireRole(ctx, "team_member");
    const info = await getAuthInfo(ctx);
    if (!info) throw new Error("Not authenticated");
    const doc = await ctx.db.get(args.id);
    if (!doc) {
      throw new Error("Document not found");
    }
    if (!hasMinRole(info, "admin") && doc.userId !== userId) {
      throw new Error("Forbidden: you can only delete your own notes");
    }
    await ctx.db.delete(args.id);
  },
});

/** All non-archived documents (for sidebar tree). Any role can list. */
export const listForSidebar = query({
  args: {},
  handler: async (ctx) => {
    const info = await getAuthInfo(ctx);
    if (!info) {
      return [];
    }
    const all = await ctx.db.query("documents").collect();
    return all.filter((d) => !d.isArchived);
  },
});
