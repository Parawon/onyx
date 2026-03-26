export function EditorSkeleton() {
  return (
    <div className="min-h-[400px] w-full space-y-4 animate-pulse">
      {/* Title skeleton */}
      <div className="h-10 w-64 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
      
      {/* Editor content skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded"></div>
        <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
        <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
        <div className="h-4 w-5/6 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
      </div>
    </div>
  );
}