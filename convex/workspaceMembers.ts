import { mutation, query } from "./_generated/server";

/** Upsert the current user into the shared roster (call from the client after sign-in). */
export const upsertSelf = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const clerkUserId = identity.subject;
    const name =
      identity.name?.trim() ||
      [identity.givenName, identity.familyName].filter(Boolean).join(" ").trim() ||
      identity.email ||
      identity.preferredUsername ||
      "User";
    const email = identity.email?.trim() || undefined;
    const imageUrl = identity.pictureUrl?.trim() || undefined;

    const existing = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { name, email, imageUrl });
    } else {
      await ctx.db.insert("workspaceMembers", {
        clerkUserId,
        name,
        email,
        imageUrl,
      });
    }
    return null;
  },
});

/** All workspace members for assignee pickers (global, not org-scoped). */
export const listAssignable = query({
  args: {},
  handler: async (ctx) => {
    if ((await ctx.auth.getUserIdentity()) === null) {
      return [];
    }
    const rows = await ctx.db.query("workspaceMembers").collect();
    const out = rows.map((r) => ({
      clerkUserId: r.clerkUserId,
      label: r.name,
      imageUrl: r.imageUrl ?? "",
    }));
    out.sort((a, b) => a.label.localeCompare(b.label));
    return out;
  },
});
