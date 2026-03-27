"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-2xl">
        <SignUp path="/sign-up" routing="path" forceRedirectUrl="/goals" />
      </div>
    </main>
  );
}

