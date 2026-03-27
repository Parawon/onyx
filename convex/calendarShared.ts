import type { MutationCtx } from "./_generated/server";

/**
 * Insert or update a `calendarSubPages` row to mirror a Goals sub-page (same slug + label).
 * Safe to call from `goals.createSubPage` and from `calendar.ensureForGoalsSubPage`.
 */
export async function upsertCalendarMirrorForGoals(
  ctx: MutationCtx,
  slug: string,
  rawLabel: string,
): Promise<void> {
  const existing = await ctx.db
    .query("calendarSubPages")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .first();
  if (existing) {
    if (existing.label !== rawLabel) {
      await ctx.db.patch(existing._id, { label: rawLabel });
    }
    return;
  }

  const calendarNav = await ctx.db.query("calendarSubPages").collect();
  const maxCalOrder = calendarNav.reduce((m, r) => Math.max(m, r.order), -1);
  await ctx.db.insert("calendarSubPages", {
    slug,
    label: rawLabel,
    order: maxCalOrder + 1,
  });
}
