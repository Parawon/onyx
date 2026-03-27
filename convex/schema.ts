import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  documents: defineTable({
    title: v.string(),
    userId: v.string(),
    isArchived: v.boolean(),
    parentDocument: v.optional(v.id("documents")),
    /** JSON string (BlockNote / rich text payload). */
    content: v.string(),
    coverImage: v.string(),
    isPublished: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_parent", ["userId", "parentDocument"]),

  /** Per-user BlockNote payload for Goals (main + sub-pages). `scope` "main" or a sub-page slug; legacy rows omit `scope` and count as "main". */
  goalsEditor: defineTable({
    userId: v.string(),
    content: v.string(),
    scope: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  /** Sidebar order + labels for Goals sub-pages (URLs `/goals/[slug]`). */
  goalsSubPages: defineTable({
    userId: v.string(),
    slug: v.string(),
    label: v.string(),
    order: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_slug", ["userId", "slug"]),

  /** Sidebar order + labels for Calendar sub-pages only (`/calendar/[slug]`). Does not create Goals content. */
  calendarSubPages: defineTable({
    userId: v.string(),
    slug: v.string(),
    label: v.string(),
    order: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_slug", ["userId", "slug"]),

  /**
   * Tasks mirrored from Goals BlockNote task-tracking blocks (`inCalendar: true`).
   * `goalScope` is `"main"` or a Goals sub-page slug.
   */
  calendarEvents: defineTable({
    userId: v.string(),
    goalScope: v.string(),
    sourceTaskId: v.string(),
    title: v.string(),
    description: v.string(),
    dueDate: v.string(),
    status: v.string(),
    urgency: v.string(),
    assigneeUserIds: v.array(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_goalScope", ["userId", "goalScope"])
    .index("by_user_and_goalScope_and_sourceTaskId", [
      "userId",
      "goalScope",
      "sourceTaskId",
    ]),
});
