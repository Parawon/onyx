import { DocumentSidebar } from "@/components/sidebar/document-sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen min-h-0 w-full">
      <DocumentSidebar />
      <main className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</main>
    </div>
  );
}
