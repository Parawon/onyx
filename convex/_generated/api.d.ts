/* eslint-disable */
/**
 * Generated `api` utility for Convex function references.
 * Regenerate with `npx convex dev`.
 */
import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
import type * as documents from "../documents.js";

declare const fullApi: ApiFromModules<{
  documents: typeof documents;
}>;

export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
