"use client";

import { ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";

import { WorkspaceAnnouncementRow } from "@/components/workspace/workspace-section-page";

const DashboardEditorBlock = dynamic(
  () => import("@/components/dashboard/dashboard-editor-block").then((mod) => mod.DashboardEditorBlock),
  { ssr: false },
);

export function DashboardHomeContent() {
  return (
    <>
      <div className="mt-10 max-w-4xl">
        <DashboardEditorBlock />
      </div>
      <div className="mt-14 max-w-3xl">
        <h3 className="mb-6 text-2xl font-bold tracking-tight text-white">Announcements</h3>
        <div className="space-y-4">
          <WorkspaceAnnouncementRow title="Quarterly Strategic Review - Oct 24, 2023" />
          <WorkspaceAnnouncementRow title="New Security Protocols Implementation - Oct 20, 2023" />
          <div className="group flex min-h-[4.5rem] items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-5 transition-colors hover:border-sky-500/40">
            <span className="text-zinc-500">More updates soon</span>
            <ArrowRight className="size-5 text-zinc-600 transition-colors group-hover:text-sky-400" />
          </div>
        </div>
      </div>
    </>
  );
}

