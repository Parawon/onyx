"use client";

import { AuthButton } from "@/components/auth/user-button";

export function DashboardTopBar() {
  return (
    <header className="sticky top-0 z-[100] flex h-20 w-full shrink-0 items-center justify-between border-b border-zinc-800 bg-black px-8">
      <div className="flex items-center gap-4">
        <span className="text-lg font-bold tracking-tight text-white">BuilderLab</span>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex shrink-0 items-center">
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
