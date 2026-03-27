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

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function requireAuth(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity.subject;
}

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

/** Editor content for a Goals scope (main or sub-page slug). Legacy rows without `scope` are treated as "main". */
export const get = query({
  args: { scope: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const scope = normalizeScope(args.scope);
    const rows = await ctx.db.query("goalsEditor").collect();
    const row = findRowForScope(rows, scope);
    return {
      _id: row?._id,
      content: row?.content ?? "[]",
    };
  },
});

export const updateContent = mutation({
  args: { content: v.string(), scope: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const scope = normalizeScope(args.scope);
    const rows = await ctx.db.query("goalsEditor").collect();
    const existing = findRowForScope(rows, scope);
    if (existing) {
      await ctx.db.patch(existing._id, { content: args.content });
    } else {
      await ctx.db.insert("goalsEditor", {
        userId,
        content: args.content,
        scope,
      });
    }
  },
});

/** Sidebar entries for Goals sub-pages; merges `goalsSubPages` with legacy `goalsEditor` scopes. */
export const listSubPages = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    const navFromTable = await ctx.db.query("goalsSubPages").collect();

    const editors = await ctx.db.query("goalsEditor").collect();

    const navSlugs = new Set(navFromTable.map((n) => n.slug));

    const legacyFromEditors = editors
      .filter((e) => {
        const s = e.scope;
        if (!s || s === "main") {
          return false;
        }
        if (navSlugs.has(s)) {
          return false;
        }
        return true;
      })
      .map((e) => ({
        slug: e.scope!,
        label: humanizeSlug(e.scope!),
        order: 999_999,
      }));

    const merged = [
      ...navFromTable.map((n) => ({
        slug: n.slug,
        label: n.label,
        order: n.order,
      })),
      ...legacyFromEditors,
    ];

    merged.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
    return merged;
  },
});

/** Title + existence check for `/goals/[slug]`. */
export const getSubPageMeta = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const slug = args.slug.trim();
    if (slug.length === 0 || RESERVED_SLUGS.has(slug)) {
      return null;
    }

    const nav = await ctx.db.query("goalsSubPages").withIndex("by_slug", (q) => q.eq("slug", slug)).first();
    if (nav) {
      return { slug: nav.slug, label: nav.label };
    }

    const rows = await ctx.db.query("goalsEditor").collect();
    if (findRowForScope(rows, slug)) {
      return { slug, label: humanizeSlug(slug) };
    }
    return null;
  },
});

export const createSubPage = mutation({
  args: {
    label: v.string(),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
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

export const deleteSubPage = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const slug = args.slug.trim();
    if (slug.length === 0 || slug === "main" || RESERVED_SLUGS.has(slug)) {
      throw new Error("Invalid sub-page.");
    }

    const nav = await ctx.db.query("goalsSubPages").withIndex("by_slug", (q) => q.eq("slug", slug)).first();
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

    if (!nav && !editorRow) {
      throw new Error("Sub-page not found.");
    }
  },
});
