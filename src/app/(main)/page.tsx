export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center p-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Welcome to Onyx
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Choose a page in the sidebar, or continue setup: connect Clerk and Convex, then the BlockNote
        editor will land here with live sync.
      </p>
    </div>
  );
}
