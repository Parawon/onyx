"use client";

import dynamic from "next/dynamic";
import { useMutation, useQuery } from "convex/react";
import { Pencil } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@convex/_generated/api";
import { useUserRole } from "@/components/providers/role-provider";

const BlockNoteCanvas = dynamic(
  () =>
    import("@/components/editor/blocknote-canvas").then((mod) => mod.BlockNoteCanvas),
  { ssr: false },
);

const CONTENT_KEY = "dashboard-description";
const DEFAULT_TEXT =
  "Precision management and architectural oversight for the modern enterprise. Your operational velocity, visualized.";

function plaintextToBlockNote(text: string): string {
  return JSON.stringify([
    {
      type: "paragraph",
      content: [{ type: "text", text }],
    },
  ]);
}

export function DashboardDescription() {
  const { hasRole } = useUserRole();
  const canEdit = hasRole("admin");
  const data = useQuery(api.dashboardContent.get, { key: CONTENT_KEY });
  const upsert = useMutation(api.dashboardContent.upsert);
  const [editing, setEditing] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const content = data?.content ?? plaintextToBlockNote(DEFAULT_TEXT);

  const handleSave = useCallback(
    (serialized: string) => {
      void upsert({ key: CONTENT_KEY, content: serialized });
    },
    [upsert],
  );

  useEffect(() => {
    if (!editing) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setEditing(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [editing]);

  if (!canEdit) {
    return <DescriptionReadOnly content={content} />;
  }

  if (!editing) {
    return (
      <button
        type="button"
        className="group flex w-full cursor-pointer items-start gap-2 text-left"
        onClick={() => setEditing(true)}
      >
        <DescriptionReadOnly content={content} />
        <Pencil className="mt-1 size-3.5 shrink-0 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      </button>
    );
  }

  return (
    <div ref={wrapRef} className="rounded-md border border-zinc-700 bg-zinc-950 p-3">
      <BlockNoteCanvas kind="local" initialContent={content} onLocalChange={handleSave} />
    </div>
  );
}

function DescriptionReadOnly({ content }: { content: string }) {
  let text = DEFAULT_TEXT;
  try {
    const blocks = JSON.parse(content) as {
      type?: string;
      content?: { type?: string; text?: string }[];
    }[];
    const texts: string[] = [];
    for (const b of blocks) {
      if (b.content && Array.isArray(b.content)) {
        for (const c of b.content) {
          if (c.text) texts.push(c.text);
        }
      }
    }
    if (texts.length > 0) text = texts.join(" ");
  } catch {
    /* fallback to default */
  }
  return (
    <p className="text-lg font-light leading-relaxed text-zinc-400">{text}</p>
  );
}
