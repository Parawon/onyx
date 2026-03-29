import type { MutationCtx } from "./_generated/server";

/**
 * Insert or update a `calendarSubPages` row to mirror a Goals sub-page (same slug + label).
 * Pass `ownerUserId` when creating the mirror for a personal Goals page.
 */
export async function upsertCalendarMirrorForGoals(
  ctx: MutationCtx,
  slug: string,
  rawLabel: string,
  ownerUserId?: string,
): Promise<void> {
  const existing = await ctx.db
    .query("calendarSubPages")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .first();
  if (existing) {
    const patch: Record<string, unknown> = {};
    if (existing.label !== rawLabel) patch.label = rawLabel;
    if (ownerUserId && existing.ownerUserId !== ownerUserId) patch.ownerUserId = ownerUserId;
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(existing._id, patch);
    }
    return;
  }

  const calendarNav = await ctx.db.query("calendarSubPages").collect();
  const maxCalOrder = calendarNav.reduce((m, r) => Math.max(m, r.order), -1);
  await ctx.db.insert("calendarSubPages", {
    slug,
    label: rawLabel,
    order: maxCalOrder + 1,
    ownerUserId,
  });
}
