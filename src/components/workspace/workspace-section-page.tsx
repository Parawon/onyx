import { ArrowRight } from "lucide-react";

export function WorkspaceSectionPage({
  title,
  tagline,
  description,
  sectionHeading,
  children,
}: {
  title: string;
  tagline: string;
  description: string;
  sectionHeading?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-12 py-12">
      <section className="mb-16">
        <h2 className="mb-4 text-[3.5rem] font-extrabold leading-[0.9] tracking-tighter text-white">
          {title}
        </h2>
        <div className="mb-8 mt-12 border-t border-zinc-800 pt-8">
          <div className="flex items-center gap-4">
            <div className="h-1 w-8 rounded-full bg-sky-500/30" />
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-sky-400">{tagline}</p>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-lg font-light leading-relaxed text-zinc-400">{description}</p>
        {children != null && sectionHeading != null && (
          <div className="mt-16">
            <h3 className="mb-8 text-2xl font-bold tracking-tight text-white">{sectionHeading}</h3>
            {children}
          </div>
        )}
      </section>
    </div>
  );
}

export function WorkspaceAnnouncementRow({ title }: { title: string }) {
  return (
    <a
      href="#"
      className="group flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-5 transition-colors hover:border-sky-500/40"
    >
      <span className="font-medium text-white">{title}</span>
      <ArrowRight className="size-5 shrink-0 text-zinc-600 transition-colors group-hover:text-sky-400" />
    </a>
  );
}
