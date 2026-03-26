type PageProps = { params: Promise<{ documentId: string }> };

export default async function DocumentPage({ params }: PageProps) {
  const { documentId } = await params;
  return (
    <div className="flex min-h-full flex-col p-8">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Document</p>
      <h1 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Editor</h1>
      <p className="mt-2 max-w-lg text-sm text-zinc-600 dark:text-zinc-400">
        BlockNote + debounced Convex updates will go here. Document id:{" "}
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">{documentId}</code>
      </p>
    </div>
  );
}
