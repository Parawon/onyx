"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { ChevronRight, FileText, PanelLeftClose, PanelLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AuthButton } from "@/components/auth/user-button";
import { CreateDocumentButton } from "@/components/documents/create-document-button";
import { cn } from "@/lib/utils";

type DocumentDoc = Doc<"documents">;

const ROOT_KEY = "__root__";

function buildChildrenMap(docs: DocumentDoc[]) {
  const byParent = new Map<string, DocumentDoc[]>();
  for (const d of docs) {
    const key = d.parentDocument ? String(d.parentDocument) : ROOT_KEY;
    const list = byParent.get(key);
    if (list) list.push(d);
    else byParent.set(key, [d]);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.title.localeCompare(b.title));
  }
  return byParent;
}

function TreeNode({
  doc,
  childrenMap,
  depth,
}: {
  doc: DocumentDoc;
  childrenMap: Map<string, DocumentDoc[]>;
  depth: number;
}) {
  const pathname = usePathname();
  const idStr = String(doc._id);
  const children = childrenMap.get(idStr) ?? [];
  const href = `/documents/${idStr}`;
  const isActive = pathname === href;
  const hasChildren = children.length > 0;
  const pad = 10 + depth * 14;

  if (!hasChildren) {
    return (
      <Link
        href={href}
        className={cn(
          "flex w-full min-w-0 items-center gap-2 rounded-md py-1.5 pr-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800",
          isActive && "bg-zinc-100 font-medium dark:bg-zinc-800",
        )}
        style={{ paddingLeft: pad }}
      >
        <FileText className="size-4 shrink-0 opacity-60" aria-hidden />
        <span className="truncate">{doc.title || "Untitled"}</span>
      </Link>
    );
  }

  return (
    <Collapsible defaultOpen={depth < 2}>
      <div className="flex w-full min-w-0 items-stretch">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-zinc-500 [&[data-state=open]>svg]:rotate-90"
            style={{ marginLeft: Math.max(0, pad - 10) }}
            aria-label={doc.title ? `Toggle nested pages under ${doc.title}` : "Toggle nested pages"}
          >
            <ChevronRight className="size-4 transition-transform" />
          </Button>
        </CollapsibleTrigger>
        <Link
          href={href}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 pr-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800",
            isActive && "bg-zinc-100 font-medium dark:bg-zinc-800",
          )}
        >
          <FileText className="size-4 shrink-0 opacity-60" aria-hidden />
          <span className="truncate">{doc.title || "Untitled"}</span>
        </Link>
      </div>
      <CollapsibleContent className="space-y-0.5">
        {children.map((child) => (
          <TreeNode key={child._id} doc={child} childrenMap={childrenMap} depth={depth + 1} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function DocumentSidebar() {
  const pathname = usePathname();
  const [narrow, setNarrow] = useState(false);
  const docs = useQuery(api.documents.listForSidebar);

  const childrenMap = useMemo(() => {
    if (!docs) return new Map<string, DocumentDoc[]>();
    return buildChildrenMap(docs);
  }, [docs]);

  const roots = childrenMap.get(ROOT_KEY) ?? [];

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/80",
        narrow ? "w-[52px]" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex h-12 items-center border-b border-zinc-200 px-2 dark:border-zinc-800",
          narrow ? "justify-center" : "justify-between gap-2",
        )}
      >
        {!narrow && (
          <span className="truncate px-1 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Onyx
          </span>
        )}
        <AuthButton />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={() => setNarrow((v) => !v)}
          aria-label={narrow ? "Expand sidebar" : "Collapse sidebar"}
        >
          {narrow ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
      </div>

      {!narrow && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2">
          <Collapsible defaultOpen>
            <div className="mb-1 flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 flex-1 justify-start px-2 text-xs font-medium uppercase tracking-wide text-zinc-500 [&[data-state=open]>svg]:rotate-90"
                >
                  <ChevronRight className="mr-1 size-3 transition-transform" />
                  Pages
                </Button>
              </CollapsibleTrigger>
              <CreateDocumentButton />
            </div>
            <CollapsibleContent className="space-y-0.5 pb-2">
              {docs === undefined && (
                <p className="px-2 py-3 text-xs text-zinc-500">Loading pages…</p>
              )}
              {docs !== undefined && roots.length === 0 && (
                <p className="px-2 py-3 text-xs leading-relaxed text-zinc-500">
                  No pages yet. After Clerk is connected, create one from the editor toolbar (next
                  step).
                </p>
              )}
              {roots.map((doc) => (
                <TreeNode key={doc._id} doc={doc} childrenMap={childrenMap} depth={0} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {narrow && (
        <div className="flex flex-1 flex-col items-center gap-1 py-2">
          {roots.slice(0, 6).map((doc) => {
            const href = `/documents/${doc._id}`;
            const isActive = pathname === href;
            return (
              <Link
                key={doc._id}
                href={href}
                title={doc.title}
                className={cn(
                  "flex size-9 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800",
                  isActive && "bg-zinc-200 dark:bg-zinc-800",
                )}
              >
                <FileText className="size-4" />
              </Link>
            );
          })}
        </div>
      )}
    </aside>
  );
}
