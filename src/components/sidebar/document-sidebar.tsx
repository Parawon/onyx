"use client";

import {
  Briefcase,
  Calendar,
  ChevronDown,
  FileText,
  LayoutDashboard,
  PanelLeft,
  PanelLeftClose,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "Onyx";

/** Width of the icon rail — must match collapsed sidebar (`w-[52px]`) so icons stay aligned when toggling. */
const ICON_RAIL = "w-[52px]";

/** Same pixel size in expanded and collapsed nav (Lucide default stroke looks best at 18px here). */
const NAV_ICON_CLASS = "size-[1.125rem] shrink-0";

/** Same height as `DashboardTopBar` (`h-20` / 5rem). */
const SIDEBAR_HEADER_ROW = "h-20 shrink-0 border-b border-zinc-800";

type NavEntry = {
  href: string;
  label: string;
  Icon: LucideIcon;
  isActive: (pathname: string) => boolean;
  children?: Array<{ href: string; label: string; isActive: (pathname: string) => boolean }>;
};

const NAV_ITEMS: NavEntry[] = [
  {
    href: "/",
    label: "Dashboard",
    Icon: LayoutDashboard,
    isActive: (pathname) => pathname === "/",
  },
  {
    href: "/goals",
    label: "Goals",
    Icon: Target,
    isActive: (pathname) => pathname === "/goals" || pathname.startsWith("/goals/"),
    children: [
      { href: "/goals/alpha", label: "Alpha", isActive: (pathname) => pathname === "/goals/alpha" },
      { href: "/goals/bravo", label: "Bravo", isActive: (pathname) => pathname === "/goals/bravo" },
      { href: "/goals/charlie", label: "Charlie", isActive: (pathname) => pathname === "/goals/charlie" },
    ],
  },
  {
    href: "/notes",
    label: "Notes",
    Icon: FileText,
    isActive: (pathname) =>
      pathname === "/notes" ||
      pathname === "/documents" ||
      pathname.startsWith("/documents/"),
  },
  {
    href: "/calendar",
    label: "Calendar",
    Icon: Calendar,
    isActive: (pathname) => pathname === "/calendar" || pathname.startsWith("/calendar/"),
    children: [
      {
        href: "/calendar/alpha",
        label: "Alpha",
        isActive: (pathname) => pathname === "/calendar/alpha",
      },
      {
        href: "/calendar/bravo",
        label: "Bravo",
        isActive: (pathname) => pathname === "/calendar/bravo",
      },
      {
        href: "/calendar/charlie",
        label: "Charlie",
        isActive: (pathname) => pathname === "/calendar/charlie",
      },
    ],
  },
  {
    href: "/management",
    label: "Management",
    Icon: Briefcase,
    isActive: (pathname) => pathname === "/management",
  },
  {
    href: "/finance",
    label: "Finance",
    Icon: Wallet,
    isActive: (pathname) => pathname === "/finance",
  },
];

function NavItem({
  href,
  label,
  Icon,
  isActive,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-10 w-full cursor-pointer items-center transition-all active:scale-[0.98]",
        isActive
          ? "border-r-2 border-sky-500 bg-zinc-900/80 font-semibold text-white"
          : "text-zinc-400 hover:bg-zinc-900/50 hover:text-white",
      )}
    >
      <span className="min-w-0 flex-1 truncate py-2.5 pl-6 pr-2">{label}</span>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center self-stretch border-l border-transparent py-2",
          ICON_RAIL,
          isActive && "border-zinc-800/80 bg-black/20",
        )}
        aria-hidden
      >
        <Icon
          className={cn(
            NAV_ICON_CLASS,
            isActive ? "text-sky-400" : "text-zinc-500 group-hover:text-zinc-300",
          )}
        />
      </span>
    </Link>
  );
}

function ExpandableNavItem({
  href,
  label,
  Icon,
  isActive,
  expanded,
  onOpen,
  onToggleFromChevron,
  children,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  isActive: boolean;
  expanded: boolean;
  onOpen: () => void;
  onToggleFromChevron: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <div
        className={cn(
          "group flex min-h-10 w-full cursor-pointer items-center transition-all active:scale-[0.98]",
          isActive
            ? "border-r-2 border-sky-500 bg-zinc-900/80 font-semibold text-white"
            : "text-zinc-400 hover:bg-zinc-900/50 hover:text-white",
        )}
      >
        <Link
          href={href}
          onClick={() => onOpen()}
          className="min-w-0 flex-1 truncate py-2.5 pl-6 pr-2 text-left"
          aria-label={`${label} page`}
        >
          {label}
        </Link>
        {expanded && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFromChevron();
            }}
            className="mr-2 inline-flex size-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-900/60 hover:text-white"
            aria-label="Collapse submenu"
            aria-expanded={expanded}
          >
            <ChevronDown className="size-4 rotate-180" />
          </button>
        )}
        <span
          className={cn(
            "flex shrink-0 items-center justify-center self-stretch border-l border-transparent py-2",
            ICON_RAIL,
            isActive && "border-zinc-800/80 bg-black/20",
          )}
          aria-hidden
        >
          <Icon
            className={cn(
              NAV_ICON_CLASS,
              isActive ? "text-sky-400" : "text-zinc-500 group-hover:text-zinc-300",
            )}
          />
        </span>
      </div>
      <div className={cn("mt-1 w-full", !expanded && "hidden")}>{children}</div>
    </div>
  );
}

function SubNavItem({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-9 w-full items-center rounded-md px-3 py-2 pl-10 text-sm transition-colors",
        isActive
          ? "bg-zinc-900/70 text-white"
          : "text-zinc-500 hover:bg-zinc-900/40 hover:text-white",
      )}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Link>
  );
}

function CollapsedNavIcon({
  href,
  label,
  Icon,
  isActive,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={cn(
        "flex min-h-10 w-full shrink-0 items-center justify-center transition-colors",
        ICON_RAIL,
        isActive
          ? "bg-sky-600 text-white hover:bg-sky-500"
          : "text-zinc-500 hover:bg-zinc-900 hover:text-white",
      )}
    >
      <Icon
        className={cn(NAV_ICON_CLASS, isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300")}
      />
    </Link>
  );
}

export function DocumentSidebar() {
  const pathname = usePathname();
  const [narrow, setNarrow] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const navWithActive = useMemo(
    () =>
      NAV_ITEMS.map((item) => ({
        ...item,
        active: item.isActive(pathname),
      })),
    [pathname],
  );

  const isInGoals = pathname === "/goals" || pathname.startsWith("/goals/");
  const isGoalsChildRoute = pathname.startsWith("/goals/");
  const effectiveGoalsOpen = isGoalsChildRoute ? true : goalsOpen;

  // Close Goals dropdown when navigating away from Goals entirely.
  useEffect(() => {
    if (!isInGoals) setGoalsOpen(false);
  }, [isInGoals]);

  const isInCalendar = pathname === "/calendar" || pathname.startsWith("/calendar/");
  const isCalendarChildRoute = pathname.startsWith("/calendar/");
  const effectiveCalendarOpen = isCalendarChildRoute ? true : calendarOpen;

  // Close Calendar dropdown when navigating away from Calendar entirely.
  useEffect(() => {
    if (!isInCalendar) setCalendarOpen(false);
  }, [isInCalendar]);

  return (
    <aside
      className={cn(
        "sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-zinc-800 bg-black font-medium antialiased tracking-tight",
        narrow ? ICON_RAIL : "w-64 border-zinc-900",
        !narrow && "font-['Inter',var(--font-inter),sans-serif] text-sm tracking-tight",
      )}
    >
      {/* No top padding — header row must align with DashboardTopBar (h-20) at the top of the viewport */}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden pb-8",
          narrow ? "pl-0 pr-0" : "pl-6 pr-0",
        )}
      >
        <div
          className={cn(
            "mb-1 flex w-full gap-0",
            SIDEBAR_HEADER_ROW,
            narrow ? "flex-col items-center justify-center" : "items-center",
          )}
        >
          {!narrow && (
            <div className="min-w-0 flex-1 pr-2 leading-tight">
              <h1 className="truncate text-lg font-bold tracking-tighter text-white">{COMPANY_NAME}</h1>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                powered by Onyx
              </p>
            </div>
          )}
          <div
            className={cn(
              "flex shrink-0 items-center justify-center self-stretch",
              ICON_RAIL,
              narrow && "w-full",
            )}
          >
            {narrow ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-zinc-400 hover:bg-zinc-900 hover:text-white"
                onClick={() => setNarrow(false)}
                aria-label="Expand sidebar"
              >
                <PanelLeft className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-zinc-400 hover:bg-zinc-900 hover:text-white"
                onClick={() => setNarrow(true)}
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="size-4" />
              </Button>
            )}
          </div>
        </div>

        <nav
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          aria-label="Main navigation"
        >
          {/* Reserve top sixth of the nav column; links sit below (scroll if needed) */}
          <div className="h-1/6 min-h-0 shrink-0" aria-hidden />
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-y-auto",
              narrow ? "items-center gap-2" : "gap-1",
            )}
          >
            {navWithActive.map(({ href, label, Icon, active, children }) => {
              if (narrow) {
                return (
                  <CollapsedNavIcon key={label} href={href} label={label} Icon={Icon} isActive={active} />
                );
              }

              if (href === "/goals" && children != null && children.length > 0) {
                return (
                  <ExpandableNavItem
                    key={label}
                    href={href}
                    label={label}
                    Icon={Icon}
                    isActive={active}
                    expanded={effectiveGoalsOpen}
                    onOpen={() => setGoalsOpen(true)}
                    onToggleFromChevron={() => {
                      // Allow closing only when on `/goals`. Never close on child pages.
                      if (pathname.startsWith("/goals/")) {
                        setGoalsOpen(true);
                        return;
                      }
                      setGoalsOpen((v) => !v);
                    }}
                  >
                    <div className="space-y-1 pr-3">
                      {children.map((child) => (
                        <SubNavItem
                          key={child.href}
                          href={child.href}
                          label={child.label}
                          isActive={child.isActive(pathname)}
                        />
                      ))}
                    </div>
                  </ExpandableNavItem>
                );
              }

              if (href === "/calendar" && children != null && children.length > 0) {
                return (
                  <ExpandableNavItem
                    key={label}
                    href={href}
                    label={label}
                    Icon={Icon}
                    isActive={active}
                    expanded={effectiveCalendarOpen}
                    onOpen={() => setCalendarOpen(true)}
                    onToggleFromChevron={() => {
                      // Allow closing only when on `/calendar`. Never close on child pages.
                      if (pathname.startsWith("/calendar/")) {
                        setCalendarOpen(true);
                        return;
                      }
                      setCalendarOpen((v) => !v);
                    }}
                  >
                    <div className="space-y-1 pr-3">
                      {children.map((child) => (
                        <SubNavItem
                          key={child.href}
                          href={child.href}
                          label={child.label}
                          isActive={child.isActive(pathname)}
                        />
                      ))}
                    </div>
                  </ExpandableNavItem>
                );
              }

              return <NavItem key={label} href={href} label={label} Icon={Icon} isActive={active} />;
            })}
          </div>
        </nav>
      </div>
    </aside>
  );
}
