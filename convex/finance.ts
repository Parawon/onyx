import { v } from "convex/values";
import {
  getAuthInfo,
  requireRole,
  slugify,
  RESERVED_SLUGS,
  ROLE_LEVELS,
  type AuthInfo,
  type Role,
} from "./shared";
import { mutation, query } from "./_generated/server";

function hasMinRole(info: AuthInfo, min: Role): boolean {
  const userLevel = ROLE_LEVELS[info.role as Role] ?? 0;
  return userLevel >= ROLE_LEVELS[min];
}

function makeDefaultTable(cols: number, rows: number): string {
  const columns = Array.from({ length: cols }, (_, i) => `Col ${i + 1}`);
  const rowNames = Array.from({ length: rows }, (_, i) => `Row ${i + 1}`);
  const rowData = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ""),
  );
  return JSON.stringify({ columns, rowNames, rows: rowData });
}

export const create = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireRole(ctx, "admin");
    const trimmed = args.title.trim();
    if (trimmed.length === 0) throw new Error("Title is required");

    let slug = slugify(trimmed);
    if (slug.length === 0) slug = "finance-page";
    if (RESERVED_SLUGS.has(slug)) slug = `${slug}-1`;

    const existing = await ctx.db
      .query("financePages")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const last = await ctx.db
      .query("financePages")
      .withIndex("by_order")
      .order("desc")
      .first();
    const order = (last?.order ?? 0) + 1;

    const id = await ctx.db.insert("financePages", {
      title: trimmed,
      slug,
      ownerUserId: userId,
      tableData: makeDefaultTable(5, 5),
      order,
    });
    return { id, slug };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const info = await getAuthInfo(ctx);
    if (!info) return [];
    const pages = await ctx.db
      .query("financePages")
      .withIndex("by_order")
      .order("asc")
      .take(200);
    return pages.map((p) => ({
      _id: p._id,
      title: p.title,
      slug: p.slug,
      ownerUserId: p.ownerUserId,
      isOwn: p.ownerUserId === info.subject,
    }));
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const info = await getAuthInfo(ctx);
    if (!info) return null;
    const page = await ctx.db
      .query("financePages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!page) return null;
    return {
      ...page,
      isOwn: page.ownerUserId === info.subject,
      canEdit: hasMinRole(info, "admin") || page.ownerUserId === info.subject,
      canDelete:
        hasMinRole(info, "admin") || page.ownerUserId === info.subject,
    };
  },
});

export const updateTableData = mutation({
  args: {
    slug: v.string(),
    tableData: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireRole(ctx, "admin");
    const info = await getAuthInfo(ctx);
    if (!info) throw new Error("Not authenticated");

    const page = await ctx.db
      .query("financePages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!page) throw new Error("Finance page not found");

    if (!hasMinRole(info, "admin") && page.ownerUserId !== userId) {
      throw new Error("Forbidden: insufficient permissions");
    }

    await ctx.db.patch(page._id, { tableData: args.tableData });
  },
});

export const updateTitle = mutation({
  args: {
    slug: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireRole(ctx, "admin");
    const info = await getAuthInfo(ctx);
    if (!info) throw new Error("Not authenticated");

    const page = await ctx.db
      .query("financePages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!page) throw new Error("Finance page not found");

    if (!hasMinRole(info, "admin") && page.ownerUserId !== userId) {
      throw new Error("Forbidden: insufficient permissions");
    }

    await ctx.db.patch(page._id, { title: args.title.trim() });
  },
});

export const remove = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireRole(ctx, "admin");
    const info = await getAuthInfo(ctx);
    if (!info) throw new Error("Not authenticated");

    const page = await ctx.db
      .query("financePages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!page) throw new Error("Finance page not found");

    if (!hasMinRole(info, "admin") && page.ownerUserId !== userId) {
      throw new Error("Forbidden: only the creator or admin can delete");
    }

    await ctx.db.delete(page._id);
  },
});
