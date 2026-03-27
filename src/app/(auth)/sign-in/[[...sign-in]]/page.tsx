"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-2xl">
        <SignIn path="/sign-in" routing="path" forceRedirectUrl="/goals" />
      </div>
    </main>
  );
}

