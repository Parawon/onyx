import type { UserIdentity } from "convex/server";
import { mutation, query } from "./_generated/server";

function displayName(identity: UserIdentity): string | undefined {
  const fromName = identity.name?.trim();
  if (fromName) {
    return fromName;
  }
  const joined = [identity.givenName, identity.familyName].filter(Boolean).join(" ").trim();
  if (joined) {
    return joined;
  }
  return identity.email?.trim() || identity.preferredUsername?.trim() || undefined;
}

/** Upsert the signed-in user from JWT claims (call after Clerk session is active). */
export const storeUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const tokenIdentifier = identity.tokenIdentifier;
    const subject = identity.subject;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .first();

    const name = displayName(identity);
    const email = identity.email?.trim() || undefined;
    const pictureUrl = identity.pictureUrl?.trim() || undefined;

    if (existing) {
      await ctx.db.patch(existing._id, { subject, name, email, pictureUrl });
    } else {
      await ctx.db.insert("users", {
        tokenIdentifier,
        subject,
        name,
        email,
        pictureUrl,
      });
    }
    return null;
  },
});

/** Everyone who has opened Onyx while signed in — for assignee pickers. */
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    if ((await ctx.auth.getUserIdentity()) === null) {
      return [];
    }
    const rows = await ctx.db.query("users").collect();
    const out = rows.map((r) => ({
      clerkUserId: r.subject,
      label: r.name?.trim() || r.email?.trim() || "User",
      imageUrl: r.pictureUrl ?? "",
    }));
    out.sort((a, b) => a.label.localeCompare(b.label));
    return out;
  },
});
