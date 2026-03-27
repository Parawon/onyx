"use client";

import { useUser } from "@clerk/nextjs";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { api } from "../../../convex/_generated/api";

/** Syncs Clerk profile into Convex `users` + `workspaceMembers` on every session (assignee roster). */
function WorkspaceMemberSync() {
  const { user, isLoaded } = useUser();
  const upsertSelf = useMutation(api.workspaceMembers.upsertSelf);
  const storeUser = useMutation(api.users.storeUser);

  useEffect(() => {
    if (!isLoaded || !user) {
      return;
    }
    void storeUser({});
    void upsertSelf({});
  }, [isLoaded, user, storeUser, upsertSelf]);

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
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
