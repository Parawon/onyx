import type { UserIdentity } from "convex/server";
import { mutation, query } from "./_generated/server";

async function requireAuth(ctx: { auth: { getUserIdentity: () => Promise<UserIdentity | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
}

/** Upsert the current user into the shared roster (call from the client after sign-in). */
export const upsertSelf = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuth(ctx);
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
    await requireAuth(ctx);
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
