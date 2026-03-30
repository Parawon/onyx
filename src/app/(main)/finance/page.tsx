"use client";

import { useMutation, useQuery } from "convex/react";
import { Plus, Table2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@convex/_generated/api";
import { useUserRole } from "@/components/providers/role-provider";
import { Button } from "@/components/ui/button";

export default function FinancePage() {
  const router = useRouter();
  const { hasRole } = useUserRole();
  const canCreate = hasRole("admin");
  const canDelete = hasRole("admin");
  const pages = useQuery(api.finance.list);
  const createPage = useMutation(api.finance.create);
  const removePage = useMutation(api.finance.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { slug } = await createPage({
        title: title.trim().length > 0 ? title.trim() : "Untitled",
      });
      setDialogOpen(false);
      setTitle("");
      router.push(`/finance/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create finance page.");
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
              Finance
            </h2>
            {canCreate && (
              <Button
                type="button"
                onClick={() => {
                  setDialogOpen(true);
                  setError(null);
                }}
                className="mt-1 inline-flex items-center gap-2"
              >
                <Plus className="size-4" aria-hidden />
                Add Finance Data
              </Button>
            )}
          </div>
          <div className="mb-8 mt-12 border-t border-zinc-800 pt-8">
            <div className="flex items-center gap-4">
              <div className="h-1 w-8 rounded-full bg-sky-500/30" />
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-sky-400">
                Budget &amp; reporting
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-lg font-light leading-relaxed text-zinc-400">
            Budgets, forecasts, and financial snapshots. Each finance page contains an expandable
            spreadsheet table.
          </p>
          <div className="mt-14">
            <h3 className="mb-6 text-2xl font-bold tracking-tight text-white">Your sheets</h3>
            {pages === undefined ? (
              <p className="text-sm text-zinc-500">Loading…</p>
            ) : pages.length === 0 ? (
              <p className="rounded-lg border border-zinc-800 bg-zinc-950 p-8 text-sm text-zinc-400">
                No finance pages yet.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pages.map((p) => (
                  <li key={p._id} className="group relative">
                    <Link
                      href={`/finance/${p.slug}`}
                      className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-5 transition-colors hover:border-sky-500/40"
                    >
                      <Table2 className="size-5 shrink-0 text-sky-400" aria-hidden />
                      <span className="truncate font-medium text-white">{p.title}</span>
                    </Link>
                    {(canDelete || p.isOwn) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-2 hidden shrink-0 text-zinc-600 hover:text-red-400 group-hover:inline-flex"
                        onClick={() => {
                          const ok = window.confirm(`Delete "${p.title}"?`);
                          if (!ok) return;
                          void removePage({ slug: p.slug });
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
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
            aria-labelledby="finance-create-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="finance-create-title" className="mb-4 text-lg font-semibold text-white">
              New finance table
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label
                  htmlFor="finance-create-name"
                  className="mb-1 block text-xs font-medium text-zinc-400"
                >
                  Name
                </label>
                <input
                  id="finance-create-name"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-zinc-600"
                  placeholder="e.g. Q1 Budget"
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
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
