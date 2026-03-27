"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GoalsNavSubmenu() {
  const pathname = usePathname();
  const router = useRouter();
  const subPages = useQuery(api.goals.listSubPages);
  const createSubPage = useMutation(api.goals.createSubPage);
  const ensureCalendarForGoals = useMutation(api.calendar.ensureForGoalsSubPage);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [slugCustom, setSlugCustom] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (subPages === null) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const slugArg = slugTouched && slugCustom.trim() ? slugCustom : undefined;
      const trimmedLabel = label.trim();
      const { slug } = await createSubPage({
        label: trimmedLabel,
        slug: slugArg,
      });
      await ensureCalendarForGoals({ slug, label: trimmedLabel });
      setDialogOpen(false);
      setLabel("");
      setSlugCustom("");
      setSlugTouched(false);
      router.push(`/goals/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-1 pr-3">
        {subPages === undefined ? (
          <div className="py-2 pl-10 text-xs text-zinc-600">Loading…</div>
        ) : (
          subPages.map((p) => (
            <Link
              key={p.slug}
              href={`/goals/${p.slug}`}
              className={cn(
                "group flex min-h-9 w-full items-center rounded-md px-3 py-2 pl-10 text-sm transition-colors",
                pathname === `/goals/${p.slug}`
                  ? "bg-zinc-900/70 text-white"
                  : "text-zinc-500 hover:bg-zinc-900/40 hover:text-white",
              )}
            >
              <span className="min-w-0 flex-1 truncate">{p.label}</span>
            </Link>
          ))
        )}
        <button
          type="button"
          onClick={() => {
            setDialogOpen(true);
            setError(null);
          }}
          disabled={subPages === undefined}
          className="flex min-h-9 w-full items-center gap-2 rounded-md px-3 py-2 pl-10 text-sm text-zinc-500 transition-colors hover:bg-zinc-900/40 hover:text-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="size-4 shrink-0" aria-hidden />
          <span>Add sub-page</span>
        </button>
      </div>

      {dialogOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onClick={() => setDialogOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-950 p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="goals-add-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="goals-add-title" className="mb-4 text-lg font-semibold text-white">
              New Goals sub-page
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="goals-add-label" className="mb-1 block text-xs font-medium text-zinc-400">
                  Title
                </label>
                <input
                  id="goals-add-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-zinc-600"
                  placeholder="e.g. Q1 Roadmap"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="goals-add-slug" className="mb-1 block text-xs font-medium text-zinc-400">
                  URL slug (optional)
                </label>
                <input
                  id="goals-add-slug"
                  value={slugCustom}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlugCustom(e.target.value);
                  }}
                  className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-300 outline-none focus:border-zinc-600"
                  placeholder="auto from title"
                />
              </div>
              {error != null && error.length > 0 ? <p className="text-sm text-red-400">{error}</p> : null}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || label.trim().length === 0}>
                  {submitting ? "Creating…" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
