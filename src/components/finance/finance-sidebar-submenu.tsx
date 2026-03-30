"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import { cn } from "@/lib/utils";

export function FinanceNavSubmenu() {
  const pathname = usePathname();
  const pages = useQuery(api.finance.list);

  return (
    <div className="space-y-1 pr-3">
      {!pages ? (
        <div className="py-2 pl-10 text-xs text-zinc-600">Loading…</div>
      ) : pages.length === 0 ? (
        <div className="py-2 pl-10 text-xs text-zinc-600">No sheets yet</div>
      ) : (
        pages.map((p) => (
          <Link
            key={p.slug}
            href={`/finance/${p.slug}`}
            className={cn(
              "group flex min-h-9 w-full items-center rounded-md px-3 py-2 pl-10 text-sm transition-colors",
              pathname === `/finance/${p.slug}`
                ? "bg-zinc-900/70 text-white"
                : "text-zinc-500 hover:bg-zinc-900/40 hover:text-white",
            )}
          >
            <span className="min-w-0 flex-1 truncate">{p.title}</span>
          </Link>
        ))
      )}
    </div>
  );
}
