/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as announcements from "../announcements.js";
import type * as calendar from "../calendar.js";
import type * as calendarEvents from "../calendarEvents.js";
import type * as calendarShared from "../calendarShared.js";
import type * as dashboardContent from "../dashboardContent.js";
import type * as documents from "../documents.js";
import type * as finance from "../finance.js";
import type * as goals from "../goals.js";
import type * as shared from "../shared.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  announcements: typeof announcements;
  calendar: typeof calendar;
  calendarEvents: typeof calendarEvents;
  calendarShared: typeof calendarShared;
  dashboardContent: typeof dashboardContent;
  documents: typeof documents;
  finance: typeof finance;
  goals: typeof goals;
  shared: typeof shared;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
