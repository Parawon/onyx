"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { useMemo, type ReactNode } from "react";

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
  
  if (!publishableKey) {
    // Fallback to basic Convex provider if Clerk is not configured
    // This allows the app to work without authentication for development
    return <ConvexProvider client={client}>{children}</ConvexProvider>;
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <ConvexProviderWithClerk client={client} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
