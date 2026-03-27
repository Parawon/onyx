import { v } from "convex/values";
import { upsertCalendarMirrorForGoals } from "./calendarShared";
import { mutation, query } from "./_generated/server";

const RESERVED_SLUGS = new Set(["main", "new", "api", "settings", "admin"]);

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

async function requireAuth(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity.subject;
}

/**
 * Sidebar entries for `/calendar/[slug]` only — independent of Goals.
 * Shared workspace: returns all rows (no per-user filter); `userId` on rows is metadata only.
 */
export const listSubPages = query({
  args: {},
  handler: async (ctx) => {
    if ((await ctx.auth.getUserIdentity()) === null) {
      return [];
    }
    const rows = await ctx.db.query("calendarSubPages").collect();
    const merged = rows.map((n) => ({
      slug: n.slug,
      label: n.label,
      order: n.order,
    }));
    merged.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
    const bySlug = new Map<string, { slug: string; label: string; order: number }>();
    for (const row of merged) {
      const prev = bySlug.get(row.slug);
      if (!prev || row.order < prev.order) {
        bySlug.set(row.slug, row);
      }
    }
    return Array.from(bySlug.values()).sort(
      (a, b) => a.order - b.order || a.slug.localeCompare(b.slug),
    );
  },
});

/** Title + existence check for `/calendar/[slug]`. */
export const getSubPageMeta = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    if ((await ctx.auth.getUserIdentity()) === null) {
      return null;
    }
    const slug = args.slug.trim();
    if (slug.length === 0 || RESERVED_SLUGS.has(slug)) {
      return null;
    }
    const nav = await ctx.db.query("calendarSubPages").withIndex("by_slug", (q) => q.eq("slug", slug)).first();
    if (!nav) {
      return null;
    }
    return { slug: nav.slug, label: nav.label };
  },
});

export const createSubPage = mutation({
  args: {
    label: v.string(),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const rawLabel = args.label.trim();
    if (rawLabel.length === 0) {
      throw new Error("Title is required.");
    }
    const slug = args.slug?.trim() ? slugify(args.slug) : slugify(rawLabel);
    if (slug.length === 0) {
      throw new Error("Could not derive a URL from that title.");
    }
    if (RESERVED_SLUGS.has(slug)) {
      throw new Error("That URL is reserved.");
    }

    const existing = await ctx.db.query("calendarSubPages").withIndex("by_slug", (q) => q.eq("slug", slug)).first();
    if (existing) {
      throw new Error("A calendar with that URL already exists.");
    }

    const navRows = await ctx.db.query("calendarSubPages").collect();
    const maxOrder = navRows.reduce((m, r) => Math.max(m, r.order), -1);

    await ctx.db.insert("calendarSubPages", {
      slug,
      label: rawLabel,
      order: maxOrder + 1,
    });

    return { slug };
  },
});

/** Idempotent: ensures a calendar sidebar row exists for a Goals sub-page (same slug + label). Call after `goals.createSubPage` if needed. */
export const ensureForGoalsSubPage = mutation({
  args: { slug: v.string(), label: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const slug = args.slug.trim();
    const rawLabel = args.label.trim();
    if (slug.length === 0 || rawLabel.length === 0) {
      throw new Error("Slug and label are required.");
    }
    await upsertCalendarMirrorForGoals(ctx, slug, rawLabel);
  },
});

export const deleteSubPage = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const slug = args.slug.trim();
    if (slug.length === 0 || slug === "main" || RESERVED_SLUGS.has(slug)) {
      throw new Error("Invalid calendar page.");
    }
    const nav = await ctx.db.query("calendarSubPages").withIndex("by_slug", (q) => q.eq("slug", slug)).first();
    if (!nav) {
      throw new Error("Calendar page not found.");
    }
    await ctx.db.delete(nav._id);
  },
});
