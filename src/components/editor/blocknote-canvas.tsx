"use client";

import type { PartialBlock } from "@blocknote/core";
import { DEFAULT_LINK_PROTOCOL, VALID_LINK_PROTOCOLS } from "@blocknote/core/extensions";
import { BlockNoteView } from "@blocknote/mantine";
import {
  SideMenuController,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { Link } from "@tiptap/extension-link";
import { Search } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";

import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { onyxBlockNoteSchema } from "./blocknote-schema";
import { GoalsEditorScopeProvider } from "./goals-editor-scope-context";
import { useOptionalEditorSaveState } from "./editor-save-state-provider";
import { createOnyxSlashMenuGetItems } from "./onyx-blocknote-slash-menu";
import { getOnyxSlashMenuFloatingOptions } from "./onyx-slash-menu-floating";
import { ScrollableSuggestionMenu } from "./scrollable-suggestion-menu";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

/** Goals main page uses `"main"`; sub-pages use the URL slug string. */
export type GoalEditorScope = string;

export type BlockNoteCanvasProps = {
  initialContent: string;
} & (
  | { kind: "document"; documentId: Id<"documents"> }
  | { kind: "goals"; goalsScope: GoalEditorScope }
  | { kind: "local" }
);

/** Match BlockNote’s default Link mark, but do not open in a new window on click (TipTap defaults to `window.open(..., "_blank")` on mouseup). */
const onyxBlockNoteLinkMark = Link.extend({
  inclusive: false,
}).configure({
  defaultProtocol: DEFAULT_LINK_PROTOCOL,
  protocols: VALID_LINK_PROTOCOLS,
  openOnClick: false,
  HTMLAttributes: {
    rel: "noopener noreferrer",
  },
});

/** Relative path or same-origin absolute URL → path for `router.push`. */
function sameOriginAppPath(href: string): string | null {
  const trimmed = href.trim();
  if (trimmed.startsWith("/")) {
    return trimmed;
  }
  try {
    const u = new URL(trimmed, window.location.origin);
    if (u.origin !== window.location.origin) {
      return null;
    }
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return null;
  }
}

const parseBlocks = (content: string): PartialBlock[] | undefined => {
  try {
    const parsed = JSON.parse(content) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return undefined;
    }
    return parsed as PartialBlock[];
  } catch {
    return undefined;
  }
};

/** True if two BlockNote JSON payloads are equivalent (avoids re-sync loops from whitespace differences). */
function sameBlockDocumentJson(a: string, b: string): boolean {
  if (a === b) {
    return true;
  }
  try {
    return JSON.stringify(JSON.parse(a)) === JSON.stringify(JSON.parse(b));
  } catch {
    return false;
  }
}

const NOOP_SAVE_STATE = {
  markError: () => {},
  markSaved: () => {},
  markSaving: () => {},
  resetAutosaveUiForEdit: () => {},
  setAutosaveVisible: (_visible: boolean) => {},
};

export const BlockNoteCanvas = (props: BlockNoteCanvasProps) => {
  const router = useRouter();
  const { initialContent, kind } = props;
  const documentId = kind === "document" ? props.documentId : undefined;
  const goalsScope = kind === "goals" ? props.goalsScope : undefined;
  const persistToBackend = kind === "document" || kind === "goals";
  const updateDocument = useMutation(api.documents.update);
  const updateGoalsContent = useMutation(api.goals.updateContent);
  const syncCalendarFromGoalsDoc = useMutation(api.calendarEvents.syncFromGoalsDocument);
  const notes = useQuery(api.documents.listForSidebar);
  const goalsSubPages = useQuery(api.goals.listSubPages);
  const saveState = useOptionalEditorSaveState() ?? NOOP_SAVE_STATE;
  const { markError, markSaved, markSaving, resetAutosaveUiForEdit, setAutosaveVisible } = saveState;
  const initialBlocks = useMemo(() => parseBlocks(initialContent), [initialContent]);
  const [serializedContent, setSerializedContent] = useState(initialContent);
  /** Last persisted value (or server initial); used to skip autosave when unchanged and to hide autosave UI. */
  const baselineRef = useRef(initialContent);
  /** True while `replaceBlocks` is applying a remote Convex update (avoid marking dirty / autosave). */
  const applyingRemoteRef = useRef(false);
  const editorShellRef = useRef<HTMLDivElement>(null);
  const [backlinkPickerOpen, setBacklinkPickerOpen] = useState(false);
  const [backlinkQuery, setBacklinkQuery] = useState("");

  const editor = useCreateBlockNote({
    schema: onyxBlockNoteSchema,
    initialContent: initialBlocks,
    disableExtensions: ["link"],
    _tiptapOptions: {
      extensions: [onyxBlockNoteLinkMark],
    },
  });

  const backlinkTargets = useMemo(() => {
    const links: { label: string; href: string; aliases?: string[] }[] = [
      { label: "Goals — Company", href: "/goals", aliases: ["goals", "company"] },
      { label: "Notes home", href: "/notes", aliases: ["notes", "home"] },
    ];
    for (const n of notes ?? []) {
      links.push({
        label: `Note: ${n.title || "Untitled"}`,
        href: `/documents/${n._id}`,
        aliases: ["note", "doc", (n.title || "").toLowerCase()],
      });
    }
    for (const g of goalsSubPages ?? []) {
      links.push({
        label: `Goals: ${g.label}`,
        href: `/goals/${encodeURIComponent(g.slug)}`,
        aliases: ["goals", "page", g.slug.toLowerCase(), g.label.toLowerCase()],
      });
    }
    return links;
  }, [notes, goalsSubPages]);

  const slashMenuItems = useMemo(
    () =>
      createOnyxSlashMenuGetItems(editor, backlinkTargets, () => {
        setBacklinkPickerOpen(true);
      }),
    [editor, backlinkTargets],
  );

  const filteredBacklinkTargets = useMemo(() => {
    const q = backlinkQuery.trim().toLowerCase();
    if (!q) {
      return backlinkTargets;
    }
    return backlinkTargets.filter((t) => {
      const aliasHit = (t.aliases ?? []).some((a) => a.toLowerCase().includes(q));
      return t.label.toLowerCase().includes(q) || t.href.toLowerCase().includes(q) || aliasHit;
    });
  }, [backlinkQuery, backlinkTargets]);

  const [slashMenuFloatingOptions, setSlashMenuFloatingOptions] = useState(
    getOnyxSlashMenuFloatingOptions,
  );
  useLayoutEffect(() => {
    setSlashMenuFloatingOptions(getOnyxSlashMenuFloatingOptions());
  }, []);

  /**
   * Apply live Convex updates when another user saves the same document/goals scope.
   * Skip while this client has unsaved edits (serialized !== baseline).
   */
  useEffect(() => {
    if (!persistToBackend) {
      return;
    }
    if (serializedContent !== baselineRef.current) {
      return;
    }
    if (sameBlockDocumentJson(initialContent, serializedContent)) {
      return;
    }
    const blocks = parseBlocks(initialContent);
    const nextBlocks = (
      blocks && blocks.length > 0 ? blocks : [{ type: "paragraph" as const }]
    ) as Parameters<typeof editor.replaceBlocks>[1];
    applyingRemoteRef.current = true;
    try {
      editor.replaceBlocks(editor.document, nextBlocks);
      const after = JSON.stringify(editor.document);
      setSerializedContent(after);
      baselineRef.current = after;
    } finally {
      applyingRemoteRef.current = false;
    }
  }, [persistToBackend, initialContent, serializedContent, editor]);

  useEffect(() => {
    if (!persistToBackend) {
      return;
    }
    if (serializedContent === baselineRef.current) {
      return;
    }

    markSaving();
    const timeoutId = window.setTimeout(() => {
      const save =
        kind === "document"
          ? updateDocument({ id: documentId!, content: serializedContent })
          : updateGoalsContent({
              content: serializedContent,
              scope: goalsScope,
            });
      void save
        .then(async () => {
          baselineRef.current = serializedContent;
          setAutosaveVisible(false);
          markSaved();
          if (kind === "goals") {
            try {
              await syncCalendarFromGoalsDoc({
                goalScope: goalsScope ?? "main",
                content: serializedContent,
              });
            } catch {
              /* best-effort sync */
            }
          }
        })
        .catch(() => {
          markError();
        });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [
    documentId,
    goalsScope,
    kind,
    persistToBackend,
    markError,
    markSaved,
    markSaving,
    serializedContent,
    setAutosaveVisible,
    updateDocument,
    updateGoalsContent,
    syncCalendarFromGoalsDoc,
  ]);

  useEffect(() => {
    const shell = editorShellRef.current;
    if (!shell) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const a = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const hrefAttr = a.getAttribute("href");
      if (!hrefAttr) {
        return;
      }
      const path = sameOriginAppPath(hrefAttr);
      if (!path) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      router.push(path);
    };
    shell.addEventListener("click", onClick, true);
    return () => shell.removeEventListener("click", onClick, true);
  }, [router]);

  useEffect(() => {
    if (!backlinkPickerOpen) {
      setBacklinkQuery("");
    }
  }, [backlinkPickerOpen]);

  const editorTree = (
    <BlockNoteView
      editor={editor}
      theme="dark"
      slashMenu={false}
      sideMenu={false}
      onChange={() => {
        const next = JSON.stringify(editor.document);
        setSerializedContent(next);
        if (applyingRemoteRef.current) {
          return;
        }
        if (persistToBackend && next !== baselineRef.current) {
          resetAutosaveUiForEdit();
          setAutosaveVisible(true);
          markSaving();
        }
      }}
    >
      <SideMenuController
        floatingUIOptions={{
          useFloatingOptions: {
            placement: "right-start",
          },
          elementProps: {
            style: { zIndex: 50 },
          },
        }}
      />
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={slashMenuItems}
        floatingUIOptions={slashMenuFloatingOptions}
        suggestionMenuComponent={ScrollableSuggestionMenu}
      />
    </BlockNoteView>
  );

  return (
    <div ref={editorShellRef} className="bn-onyx-editor relative z-0 w-full min-h-0">
      {kind === "goals" && goalsScope != null ? (
        <GoalsEditorScopeProvider scope={goalsScope}>{editorTree}</GoalsEditorScopeProvider>
      ) : (
        editorTree
      )}

      {backlinkPickerOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onClick={() => setBacklinkPickerOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-lg border border-zinc-800 bg-zinc-950 p-4 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="backlink-picker-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="backlink-picker-title" className="mb-3 text-base font-semibold text-white">
              Insert backlink
            </h2>
            <div className="relative mb-3">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
                aria-hidden
              />
              <input
                autoFocus
                value={backlinkQuery}
                onChange={(e) => setBacklinkQuery(e.target.value)}
                placeholder="Search notes and pages..."
                className="w-full rounded-md border border-zinc-800 bg-black py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-zinc-600"
              />
            </div>
            <div className="max-h-80 overflow-y-auto rounded-md border border-zinc-800 bg-black/30">
              {filteredBacklinkTargets.length === 0 ? (
                <p className="px-3 py-4 text-sm text-zinc-500">No matches.</p>
              ) : (
                <ul className="divide-y divide-zinc-800">
                  {filteredBacklinkTargets.map((target) => (
                    <li key={`${target.href}-${target.label}`}>
                      <button
                        type="button"
                        className="w-full px-3 py-2.5 text-left hover:bg-zinc-900/70"
                        onClick={() => {
                          editor.createLink(target.href, target.label);
                          setBacklinkPickerOpen(false);
                        }}
                      >
                        <p className="truncate text-sm font-medium text-white">{target.label}</p>
                        <p className="truncate text-xs text-zinc-500">{target.href}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
