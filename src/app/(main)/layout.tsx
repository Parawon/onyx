import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import { DocumentSidebar } from "@/components/sidebar/document-sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen min-h-0 w-full bg-black">
      <DocumentSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <DashboardTopBar />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
