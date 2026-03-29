"use client";

import { ClerkProvider, useAuth, useUser } from "@clerk/nextjs";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { api } from "../../../convex/_generated/api";
import { RoleProvider } from "./role-provider";

/** Syncs Clerk profile into Convex `users` on every session (assignee roster). */
function WorkspaceMemberSync() {
  const { isAuthenticated, isLoading: convexAuthLoading } = useConvexAuth();
  const { userId, isLoaded: clerkSessionLoaded } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const storeUser = useMutation(api.users.storeUser);

  useEffect(() => {
    if (
      !userLoaded ||
      !clerkSessionLoaded ||
      !userId ||
      convexAuthLoading ||
      !isAuthenticated ||
      !user
    ) {
      return;
    }
    void storeUser({});
  }, [
    userLoaded,
    clerkSessionLoaded,
    userId,
    convexAuthLoading,
    isAuthenticated,
    user,
    storeUser,
  ]);

  return null;
}

function makeClient() {
  const configured = process.env.NEXT_PUBLIC_CONVEX_URL;
  const address =
    configured ||
    "https://set-next-public-convex-url.convex.cloud";
  return new ConvexReactClient(address, {
    skipConvexDeploymentUrlCheck: !configured,
  });
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => makeClient(), []);
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-black" aria-hidden />;
  }

  if (!publishableKey) {
    // Fallback to basic Convex provider if Clerk is not configured
    // This allows the app to work without authentication for development
    return <ConvexProvider client={client}>{children}</ConvexProvider>;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/sign-in"}
      signUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ?? "/sign-up"}
    >
      <ConvexProviderWithClerk client={client} useAuth={useAuth}>
        <WorkspaceMemberSync />
        <RoleProvider>
          {children}
        </RoleProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
