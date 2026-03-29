import { v } from "convex/values";
import type { UserIdentity } from "convex/server";
import { requireRole, VALID_ROLES } from "./shared";
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

    const superuserId = process.env.SUPERUSER_CLERK_ID;
    const isSuperuser = superuserId != null && superuserId.length > 0 && subject === superuserId;

    if (existing) {
      const patch: Record<string, unknown> = { subject, name, email, pictureUrl };
      if (isSuperuser && existing.role !== "superuser") {
        patch.role = "superuser";
      }
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("users", {
        tokenIdentifier,
        subject,
        name,
        email,
        pictureUrl,
        role: isSuperuser ? "superuser" : undefined,
      });
    }
    return null;
  },
});

/** Returns the current user's role and subject for client-side gating. */
export const getCurrentUserRole = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();
    return {
      subject: identity.subject,
      role: (user?.role as string) ?? null,
    };
  },
});

/** Everyone who has opened Onyx while signed in — for assignee pickers and admin dashboard. */
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
      role: (r.role as string) ?? null,
    }));
    out.sort((a, b) => a.label.localeCompare(b.label));
    return out;
  },
});

/** Superuser-only: assign a role to another user. */
export const setUserRole = mutation({
  args: {
    targetUserId: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "superuser");

    if (!VALID_ROLES.has(args.role)) {
      throw new Error(`Invalid role: ${args.role}`);
    }

    const target = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", args.targetUserId))
      .first();
    if (!target) {
      throw new Error("User not found");
    }

    if (target.role === "superuser") {
      throw new Error("Cannot change the superuser's role");
    }
    if (args.role === "superuser") {
      throw new Error("Cannot assign superuser role");
    }

    await ctx.db.patch(target._id, { role: args.role });
  },
});
