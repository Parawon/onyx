"use client";

import dynamic from "next/dynamic";
import { DualProgressBar } from "@/components/goals";

const BlockNoteDemo = dynamic(
  () => import("@/components/editor/blocknote-demo").then((m) => m.BlockNoteDemo),
  { ssr: false },
);

export function GoalsDemoSection() {
  return (
    <div className="max-w-3xl space-y-10">
      <DualProgressBar p1={48} p2={72} ariaLabelP1="Metric A" ariaLabelP2="Metric B" />
      <BlockNoteDemo />
    </div>
  );
}
