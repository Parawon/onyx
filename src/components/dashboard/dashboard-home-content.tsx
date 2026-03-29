"use client";

import { useMutation, useQuery } from "convex/react";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { api } from "@convex/_generated/api";
import { AddAnnouncementButton } from "@/components/dashboard/add-announcement-button";
import { useUserRole } from "@/components/providers/role-provider";
import { Button } from "@/components/ui/button";

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ts));
}

type InlineContent = {
  type?: string;
  text?: string;
  href?: string;
  content?: InlineContent[];
  styles?: Record<string, unknown>;
};

type Block = {
  type?: string;
  content?: InlineContent[];
  children?: Block[];
};

function isInternalHref(href: string): boolean {
  if (href.startsWith("/")) return true;
  try {
    const u = new URL(href, window.location.origin);
    return u.origin === window.location.origin;
  } catch {
    return false;
  }
}

function RichInline({ node }: { node: InlineContent }) {
  if (node.type === "link" && node.href) {
    const inner = (node.content ?? []).map((c, i) => <RichInline key={i} node={c} />);
    if (isInternalHref(node.href)) {
      return (
        <Link
          href={node.href}
          className="text-sky-400 underline decoration-sky-400/40 underline-offset-2 transition-colors hover:text-sky-300"
        >
          {inner.length > 0 ? inner : node.href}
        </Link>
      );
    }
    return (
      <a
        href={node.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sky-400 underline decoration-sky-400/40 underline-offset-2 transition-colors hover:text-sky-300"
      >
        {inner.length > 0 ? inner : node.href}
      </a>
    );
  }

  if (node.type === "text" && node.text) {
    let el: React.ReactNode = node.text;
    if (node.styles?.bold) el = <strong>{el}</strong>;
    if (node.styles?.italic) el = <em>{el}</em>;
    if (node.styles?.underline) el = <u>{el}</u>;
    if (node.styles?.strikethrough) el = <s>{el}</s>;
    if (node.styles?.code) {
      el = <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs">{el}</code>;
    }
    return <>{el}</>;
  }

  return null;
}

function RichBlock({ block }: { block: Block }) {
  const inlines = block.content ?? [];
  if (inlines.length === 0 && (!block.children || block.children.length === 0)) {
    return null;
  }

  const inner = inlines.map((c, i) => <RichInline key={i} node={c} />);

  switch (block.type) {
    case "heading":
      return <p className="font-semibold text-zinc-200">{inner}</p>;
    case "bulletListItem":
      return (
        <li className="ml-4 list-disc text-sm text-zinc-400">{inner}</li>
      );
    case "numberedListItem":
      return (
        <li className="ml-4 list-decimal text-sm text-zinc-400">{inner}</li>
      );
    default:
      return inner.length > 0 ? (
        <p className="text-sm text-zinc-400">{inner}</p>
      ) : null;
  }
}

function AnnouncementCardContent({ content }: { content: string }) {
  let blocks: Block[] = [];
  try {
    const parsed = JSON.parse(content) as unknown;
    if (Array.isArray(parsed)) blocks = parsed;
  } catch {
    return null;
  }

  const rendered = blocks.filter(
    (b) =>
      (b.content && b.content.length > 0) ||
      (b.children && b.children.length > 0),
  );
  if (rendered.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {rendered.map((b, i) => (
        <RichBlock key={i} block={b} />
      ))}
    </div>
  );
}

function AnnouncementCard({
  id,
  title,
  content,
  createdAt,
  canDelete,
}: {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  canDelete: boolean;
}) {
  const remove = useMutation(api.announcements.remove);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 transition-colors hover:border-zinc-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-white">{title}</h4>
          <AnnouncementCardContent content={content} />
          <p className="mt-2 text-xs text-zinc-600">{formatDate(createdAt)}</p>
        </div>
        {canDelete && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-zinc-600 hover:text-red-400"
            disabled={deleting}
            onClick={() => {
              const ok = window.confirm("Delete this announcement?");
              if (!ok) return;
              setDeleting(true);
              void remove({ id: id as any }).catch(() => setDeleting(false));
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function DashboardHomeContent() {
  const { hasRole } = useUserRole();
  const canDelete = hasRole("admin");
  const canCreate = hasRole("admin");
  const announcements = useQuery(api.announcements.list);

  return (
    <div className="mt-14 max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h3 className="text-2xl font-bold tracking-tight text-white">Announcements</h3>
        {canCreate && <AddAnnouncementButton />}
      </div>
      {announcements === undefined ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : announcements.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-zinc-500">
          No announcements yet.
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <AnnouncementCard
              key={a._id}
              id={a._id}
              title={a.title}
              content={a.content}
              createdAt={a.createdAt}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
