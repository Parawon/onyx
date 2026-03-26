import { cn } from "@/lib/utils";

export type DualProgressBarProps = {
  /** Primary value (0–100). Solid bar underneath; green when greater than `p2`, red otherwise. */
  p1: number;
  /** Secondary value (0–100). Translucent bar drawn on top of p1. */
  p2: number;
  /** Optional label for the p1 value (accessibility). */
  ariaLabelP1?: string;
  /** Optional label for the p2 value (accessibility). */
  ariaLabelP2?: string;
  className?: string;
};

function clampPercent(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/**
 * Single track with **p1** (solid, bottom layer) and **p2** (translucent, on top).
 * p1 is green when p1 &gt; p2, red when p2 ≥ p1.
 */
export function DualProgressBar({
  p1,
  p2,
  ariaLabelP1 = "Primary progress",
  ariaLabelP2 = "Secondary progress",
  className,
}: DualProgressBarProps) {
  const a = clampPercent(p1);
  const b = clampPercent(p2);
  const p1Green = a > b;

  return (
    <div
      role="group"
      aria-label={`${ariaLabelP1} ${Math.round(a)} percent, ${ariaLabelP2} ${Math.round(b)} percent`}
      className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-zinc-800", className)}
    >
      {/* p1 — bottom layer */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out",
          p1Green ? "bg-emerald-500" : "bg-red-500",
        )}
        style={{ width: `${a}%` }}
      />
      {/* p2 — on top of p1 */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 z-10 rounded-full bg-sky-400/20 transition-[width] duration-300 ease-out"
        style={{ width: `${b}%` }}
      />
    </div>
  );
}
