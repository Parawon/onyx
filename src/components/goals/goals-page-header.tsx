import type { ReactNode } from "react";

export function GoalsPageHeader({
  suffix,
  right,
}: {
  suffix: string;
  right?: ReactNode;
}) {
  return (
    <header className="shrink-0 px-12 pt-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="flex min-w-0 flex-wrap items-center gap-x-2 text-[3.5rem] font-extrabold leading-[0.9] tracking-tighter text-white">
          <span>Goals</span>
          <span className="text-5xl font-medium tracking-tighter text-sky-400/80">
            &nbsp;—&nbsp;&nbsp;&nbsp;{suffix}
          </span>
        </h1>
        {right != null ? <div className="shrink-0 pt-1">{right}</div> : null}
      </div>
      <div className="mt-8 border-t border-zinc-800" aria-hidden />
    </header>
  );
}
