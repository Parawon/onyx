"use client";

import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@convex/_generated/api";
import { DocumentsIndex } from "@/components/documents/documents-index";
import { Button } from "@/components/ui/button";

export default function NotesPage() {
  const router = useRouter();
  const createDocument = useMutation(api.documents.create);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const trimmed = title.trim();
      const documentId = await createDocument({
        title: trimmed.length > 0 ? trimmed : "Untitled",
      });
      setDialogOpen(false);
      setTitle("");
      router.push(`/documents/${documentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create note.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mx-auto w-full max-w-[1400px] px-12 py-12">
        <section className="mb-16">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-[3.5rem] font-extrabold leading-[0.9] tracking-tighter text-white">
              Notes
            </h2>
            <Button
              type="button"
              onClick={() => {
                setDialogOpen(true);
                setError(null);
              }}
              className="mt-1 inline-flex items-center gap-2"
            >
              <Plus className="size-4" aria-hidden />
              New note
            </Button>
          </div>
          <div className="mb-8 mt-12 border-t border-zinc-800 pt-8">
            <div className="flex items-center gap-4">
              <div className="h-1 w-8 rounded-full bg-sky-500/30" />
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-sky-400">
                Knowledge base
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-lg font-light leading-relaxed text-zinc-400">
            Capture ideas, briefs, and working documents. Open a note to edit in the BlockNote
            editor.
          </p>
          <div className="mt-14">
            <h3 className="mb-6 text-2xl font-bold tracking-tight text-white">Your notes</h3>
            <DocumentsIndex />
          </div>
        </section>
      </div>

      {dialogOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onClick={() => setDialogOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-950 p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notes-create-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="notes-create-title" className="mb-4 text-lg font-semibold text-white">
              New note
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="notes-create-name" className="mb-1 block text-xs font-medium text-zinc-400">
                  Note name
                </label>
                <input
                  id="notes-create-name"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-zinc-600"
                  placeholder="e.g. Team meeting notes"
                  autoFocus
                />
              </div>
              {error ? <p className="text-sm text-red-400">{error}</p> : null}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create note"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
