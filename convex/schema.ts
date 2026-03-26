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

  /** Per-user BlockNote payload for Goals (main + sub-pages). Legacy rows omit `scope` and count as "main". */
  goalsEditor: defineTable({
    userId: v.string(),
    content: v.string(),
    scope: v.optional(
      v.union(
        v.literal("main"),
        v.literal("tech"),
        v.literal("marketing"),
        v.literal("partnership"),
      ),
    ),
  }).index("by_user", ["userId"]),
});
