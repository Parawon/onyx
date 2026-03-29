import { v } from "convex/values";
import { upsertCalendarMirrorForGoals } from "./calendarShared";
import {
  canSeeOwned,
  getAuthInfo,
  requireRole,
  RESERVED_SLUGS,
  slugify,
  type AuthInfo,
  type Role,
  ROLE_LEVELS,
} from "./shared";
import { mutation, query } from "./_generated/server";

function hasMinRole(info: AuthInfo, min: Role): boolean {
  const userLevel = ROLE_LEVELS[info.role as Role] ?? 0;
  return userLevel >= ROLE_LEVELS[min];
}

/** Sidebar entries for `/calendar/[slug]`. Ownership-filtered. */
export const listSubPages = query({
  args: {},
  handler: async (ctx) => {
    const info = await getAuthInfo(ctx);
    if (!info) {
      return [];
    }
    const rows = await ctx.db.query("calendarSubPages").collect();
    const visible = rows.filter((r) => canSeeOwned(r.ownerUserId, info.subject, info.role));
    const merged = visible.map((n) => ({
      slug: n.slug,
      label: n.label,
      order: n.order,
      isPersonal: !!n.ownerUserId,
      isOwn: n.ownerUserId === info.subject,
    }));
    merged.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
    const bySlug = new Map<string, (typeof merged)[number]>();
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

/** Title + existence check for `/calendar/[slug]`. Ownership-filtered. */
export const getSubPageMeta = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const info = await getAuthInfo(ctx);
    if (!info) {
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
    if (!canSeeOwned(nav.ownerUserId, info.subject, info.role)) {
      return null;
    }
    return { slug: nav.slug, label: nav.label, isPersonal: !!nav.ownerUserId, isOwn: nav.ownerUserId === info.subject };
  },
});

/** Create a shared calendar sub-page. Admins+ only. */
export const createSubPage = mutation({
  args: {
    label: v.string(),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
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

/** Idempotent: ensures a calendar sidebar row exists for a Goals sub-page. */
export const ensureForGoalsSubPage = mutation({
  args: { slug: v.string(), label: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const slug = args.slug.trim();
    const rawLabel = args.label.trim();
    if (slug.length === 0 || rawLabel.length === 0) {
      throw new Error("Slug and label are required.");
    }
    await upsertCalendarMirrorForGoals(ctx, slug, rawLabel);
  },
});

/** Delete a calendar sub-page. Admins+ for shared; owner for personal. */
export const deleteSubPage = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, "team_member");
    const info = await getAuthInfo(ctx);
    if (!info) throw new Error("Not authenticated");
    const slug = args.slug.trim();
    if (slug.length === 0 || slug === "main" || RESERVED_SLUGS.has(slug)) {
      throw new Error("Invalid calendar page.");
    }
    const nav = await ctx.db.query("calendarSubPages").withIndex("by_slug", (q) => q.eq("slug", slug)).first();
    if (!nav) {
      throw new Error("Calendar page not found.");
    }
    if (nav.ownerUserId) {
      if (nav.ownerUserId !== info.subject && info.role !== "superuser") {
        throw new Error("Forbidden: not your personal calendar");
      }
    } else if (!hasMinRole(info, "admin")) {
      throw new Error("Forbidden: insufficient permissions");
    }
    await ctx.db.delete(nav._id);
  },
});
