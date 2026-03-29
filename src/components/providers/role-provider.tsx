"use client";

import { useQuery } from "convex/react";
import { createContext, useContext, useMemo, type ReactNode } from "react";

import { api } from "../../../convex/_generated/api";

type Role = "superuser" | "admin" | "editor" | "team_member";

const ROLE_LEVELS: Record<Role, number> = {
  superuser: 4,
  admin: 3,
  editor: 2,
  team_member: 1,
};

type UserRoleCtx = {
  role: string | null;
  /** Clerk user id (JWT `sub`). Null while loading or unauthenticated. */
  subject: string | null;
  isLoading: boolean;
  hasRole: (minimumRole: Role) => boolean;
  /** True when the current user owns the resource identified by ownerUserId. */
  isOwner: (ownerUserId: string | undefined | null) => boolean;
};

const RoleContext = createContext<UserRoleCtx>({
  role: null,
  subject: null,
  isLoading: true,
  hasRole: () => false,
  isOwner: () => false,
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const data = useQuery(api.users.getCurrentUserRole);
  const isLoading = data === undefined;
  const role = data?.role ?? null;
  const subject = data?.subject ?? null;

  const value = useMemo<UserRoleCtx>(() => {
    const hasRole = (minimumRole: Role): boolean => {
      if (!role) return false;
      const userLevel = ROLE_LEVELS[role as Role] ?? 0;
      const requiredLevel = ROLE_LEVELS[minimumRole];
      return userLevel >= requiredLevel;
    };
    const isOwner = (ownerUserId: string | undefined | null): boolean => {
      if (!subject || !ownerUserId) return false;
      return ownerUserId === subject;
    };
    return { role, subject, isLoading, hasRole, isOwner };
  }, [role, subject, isLoading]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useUserRole() {
  return useContext(RoleContext);
}
