"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { api } from "@convex/_generated/api";
import { GoalsEditorSection } from "@/components/editor/goals-editor-section";
import { GoalsPageHeader } from "@/components/goals/goals-page-header";
import { useUserRole } from "@/components/providers/role-provider";
import { Button } from "@/components/ui/button";

function DeleteSubPageButton({ slug }: { slug: string }) {
  const router = useRouter();
  const deleteSubPage = useMutation(api.goals.deleteSubPage);
  const [busy, setBusy] = useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={busy}
      className="text-zinc-400 hover:bg-zinc-900/60 hover:text-red-400"
      onClick={() => {
        const ok = window.confirm(
          "Delete this Goals sub-page and all of its content? This cannot be undone.",
        );
        if (!ok) {
          return;
        }
        setBusy(true);
        void deleteSubPage({ slug })
          .then(() => {
            router.push("/goals");
          })
          .catch((err: unknown) => {
            setBusy(false);
            const message = err instanceof Error ? err.message : "Could not delete this sub-page.";
            window.alert(message);
          });
      }}
    >
      <Trash2 className="mr-1.5 size-4" aria-hidden />
      {busy ? "Deleting…" : "Delete sub-page"}
    </Button>
  );
}

export function GoalsSubPage({ slug }: { slug: string }) {
  const decoded = decodeURIComponent(slug);
  const meta = useQuery(api.goals.getSubPageMeta, { slug: decoded });
  const { hasRole } = useUserRole();
  const canDelete = hasRole("admin") || (meta?.isOwn ?? false);

  if (meta === undefined) {
    return (
      <div className="flex min-h-[40vh] flex-col bg-background px-12 pt-12 text-sm text-zinc-400">
        Loading…
      </div>
    );
  }

  if (meta === null) {
    return (
      <div className="flex min-h-[40vh] flex-col bg-background px-12 pt-12">
        <p className="text-lg text-zinc-400">This Goals sub-page doesn’t exist or you don’t have access.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-background">
      <GoalsPageHeader suffix={meta.label} right={canDelete ? <DeleteSubPageButton slug={decoded} /> : undefined} />
      <div className="w-full">
        <GoalsEditorSection scope={decoded} />
      </div>
    </div>
  );
}
