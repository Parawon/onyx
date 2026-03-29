"use client";

import dynamic from "next/dynamic";
import { useMutation } from "convex/react";
import { Megaphone } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";

const BlockNoteCanvas = dynamic(
  () =>
    import("@/components/editor/blocknote-canvas").then((mod) => mod.BlockNoteCanvas),
  { ssr: false },
);

export function AddAnnouncementButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const contentRef = useRef("[]");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = useMutation(api.announcements.create);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleLocalChange = useCallback((serialized: string) => {
    contentRef.current = serialized;
  }, []);

  const handleDone = async () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      setError("Title is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await create({ title: trimmedTitle, content: contentRef.current });
      setOpen(false);
      setTitle("");
      contentRef.current = "[]";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
    setTitle("");
    contentRef.current = "[]";
    setError(null);
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      const target = e.target as Element | null;
      if (target?.closest("[data-announcement-trigger]")) return;
      handleCancel();
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        data-announcement-trigger=""
        className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white"
        onClick={() => {
          setOpen((v) => !v);
          setError(null);
        }}
      >
        <Megaphone className="size-4" aria-hidden />
        Add Announcement
      </Button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-[200] mt-2 w-[min(32rem,calc(100vw-3rem))] rounded-lg border border-zinc-800 bg-zinc-950 p-5 shadow-2xl"
        >
          <div className="mb-3">
            <label
              htmlFor="announcement-title"
              className="mb-1 block text-xs font-medium text-zinc-400"
            >
              Title
            </label>
            <input
              id="announcement-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-zinc-600"
              placeholder="e.g. Team update"
              autoFocus
            />
          </div>

          <div className="mb-3">
            <p className="mb-1 text-xs font-medium text-zinc-400">Content</p>
            <div className="min-h-[8rem] rounded-md border border-zinc-800 bg-black p-2">
              <BlockNoteCanvas
                key={open ? "open" : "closed"}
                kind="local"
                initialContent='[{"type":"paragraph"}]'
                onLocalChange={handleLocalChange}
              />
            </div>
          </div>

          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" disabled={submitting} onClick={() => void handleDone()}>
              {submitting ? "Posting…" : "Done"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
