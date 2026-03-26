"use client";

import dynamic from "next/dynamic";
import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import { EditorSaveStatusIndicator } from "./editor-save-status-indicator";
import { EditorSaveStateProvider } from "./editor-save-state-provider";

const BlockNoteCanvas = dynamic(
  () => import("./blocknote-canvas").then((mod) => mod.BlockNoteCanvas),
  { ssr: false },
);

export function GoalsEditorSection(props: { scope?: string }) {
  const scope = props.scope ?? "main";
  const data = useQuery(api.goals.get, { scope });

  if (data === undefined) {
    return (
      <div className="flex min-h-[40vh] flex-1 items-center justify-center bg-background px-12 py-4 text-sm text-zinc-400">
        Loading editor...
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-background px-12 py-4 text-sm text-zinc-500">
        Sign in to capture and edit your goals in this workspace.
      </div>
    );
  }

  return (
    <EditorSaveStateProvider>
      <div className="flex flex-col bg-background px-12 pb-6 pt-6">
        {/* Exact h-5 rail: indicator always renders same line box (invisible placeholder when idle) */}
        <div className="flex h-5 shrink-0 items-center justify-end">
          <EditorSaveStatusIndicator />
        </div>
        <div className="mt-3 min-h-0 min-w-0">
          <div className="min-h-full w-full pb-40">
            <BlockNoteCanvas
              key={`${data._id ?? "goals"}-${scope}`}
              kind="goals"
              goalsScope={scope}
              initialContent={data.content}
            />
          </div>
        </div>
      </div>
    </EditorSaveStateProvider>
  );
}
