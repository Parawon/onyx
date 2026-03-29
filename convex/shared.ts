import type { GenericDatabaseReader } from "convex/server";
import type { DataModel } from "./_generated/dataModel";

export const RESERVED_SLUGS = new Set(["main", "new", "api", "settings", "admin"]);

export type Role = "superuser" | "admin" | "editor" | "team_member";

export const ROLE_LEVELS: Record<Role, number> = {
  superuser: 4,
  admin: 3,
  editor: 2,
  team_member: 1,
};

export const VALID_ROLES = new Set<string>(Object.keys(ROLE_LEVELS));

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export type AuthCtx = {
  auth: { getUserIdentity: () => Promise<{ subject: string; tokenIdentifier: string } | null> };
  db: GenericDatabaseReader<DataModel>;
};

export type AuthInfo = { subject: string; role: string };

/** Resolve current user identity + role in a single lookup. Returns null when not signed in. */
export async function getAuthInfo(ctx: AuthCtx): Promise<AuthInfo | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .first();
  const role = (user?.role as string) ?? null;
  if (!role) {
    return null;
  }
  return { subject: identity.subject, role };
}

/** True if the viewer is allowed to see a row with the given ownerUserId. */
export function canSeeOwned(
  ownerUserId: string | undefined,
  viewerSubject: string,
  viewerRole: string,
): boolean {
  if (!ownerUserId) return true;
  if (ownerUserId === viewerSubject) return true;
  if (viewerRole === "superuser") return true;
  return false;
}

export async function requireAuth(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity.subject;
}

export async function getUserRole(ctx: AuthCtx): Promise<string | null> {
  const info = await getAuthInfo(ctx);
  return info?.role ?? null;
}

export async function requireRole(ctx: AuthCtx, minimumRole: Role): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .first();
  const userRole = user?.role as string | undefined;
  if (!userRole || !VALID_ROLES.has(userRole)) {
    throw new Error("Forbidden: no role assigned");
  }
  const userLevel = ROLE_LEVELS[userRole as Role] ?? 0;
  const requiredLevel = ROLE_LEVELS[minimumRole];
  if (userLevel < requiredLevel) {
    throw new Error("Forbidden: insufficient permissions");
  }
  return identity.subject;
}
