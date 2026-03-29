import { v } from "convex/values";
import { upsertCalendarMirrorForGoals } from "./calendarShared";
import {
  canSeeOwned,
  getAuthInfo,
  humanizeSlug,
  requireRole,
  RESERVED_SLUGS,
  slugify,
  type AuthInfo,
  type Role,
  ROLE_LEVELS,
} from "./shared";
import { mutation, query } from "./_generated/server";

function normalizeScope(scope: string | undefined) {
  return scope ?? "main";
}

function findRowForScope<T extends { scope?: string }>(rows: T[], scope: string) {
  if (scope === "main") {
    const explicitMain = rows.find((r) => r.scope === "main");
    if (explicitMain) {
      return explicitMain;
    }
    return rows.find((r) => r.scope === undefined) ?? null;
  }
  return rows.find((r) => r.scope === scope) ?? null;
}

function hasMinRole(info: AuthInfo, min: Role): boolean {
  const userLevel = ROLE_LEVELS[info.role as Role] ?? 0;
  return userLevel >= ROLE_LEVELS[min];
}

/** Editor content for a Goals scope. Ownership-filtered. */
export const get = query({
  args: { scope: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const info = await getAuthInfo(ctx);
    if (!info) {
      return { _id: undefined, content: "[]" };
    }
    const scope = normalizeScope(args.scope);
    const rows = await ctx.db.query("goalsEditor").collect();
    const row = findRowForScope(rows, scope);
    if (row && !canSeeOwned(row.ownerUserId, info.subject, info.role)) {
      return { _id: undefined, content: "[]" };
    }
    return {
      _id: row?._id,
      content: row?.content ?? "[]",
    };
  },
});

/** Update goals content. Editors+ for shared pages; team members for their own personal page. */
export const updateContent = mutation({
  args: { content: v.string(), scope: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireRole(ctx, "team_member");
    const info = await getAuthInfo(ctx);
    if (!info) throw new Error("Not authenticated");
    const scope = normalizeScope(args.scope);
    const rows = await ctx.db.query("goalsEditor").collect();
    const existing = findRowForScope(rows, scope);

    if (existing) {
      if (existing.ownerUserId) {
        if (!canSeeOwned(existing.ownerUserId, info.subject, info.role)) {
          throw new Error("Forbidden: not your personal page");
        }
      } else if (!hasMinRole(info, "editor")) {
        throw new Error("Forbidden: insufficient permissions");
      }
      await ctx.db.patch(existing._id, { content: args.content });
    } else {
      if (!hasMinRole(info, "editor")) {
        throw new Error("Forbidden: insufficient permissions");
      }
      await ctx.db.insert("goalsEditor", {
        userId,
        content: args.content,
        scope,
      });
    }
  },
});

/** Sidebar entries for Goals sub-pages. Ownership-filtered. Returns `isPersonal` flag for UI. */
export const listSubPages = query({
  args: {},
  handler: async (ctx) => {
    const info = await getAuthInfo(ctx);
    if (!info) {
      return [];
    }

    const navFromTable = await ctx.db.query("goalsSubPages").collect();
    const editors = await ctx.db.query("goalsEditor").collect();
    const navSlugs = new Set(navFromTable.map((n) => n.slug));

    const legacyFromEditors = editors
      .filter((e) => {
        const s = e.scope;
        if (!s || s === "main") return false;
        if (navSlugs.has(s)) return false;
        return true;
      })
      .map((e) => ({
        slug: e.scope!,
        label: humanizeSlug(e.scope!),
        order: 999_999,
        ownerUserId: e.ownerUserId,
      }));

    const merged = [
      ...navFromTable.map((n) => ({
        slug: n.slug,
        label: n.label,
        order: n.order,
        ownerUserId: n.ownerUserId,
      })),
      ...legacyFromEditors,
    ];

    const visible = merged.filter((row) =>
      canSeeOwned(row.ownerUserId, info.subject, info.role),
    );

    visible.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));

    const bySlug = new Map<string, { slug: string; label: string; order: number; ownerUserId?: string }>();
    for (const row of visible) {
      const prev = bySlug.get(row.slug);
      if (!prev || row.order < prev.order) {
        bySlug.set(row.slug, row);
      }
    }
    return Array.from(bySlug.values())
      .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug))
      .map((r) => ({
        slug: r.slug,
        label: r.label,
        isPersonal: !!r.ownerUserId,
        isOwn: r.ownerUserId === info.subject,
      }));
  },
});

/** Title + existence check for `/goals/[slug]`. Ownership-filtered. */
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

    const nav = await ctx.db.query("goalsSubPages").withIndex("by_slug", (q) => q.eq("slug", slug)).first();
    if (nav) {
      if (!canSeeOwned(nav.ownerUserId, info.subject, info.role)) {
        return null;
      }
      return { slug: nav.slug, label: nav.label, isPersonal: !!nav.ownerUserId, isOwn: nav.ownerUserId === info.subject };
    }

    const rows = await ctx.db.query("goalsEditor").collect();
    const editorRow = findRowForScope(rows, slug);
    if (editorRow) {
      if (!canSeeOwned(editorRow.ownerUserId, info.subject, info.role)) {
        return null;
      }
      return { slug, label: humanizeSlug(slug), isPersonal: !!editorRow.ownerUserId, isOwn: editorRow.ownerUserId === info.subject };
    }
    return null;
  },
});

/** Create a shared Goals sub-page. Admins+ only. */
export const createSubPage = mutation({
  args: {
    label: v.string(),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireRole(ctx, "admin");
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

    const existingNav = await ctx.db.query("goalsSubPages").withIndex("by_slug", (q) => q.eq("slug", slug)).first();
    if (existingNav) {
      throw new Error("A page with that URL already exists.");
    }

    const editors = await ctx.db.query("goalsEditor").collect();
    if (findRowForScope(editors, slug)) {
      throw new Error("A page with that URL already exists.");
    }

    const navRows = await ctx.db.query("goalsSubPages").collect();
    const maxOrder = navRows.reduce((m, r) => Math.max(m, r.order), -1);

    await ctx.db.insert("goalsSubPages", {
      userId,
      slug,
      label: rawLabel,
      order: maxOrder + 1,
    });

    await ctx.db.insert("goalsEditor", {
      userId,
      content: "[]",
      scope: slug,
    });

    await upsertCalendarMirrorForGoals(ctx, slug, rawLabel);

    return { slug };
  },
});

/** Create the current user's personal Goals page. One per user. Team members+ can call. */
export const createPersonalGoalsPage = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireRole(ctx, "team_member");
    const info = await getAuthInfo(ctx);
    if (!info) throw new Error("Not authenticated");

    const allNav = await ctx.db.query("goalsSubPages").collect();
    const existing = allNav.find((n) => n.ownerUserId === info.subject);
    if (existing) {
      throw new Error("You already have a personal Goals page.");
    }

    const slug = `personal-${info.subject}`;
    const label = "My Goals";

    const maxOrder = allNav.reduce((m, r) => Math.max(m, r.order), -1);

    await ctx.db.insert("goalsSubPages", {
      userId,
      slug,
      label,
      order: maxOrder + 1,
      ownerUserId: info.subject,
    });

    await ctx.db.insert("goalsEditor", {
      userId,
      content: "[]",
      scope: slug,
      ownerUserId: info.subject,
    });

    await upsertCalendarMirrorForGoals(ctx, slug, label, info.subject);

    return { slug };
  },
});

/** Delete a Goals sub-page. Admins+ for shared; owner for personal. */
export const deleteSubPage = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, "team_member");
    const info = await getAuthInfo(ctx);
    if (!info) throw new Error("Not authenticated");
    const slug = args.slug.trim();
    if (slug.length === 0 || slug === "main" || RESERVED_SLUGS.has(slug)) {
      throw new Error("Invalid sub-page.");
    }

    const nav = await ctx.db.query("goalsSubPages").withIndex("by_slug", (q) => q.eq("slug", slug)).first();

    if (nav?.ownerUserId) {
      if (nav.ownerUserId !== info.subject && info.role !== "superuser") {
        throw new Error("Forbidden: not your personal page");
      }
    } else if (!hasMinRole(info, "admin")) {
      throw new Error("Forbidden: insufficient permissions");
    }

    if (nav) {
      await ctx.db.delete(nav._id);
    }

    const editors = await ctx.db.query("goalsEditor").collect();
    const editorRow = findRowForScope(editors, slug);
    if (editorRow) {
      await ctx.db.delete(editorRow._id);
    }

    const calendarNav = await ctx.db
      .query("calendarSubPages")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (calendarNav) {
      await ctx.db.delete(calendarNav._id);
    }

    const calEvents = await ctx.db
      .query("calendarEvents")
      .withIndex("by_goalScope", (q) => q.eq("goalScope", slug))
      .collect();
    for (const ev of calEvents) {
      await ctx.db.delete(ev._id);
    }

    if (!nav && !editorRow) {
      throw new Error("Sub-page not found.");
    }
  },
});
