import { FileX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DocumentNotFound() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
      <FileX className="mb-4 size-12 text-zinc-400 dark:text-zinc-600" />
      <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Document not found
      </h2>
      <p className="mb-6 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        This document doesn't exist or you don't have permission to view it.
      </p>
      <Button asChild>
        <Link href="/">Go Home</Link>
      </Button>
    </div>
  );
}