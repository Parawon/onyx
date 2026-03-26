"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { FileText } from "lucide-react";

import { api } from "@convex/_generated/api";

export function DocumentsIndex() {
  const docs = useQuery(api.documents.listForSidebar);

  if (docs === undefined) {
    return <p className="text-sm text-zinc-400">Loading…</p>;
  }
  if (docs.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-800 bg-zinc-950 p-8 text-sm text-zinc-400">No notes yet.</p>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {docs.map((doc) => (
        <li key={doc._id}>
          <Link
            href={`/documents/${doc._id}`}
            className="editorial-shadow flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-5 transition-colors hover:border-sky-500/40"
          >
            <FileText className="size-5 shrink-0 text-sky-400" aria-hidden />
            <span className="truncate font-medium text-white">{doc.title || "Untitled"}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
