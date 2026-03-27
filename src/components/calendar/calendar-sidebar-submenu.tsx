"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import { cn } from "@/lib/utils";

/**
 * Same sub-pages as Goals (`listSubPages`), but links to `/calendar/[slug]`.
 * New sub-pages are created from Goals; this route opens automatically for the same slug.
 */
export function CalendarNavSubmenu() {
  const pathname = usePathname();
  const subPages = useQuery(api.goals.listSubPages);

  if (subPages === null) {
    return null;
  }

  return (
    <div className="space-y-1 pr-3">
      {subPages === undefined ? (
        <div className="py-2 pl-10 text-xs text-zinc-600">Loading…</div>
      ) : subPages.length === 0 ? (
        <p className="py-2 pl-10 text-xs text-zinc-600">Add a Goals sub-page to open its calendar here.</p>
      ) : (
        subPages.map((p) => (
          <Link
            key={p.slug}
            href={`/calendar/${p.slug}`}
            className={cn(
              "group flex min-h-9 w-full items-center rounded-md px-3 py-2 pl-10 text-sm transition-colors",
              pathname === `/calendar/${p.slug}`
                ? "bg-zinc-900/70 text-white"
                : "text-zinc-500 hover:bg-zinc-900/40 hover:text-white",
            )}
          >
            <span className="min-w-0 flex-1 truncate">{p.label}</span>
          </Link>
        ))
      )}
    </div>
  );
}
