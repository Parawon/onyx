"use client";

import { useMutation, useQuery } from "convex/react";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { api } from "@convex/_generated/api";
import { useUserRole } from "@/components/providers/role-provider";

const ASSIGNABLE_ROLES = ["team_member", "editor", "admin"] as const;

const ROLE_LABELS: Record<string, string> = {
  superuser: "Superuser",
  admin: "Admin",
  editor: "Editor",
  team_member: "Team Member",
};

function UserRow({
  user,
}: {
  user: { clerkUserId: string; label: string; imageUrl: string; role: string | null };
}) {
  const setUserRole = useMutation(api.users.setUserRole);
  const [saving, setSaving] = useState(false);
  const isSuperuser = user.role === "superuser";

  const handleChange = async (newRole: string) => {
    setSaving(true);
    try {
      await setUserRole({ targetUserId: user.clerkUserId, role: newRole });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update role";
      window.alert(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="border-b border-zinc-800/60 last:border-0">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt=""
              className="size-8 shrink-0 rounded-full bg-zinc-800 object-cover"
            />
          ) : (
            <div className="size-8 shrink-0 rounded-full bg-zinc-800" />
          )}
          <span className="truncate text-sm font-medium text-white">
            {user.label}
          </span>
        </div>
      </td>
      <td className="py-3 pr-4">
        {isSuperuser ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400">
            <ShieldCheck className="size-3.5" />
            Superuser
          </span>
        ) : (
          <select
            value={user.role ?? ""}
            onChange={(e) => void handleChange(e.target.value)}
            disabled={saving}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white outline-none transition focus:border-zinc-500 disabled:opacity-50"
          >
            {!user.role && (
              <option value="" disabled>
                No role
              </option>
            )}
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        )}
      </td>
    </tr>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { role, isLoading } = useUserRole();
  const users = useQuery(api.users.getAllUsers);

  useEffect(() => {
    if (!isLoading && role !== "superuser") {
      router.replace("/");
    }
  }, [isLoading, role, router]);

  if (isLoading || role !== "superuser") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[900px] px-12 py-12">
      <section className="mb-12">
        <h1 className="text-[2.5rem] font-extrabold leading-tight tracking-tighter text-white">
          User Management
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Assign roles to control what each team member can do in the workspace.
        </p>
      </section>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950/50">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody className="px-4">
            {!users ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-sm text-zinc-500">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-sm text-zinc-500">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => <UserRow key={u.clerkUserId} user={u} />)
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-4">
        <h3 className="text-sm font-semibold text-zinc-300">Role permissions</h3>
        <ul className="mt-2 space-y-1 text-xs text-zinc-500">
          <li><span className="text-zinc-300">Admin</span> — Create/delete pages, edit content, view all</li>
          <li><span className="text-zinc-300">Editor</span> — Edit content, view all</li>
          <li><span className="text-zinc-300">Team Member</span> — View only (read-only)</li>
        </ul>
      </div>
    </div>
  );
}
