import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import { DocumentSidebar } from "@/components/sidebar/document-sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen min-h-0 w-full min-w-0 flex-row overflow-hidden bg-black">
      <DocumentSidebar />
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardTopBar />
        <main className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          {children}
        </main>
      </div>
    </div>
  );
}
