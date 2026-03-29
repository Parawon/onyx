"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import { useUserRole } from "@/components/providers/role-provider";

export default function UnauthorizedPage() {
  const { role, isLoading } = useUserRole();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && role) {
      router.replace("/");
    }
  }, [isLoading, role, router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <ShieldAlert className="mb-6 size-16 text-zinc-600" />
      <h1 className="text-2xl font-bold tracking-tight text-white">
        Pending Approval
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
        Your account does not have access yet. Contact your administrator to get
        a role assigned.
      </p>
      <p className="mt-6 text-xs text-zinc-600">
        This page will automatically redirect once access is granted.
      </p>
    </div>
  );
}
