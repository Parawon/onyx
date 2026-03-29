"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import { useUserRole } from "@/components/providers/role-provider";
import { DocumentSidebar } from "@/components/sidebar/document-sidebar";

const UNGATED_PATHS = new Set(["/unauthorized"]);

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, isLoading } = useUserRole();

  const isUngated = UNGATED_PATHS.has(pathname);

  useEffect(() => {
    if (isUngated || isLoading) return;
    if (!role) {
      router.replace("/unauthorized");
    }
  }, [isUngated, isLoading, role, router]);

  if (!isUngated && !isLoading && !role) {
    return null;
  }

  return (
    <div className="flex h-screen min-h-0 w-full min-w-0 flex-row overflow-hidden bg-black">
      <DocumentSidebar />
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardTopBar />
        <main
          id="onyx-main"
          className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
