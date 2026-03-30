import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  documents: defineTable({
    title: v.string(),
    /** Optional metadata only (no longer used for filtering). */
    userId: v.optional(v.string()),
    isArchived: v.boolean(),
    parentDocument: v.optional(v.id("documents")),
    /** JSON string (BlockNote / rich text payload). */
    content: v.string(),
    coverImage: v.string(),
    isPublished: v.boolean(),
  })
    .index("by_parent", ["parentDocument"]),

  /** Per-user BlockNote payload for Goals (main + sub-pages). `scope` "main" or a sub-page slug; legacy rows omit `scope` and count as "main". */
  goalsEditor: defineTable({
    userId: v.optional(v.string()),
    content: v.string(),
    scope: v.optional(v.string()),
    /** When set, this content belongs to a specific user (personal page). */
    ownerUserId: v.optional(v.string()),
  }).index("by_scope", ["scope"]),

  /** Sidebar order + labels for Goals sub-pages (URLs `/goals/[slug]`). */
  goalsSubPages: defineTable({
    userId: v.optional(v.string()),
    slug: v.string(),
    label: v.string(),
    order: v.number(),
    /** When set, this sub-page is personal — only visible to the owner and superuser. */
    ownerUserId: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_order", ["order"]),

  /** Sidebar order + labels for Calendar sub-pages only (`/calendar/[slug]`). Does not create Goals content. */
  calendarSubPages: defineTable({
    userId: v.optional(v.string()),
    slug: v.string(),
    label: v.string(),
    order: v.number(),
    /** When set, this calendar is personal — only visible to the owner and superuser. */
    ownerUserId: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_order", ["order"]),

  /** Clerk users synced on sign-in (`users.storeUser`). `subject` is JWT `sub` (Clerk user id), matches task assignee ids. */
  users: defineTable({
    tokenIdentifier: v.string(),
    subject: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    pictureUrl: v.optional(v.string()),
    role: v.optional(v.string()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_subject", ["subject"]),

  /** Tasks mirrored from Goals BlockNote task-tracking blocks (`inCalendar: true`). `goalScope` is `"main"` or a Goals sub-page slug. */
  calendarEvents: defineTable({
    userId: v.optional(v.string()),
    goalScope: v.string(),
    sourceTaskId: v.string(),
    title: v.string(),
    description: v.string(),
    dueDate: v.string(),
    status: v.string(),
    urgency: v.string(),
    assigneeUserIds: v.array(v.string()),
    /** When set, this event belongs to a personal goals page. */
    ownerUserId: v.optional(v.string()),
  })
    .index("by_goalScope", ["goalScope"])
    .index("by_goalScope_and_sourceTaskId", ["goalScope", "sourceTaskId"]),

  /** Admin-created announcements shown on the dashboard. */
  announcements: defineTable({
    authorUserId: v.string(),
    /** JSON string (BlockNote rich-text payload). */
    content: v.string(),
    title: v.string(),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),

  /** Finance data pages — spreadsheet-like tables for financial data. */
  financePages: defineTable({
    title: v.string(),
    slug: v.string(),
    /** Clerk subject of the creator. Only creator (or admin+) can delete. */
    ownerUserId: v.string(),
    /** JSON-encoded table data: { columns: string[], rows: string[][] } */
    tableData: v.string(),
    order: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_order", ["order"]),

  /** Singleton editable rich-text blocks on the dashboard (e.g. description). `key` is a unique identifier. */
  dashboardContent: defineTable({
    key: v.string(),
    /** JSON string (BlockNote rich-text payload). */
    content: v.string(),
  }).index("by_key", ["key"]),
});
