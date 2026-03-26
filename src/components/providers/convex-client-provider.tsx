"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
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
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
