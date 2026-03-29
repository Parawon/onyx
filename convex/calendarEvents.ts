import { v } from "convex/values";
import {
  canSeeOwned,
  getAuthInfo,
  humanizeSlug,
  requireRole,
  type AuthInfo,
  type Role,
  ROLE_LEVELS,
} from "./shared";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

const MAX_EVENTS_PER_QUERY = 500;

function normalizeGoalScope(scope: string | undefined) {
  return (scope ?? "main").trim() || "main";
}

function hasMinRole(info: AuthInfo, min: Role): boolean {
  const userLevel = ROLE_LEVELS[info.role as Role] ?? 0;
  return userLevel >= ROLE_LEVELS[min];
}

type Blockish = {
  type?: string;
  props?: Record<string, unknown>;
  children?: unknown[];
};

function walkBlocks(nodes: unknown, out: Blockish[]) {
  if (!Array.isArray(nodes)) {
    return;
  }
  for (const n of nodes) {
    if (!n || typeof n !== "object") {
      continue;
    }
    const b = n as Blockish;
    out.push(b);
    if (Array.isArray(b.children)) {
      walkBlocks(b.children, out);
    }
  }
}

type ParsedTaskRow = {
  id: string;
  name: string;
  description: string;
  dueDate: string;
  status: string;
  urgency: string;
  inCalendar: boolean;
  assigneeUserIds: string[];
};

function parseTasksJSON(raw: unknown): ParsedTaskRow[] {
  if (typeof raw !== "string" || raw.trim() === "") {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const out: ParsedTaskRow[] = [];
    for (const x of parsed) {
      if (!x || typeof x !== "object") {
        continue;
      }
      const o = x as Record<string, unknown>;
      if (
        typeof o.id !== "string" ||
        typeof o.name !== "string" ||
        typeof o.description !== "string" ||
        typeof o.dueDate !== "string" ||
        typeof o.status !== "string" ||
        typeof o.urgency !== "string" ||
        typeof o.inCalendar !== "boolean"
      ) {
        continue;
      }
      let assigneeUserIds: string[] = [];
      if (Array.isArray(o.assigneeUserIds)) {
        assigneeUserIds = o.assigneeUserIds.filter((id): id is string => typeof id === "string");
      }
      out.push({
        id: o.id,
        name: o.name,
        description: o.description,
        dueDate: o.dueDate,
        status: o.status,
        urgency: o.urgency,
        inCalendar: o.inCalendar,
        assigneeUserIds,
      });
    }
    return out;
  } catch {
    return [];
  }
}

function blockRootsFromDocument(content: string): unknown[] {
  try {
    const root = JSON.parse(content) as unknown;
    if (Array.isArray(root)) {
      return root;
    }
    if (root && typeof root === "object" && Array.isArray((root as { blocks?: unknown }).blocks)) {
      return (root as { blocks: unknown[] }).blocks;
    }
  } catch {
    return [];
  }
  return [];
}

function extractInCalendarTasksFromGoalsDocument(content: string): ParsedTaskRow[] {
  const roots = blockRootsFromDocument(content);
  const blocks: Blockish[] = [];
  walkBlocks(roots, blocks);
  const merged: ParsedTaskRow[] = [];
  for (const b of blocks) {
    if (b.type !== "taskTrackingTable") {
      continue;
    }
    const raw = b.props?.tasksJSON;
    const tasks = parseTasksJSON(raw);
    for (const t of tasks) {
      if (t.inCalendar) {
        merged.push(t);
      }
    }
  }
  return merged;
}

async function resolveGoalLabel(ctx: QueryCtx, goalScope: string): Promise<string> {
  if (goalScope === "main") {
    return "Company";
  }
  const nav = await ctx.db
    .query("goalsSubPages")
    .withIndex("by_slug", (q) => q.eq("slug", goalScope))
    .first();
  if (nav) {
    return nav.label;
  }
  return humanizeSlug(goalScope);
}

/** Resolve the ownerUserId for a goal scope by checking the goalsSubPages nav row. */
async function resolveOwnerForScope(ctx: MutationCtx, goalScope: string): Promise<string | undefined> {
  if (goalScope === "main") return undefined;
  const nav = await ctx.db
    .query("goalsSubPages")
    .withIndex("by_slug", (q) => q.eq("slug", goalScope))
    .first();
  return nav?.ownerUserId;
}

/** Calendar events query. Ownership-filtered — personal events only visible to owner + superuser. */
export const getCalendarEvents = query({
  args: { goalScope: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const info = await getAuthInfo(ctx);
    if (!info) {
      return [];
    }
    const scopeFilter = args.goalScope !== undefined ? normalizeGoalScope(args.goalScope) : null;

    const rows =
      scopeFilter !== null
        ? await ctx.db
            .query("calendarEvents")
            .withIndex("by_goalScope", (q) => q.eq("goalScope", scopeFilter))
            .take(MAX_EVENTS_PER_QUERY)
        : await ctx.db.query("calendarEvents").take(MAX_EVENTS_PER_QUERY);

    const labelCache = new Map<string, string>();
    const result = [];
    for (const row of rows) {
      if (!canSeeOwned(row.ownerUserId, info.subject, info.role)) {
        continue;
      }
      let goalLabel = labelCache.get(row.goalScope);
      if (goalLabel === undefined) {
        goalLabel = await resolveGoalLabel(ctx, row.goalScope);
        labelCache.set(row.goalScope, goalLabel);
      }
      result.push({
        _id: row._id,
        goalScope: row.goalScope,
        goalLabel,
        sourceTaskId: row.sourceTaskId,
        title: row.title,
        description: row.description,
        dueDate: row.dueDate,
        status: row.status,
        urgency: row.urgency,
        assigneeUserIds: row.assigneeUserIds,
      });
    }
    return result;
  },
});

/** Upsert a calendar event. Editors+ for shared scopes; team members for their personal scope. */
export const upsertEvent = mutation({
  args: {
    goalScope: v.string(),
    sourceTaskId: v.string(),
    title: v.string(),
    description: v.string(),
    dueDate: v.string(),
    status: v.string(),
    urgency: v.string(),
    assigneeUserIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireRole(ctx, "team_member");
    const info = await getAuthInfo(ctx);
    if (!info) throw new Error("Not authenticated");
    const goalScope = normalizeGoalScope(args.goalScope);
    const sourceTaskId = args.sourceTaskId.trim();
    if (sourceTaskId.length === 0) {
      throw new Error("Invalid task id.");
    }

    const ownerUserId = await resolveOwnerForScope(ctx, goalScope);
    if (ownerUserId) {
      if (!canSeeOwned(ownerUserId, info.subject, info.role)) {
        throw new Error("Forbidden: not your personal page");
      }
    } else if (!hasMinRole(info, "editor")) {
      throw new Error("Forbidden: insufficient permissions");
    }

    const existing = await ctx.db
      .query("calendarEvents")
      .withIndex("by_goalScope_and_sourceTaskId", (q) =>
        q.eq("goalScope", goalScope).eq("sourceTaskId", sourceTaskId),
      )
      .first();

    const doc = {
      userId,
      goalScope,
      sourceTaskId,
      title: args.title,
      description: args.description,
      dueDate: args.dueDate,
      status: args.status,
      urgency: args.urgency,
      assigneeUserIds: args.assigneeUserIds,
      ownerUserId,
    };

    if (existing) {
      await ctx.db.patch(existing._id, doc);
    } else {
      await ctx.db.insert("calendarEvents", doc);
    }
    return null;
  },
});

/** Remove a calendar event. Same permission logic as upsert. */
export const removeEvent = mutation({
  args: {
    goalScope: v.string(),
    sourceTaskId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "team_member");
    const info = await getAuthInfo(ctx);
    if (!info) throw new Error("Not authenticated");
    const goalScope = normalizeGoalScope(args.goalScope);
    const sourceTaskId = args.sourceTaskId.trim();
    if (sourceTaskId.length === 0) {
      return null;
    }

    const ownerUserId = await resolveOwnerForScope(ctx, goalScope);
    if (ownerUserId) {
      if (!canSeeOwned(ownerUserId, info.subject, info.role)) {
        throw new Error("Forbidden: not your personal page");
      }
    } else if (!hasMinRole(info, "editor")) {
      throw new Error("Forbidden: insufficient permissions");
    }

    const existing = await ctx.db
      .query("calendarEvents")
      .withIndex("by_goalScope_and_sourceTaskId", (q) =>
        q.eq("goalScope", goalScope).eq("sourceTaskId", sourceTaskId),
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

/** Reconcile calendarEvents for a Goals document after save. Same permission logic. */
export const syncFromGoalsDocument = mutation({
  args: {
    goalScope: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireRole(ctx, "team_member");
    const info = await getAuthInfo(ctx);
    if (!info) throw new Error("Not authenticated");
    const goalScope = normalizeGoalScope(args.goalScope);

    const ownerUserId = await resolveOwnerForScope(ctx, goalScope);
    if (ownerUserId) {
      if (!canSeeOwned(ownerUserId, info.subject, info.role)) {
        throw new Error("Forbidden: not your personal page");
      }
    } else if (!hasMinRole(info, "editor")) {
      throw new Error("Forbidden: insufficient permissions");
    }

    const tasks = extractInCalendarTasksFromGoalsDocument(args.content);
    const wantIds = new Set(tasks.map((t) => t.id));

    const existing = await ctx.db
      .query("calendarEvents")
      .withIndex("by_goalScope", (q) => q.eq("goalScope", goalScope))
      .take(MAX_EVENTS_PER_QUERY);

    for (const row of existing) {
      if (!wantIds.has(row.sourceTaskId)) {
        await ctx.db.delete(row._id);
      }
    }

    for (const t of tasks) {
      const doc = {
        userId,
        goalScope,
        sourceTaskId: t.id,
        title: t.name,
        description: t.description,
        dueDate: t.dueDate,
        status: t.status,
        urgency: t.urgency,
        assigneeUserIds: t.assigneeUserIds,
        ownerUserId,
      };
      const row = await ctx.db
        .query("calendarEvents")
        .withIndex("by_goalScope_and_sourceTaskId", (q) =>
          q.eq("goalScope", goalScope).eq("sourceTaskId", t.id),
        )
        .first();
      if (row) {
        await ctx.db.patch(row._id, doc);
      } else {
        await ctx.db.insert("calendarEvents", doc);
      }
    }
    return null;
  },
});
