import type { AuthConfig } from "convex/server";

/**
 * JWT issuer must match Clerk’s Frontend API URL (Clerk Dashboard → API keys).
 * This app’s dev instance: `actual-turtle-91.clerk.accounts.dev` (from the publishable key).
 * For production (`https://clerk.your-domain.com`), change `domain` here and run `npx convex deploy`.
 */
export default {
  providers: [
    {
      domain: "https://actual-turtle-91.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
