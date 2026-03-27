"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type TaskNameSuggestionTarget = {
  label: string;
  href: string;
  aliases?: string[];
};

export type TaskNameSegment =
  | { type: "text"; text: string }
  | { type: "link"; label: string; href: string };

function sanitizeHref(href: string): string | null {
  const t = href.trim();
  if (!t) {
    return null;
  }
  if (t.startsWith("/") && !t.startsWith("//")) {
    return t;
  }
  if (t.startsWith("http://") || t.startsWith("https://")) {
    return t;
  }
  return null;
}

function parsePlainUrls(s: string): TaskNameSegment[] {
  const out: TaskNameSegment[] = [];
  const urlRe = /\bhttps?:\/\/[^\s<]+/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(s)) !== null) {
    if (m.index > last) {
      out.push({ type: "text", text: s.slice(last, m.index) });
    }
    const href = sanitizeHref(m[0]);
    if (href) {
      out.push({ type: "link", label: m[0], href });
    } else {
      out.push({ type: "text", text: m[0] });
    }
    last = m.index + m[0].length;
  }
  if (last < s.length) {
    out.push({ type: "text", text: s.slice(last) });
  }
  return out;
}

function mergeAdjacentText(segments: TaskNameSegment[]): TaskNameSegment[] {
  const merged: TaskNameSegment[] = [];
  for (const seg of segments) {
    if (seg.type === "text") {
      const prev = merged[merged.length - 1];
      if (prev?.type === "text") {
        prev.text += seg.text;
      } else {
        merged.push({ type: "text", text: seg.text });
      }
    } else {
      merged.push(seg);
    }
  }
  return merged;
}

/** Parse markdown-style `[label](url)` and bare `https://` URLs for display. */
export function parseTaskNameSegments(raw: string): TaskNameSegment[] {
  if (!raw) {
    return [{ type: "text", text: "" }];
  }
  const out: TaskNameSegment[] = [];
  const md = /\[([^\]]*)\]\(([^)]*)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = md.exec(raw)) !== null) {
    if (m.index > last) {
      out.push(...parsePlainUrls(raw.slice(last, m.index)));
    }
    const href = sanitizeHref(m[2]);
    const label = (m[1]?.trim() || m[2]?.trim() || "").trim();
    if (href && label) {
      out.push({ type: "link", label, href });
    } else {
      out.push({ type: "text", text: m[0] });
    }
    last = m.index + m[0].length;
  }
  if (last < raw.length) {
    out.push(...parsePlainUrls(raw.slice(last)));
  }
  return mergeAdjacentText(out);
}

/** Strip markdown links to label text for calendar titles and compact lists. */
export function taskNameToPlainText(raw: string): string {
  return raw.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").trim();
}

function TaskNameDisplay({
  segments,
  emptyLabel,
}: {
  segments: TaskNameSegment[];
  emptyLabel: string;
}) {
  const isEmpty =
    segments.length === 0 ||
    (segments.length === 1 &&
      segments[0].type === "text" &&
      segments[0].text === "");

  if (isEmpty) {
    return <span className="font-normal text-zinc-500">{emptyLabel}</span>;
  }

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return <span key={i}>{seg.text}</span>;
        }
        const { href, label } = seg;
        const common = "onyx-inline-link rounded-sm font-medium";
        if (href.startsWith("/")) {
          return (
            <Link
              key={i}
              href={href}
              className={common}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {label}
            </Link>
          );
        }
        return (
          <a
            key={i}
            href={href}
            className={common}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {label}
          </a>
        );
      })}
    </>
  );
}

function getActiveSuggestionToken(value: string, caret: number) {
  const beforeCaret = value.slice(0, caret);
  const match = /\[\[([^\]]*)$/.exec(beforeCaret);
  if (!match) {
    return null;
  }
  return {
    start: beforeCaret.length - match[0].length,
    end: caret,
    query: (match[1] ?? "").trim().toLowerCase(),
  };
}

export function TaskNameField({
  value,
  onChange,
  suggestions = [],
  className,
  inputClassName,
  placeholder = "Untitled",
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  suggestions?: TaskNameSuggestionTarget[];
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  "aria-label"?: string;
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const segments = useMemo(() => parseTaskNameSegments(value), [value]);
  const [menuIndex, setMenuIndex] = useState(0);
  const [caretPos, setCaretPos] = useState<number | null>(null);
  const activeToken = useMemo(
    () => (caretPos == null ? null : getActiveSuggestionToken(value, caretPos)),
    [value, caretPos],
  );
  const filteredSuggestions = useMemo(() => {
    if (!activeToken) {
      return [];
    }
    const q = activeToken.query;
    const all = suggestions.filter((t) => t.href.startsWith("/"));
    if (!q) {
      return all.slice(0, 8);
    }
    return all
      .filter((t) => {
        const aliasHit = (t.aliases ?? []).some((a) => a.toLowerCase().includes(q));
        return t.label.toLowerCase().includes(q) || t.href.toLowerCase().includes(q) || aliasHit;
      })
      .slice(0, 8);
  }, [activeToken, suggestions]);
  const showMenu = focused && activeToken != null && filteredSuggestions.length > 0;

  useEffect(() => {
    if (focused) {
      inputRef.current?.focus();
    }
  }, [focused]);

  useEffect(() => {
    setMenuIndex(0);
  }, [showMenu, activeToken?.query]);

  const startEdit = useCallback(() => {
    setFocused(true);
  }, []);

  const applySuggestion = useCallback(
    (target: TaskNameSuggestionTarget) => {
      if (!activeToken) {
        return;
      }
      const linkText = `[${target.label}](${target.href})`;
      const next = `${value.slice(0, activeToken.start)}${linkText} ${value.slice(activeToken.end)}`;
      const nextCaret = activeToken.start + linkText.length + 1;
      onChange(next);
      requestAnimationFrame(() => {
        const input = inputRef.current;
        if (!input) {
          return;
        }
        input.focus();
        input.setSelectionRange(nextCaret, nextCaret);
        setCaretPos(nextCaret);
      });
    },
    [activeToken, onChange, value],
  );

  if (focused) {
    return (
      <div className="relative w-full">
        <input
          ref={inputRef}
          id={labelId}
          className={cn(inputClassName)}
          value={value}
          placeholder={placeholder}
          aria-label={ariaLabel}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => setCaretPos((e.target as HTMLInputElement).selectionStart)}
          onKeyUp={(e) => setCaretPos((e.target as HTMLInputElement).selectionStart)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (showMenu) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setMenuIndex((prev) => (prev + 1) % filteredSuggestions.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setMenuIndex(
                  (prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length,
                );
                return;
              }
              if (e.key === "Enter") {
                e.preventDefault();
                applySuggestion(filteredSuggestions[menuIndex]!);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setCaretPos(null);
                return;
              }
            }
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        {showMenu ? (
          <div className="absolute left-0 top-full z-40 mt-1 w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 shadow-xl">
            <ul className="max-h-56 overflow-y-auto py-1">
              {filteredSuggestions.map((target, idx) => (
                <li key={`${target.href}-${target.label}`}>
                  <button
                    type="button"
                    className={cn(
                      "w-full px-3 py-2 text-left",
                      idx === menuIndex ? "bg-zinc-900 text-white" : "text-zinc-300 hover:bg-zinc-900",
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applySuggestion(target)}
                  >
                    <p className="truncate text-sm">{target.label}</p>
                    <p className="truncate text-xs text-zinc-500">{target.href}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      id={labelId}
      className={cn(
        "onyx-task-name-display w-full min-h-[1.35em] cursor-text rounded-sm text-left text-[14px] text-zinc-200 outline-none focus-visible:ring-1 focus-visible:ring-zinc-600",
        className,
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) {
          return;
        }
        startEdit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startEdit();
        }
      }}
      aria-label={ariaLabel}
    >
      <TaskNameDisplay segments={segments} emptyLabel={placeholder} />
    </div>
  );
}
