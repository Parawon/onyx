"use client";

import { Bell, Search } from "lucide-react";

import { AuthButton } from "@/components/auth/user-button";

export function DashboardTopBar() {
  return (
    <header className="flex h-20 w-full shrink-0 items-center justify-between border-b border-zinc-800 bg-black px-8">
      <div className="flex items-center gap-4" />
      <div className="flex items-center gap-6">
        <div className="group relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search Onyx..."
            className="w-64 rounded-full border-none bg-zinc-900 py-1.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 transition-all focus:ring-1 focus:ring-sky-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-zinc-500 transition-colors hover:text-white"
            aria-label="Notifications"
          >
            <Bell className="size-5" />
          </button>
          <div className="flex shrink-0 items-center">
            <AuthButton />
          </div>
        </div>
      </div>
    </header>
  );
}
