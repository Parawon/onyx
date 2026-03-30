"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Plus, Sigma, Trash2, X as XIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "@convex/_generated/api";
import { useUserRole } from "@/components/providers/role-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TableData = {
  columns: string[];
  rowNames: string[];
  rows: string[][];
  colWidths?: number[];
  rowHeights?: number[];
};
type CellKey = `${number},${number}`;
type ToolOp = "sum" | "average" | "multiply" | "divide" | null;
type Phase = "idle" | "selecting" | "selecting_b" | "placing";

function cellKey(r: number, c: number): CellKey { return `${r},${c}`; }
function parseCK(k: CellKey): [number, number] { return k.split(",").map(Number) as [number, number]; }

const DEFAULT_COL_W = 140;
const DEFAULT_ROW_H = 40;
const MIN_COL_W = 60;
const MIN_ROW_H = 28;
const ROW_NAME_W = 140;

/* ------------------------------------------------------------------ */
/*  Formula engine                                                     */
/*                                                                     */
/*  Cell values are plain strings. A formula cell starts with "=".     */
/*  Syntax:  =OP(r,c;r,c;...)        for sum / average                */
/*           =OP(r,c;r,c|r,c;r,c)    for divide / multiply            */
/*  OP: SUM, AVG, MUL, DIV                                            */
/* ------------------------------------------------------------------ */

const FORMULA_RE = /^=(\w+)\((.+)\)$/;

type ParsedFormula = {
  op: string;
  setA: CellKey[];
  setB: CellKey[];
};

function parseFormula(raw: string): ParsedFormula | null {
  const m = raw.match(FORMULA_RE);
  if (!m) return null;
  const op = m[1];
  const body = m[2];
  const parts = body.split("|");
  const toKeys = (s: string): CellKey[] =>
    s.split(";").map((p) => p.trim()).filter(Boolean).map((p) => p as CellKey);
  return { op, setA: toKeys(parts[0]), setB: parts[1] ? toKeys(parts[1]) : [] };
}

function buildFormula(op: string, setA: CellKey[], setB: CellKey[]): string {
  const a = setA.join(";");
  if (setB.length > 0) return `=${op}(${a}|${setB.join(";")})`;
  return `=${op}(${a})`;
}

function evaluateSheet(rows: string[][]): Map<CellKey, string> {
  const display = new Map<CellKey, string>();

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const raw = rows[r][c];
      if (!raw.startsWith("=")) {
        display.set(cellKey(r, c), raw);
      }
    }
  }

  const evalCell = (r: number, c: number, visited: Set<CellKey>): string => {
    const k = cellKey(r, c);
    if (display.has(k)) return display.get(k)!;
    if (visited.has(k)) return "#REF";
    visited.add(k);

    const raw = rows[r]?.[c] ?? "";
    const f = parseFormula(raw);
    if (!f) { display.set(k, raw); return raw; }

    const resolveSet = (keys: CellKey[]): number[] => {
      const nums: number[] = [];
      for (const ck of keys) {
        const [cr, cc] = parseCK(ck);
        if (cr < 0 || cr >= rows.length || cc < 0 || cc >= (rows[cr]?.length ?? 0)) continue;
        const resolved = evalCell(cr, cc, new Set(visited));
        const n = Number(resolved);
        if (Number.isFinite(n)) nums.push(n);
      }
      return nums;
    };

    const numsA = resolveSet(f.setA);
    let result: number | null = null;

    switch (f.op) {
      case "SUM":
        result = numsA.length > 0 ? numsA.reduce((a, b) => a + b, 0) : null;
        break;
      case "AVG":
        result = numsA.length > 0 ? numsA.reduce((a, b) => a + b, 0) / numsA.length : null;
        break;
      case "MUL": {
        const sumA = numsA.length > 0 ? numsA.reduce((a, b) => a + b, 0) : null;
        const numsB = resolveSet(f.setB);
        const sumB = numsB.length > 0 ? numsB.reduce((a, b) => a + b, 0) : null;
        result = sumA !== null && sumB !== null ? sumA * sumB : sumA;
        break;
      }
      case "DIV": {
        const sumA = numsA.length > 0 ? numsA.reduce((a, b) => a + b, 0) : null;
        const numsB = resolveSet(f.setB);
        const sumB = numsB.length > 0 ? numsB.reduce((a, b) => a + b, 0) : null;
        if (sumA !== null && sumB !== null && sumB !== 0) result = sumA / sumB;
        else if (sumA !== null && (sumB === null || sumB === 0)) result = null;
        break;
      }
    }

    const str = result !== null && Number.isFinite(result)
      ? String(Math.round(result * 1e6) / 1e6)
      : "#ERR";
    display.set(k, str);
    return str;
  };

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (rows[r][c].startsWith("=")) evalCell(r, c, new Set());
    }
  }

  return display;
}

function isFormula(v: string): boolean { return v.startsWith("="); }

type CellRelation = {
  formulaCell: CellKey;
  op: string;
  inputsA: Set<CellKey>;
  inputsB: Set<CellKey>;
};

/**
 * Builds a map from every cell to the formulas it participates in.
 * - For a formula (output) cell: the entry describes its own inputs.
 * - For an input cell: one entry per formula that references it.
 */
function buildRelationMap(rows: string[][]): Map<CellKey, CellRelation[]> {
  const map = new Map<CellKey, CellRelation[]>();
  const push = (k: CellKey, rel: CellRelation) => {
    const arr = map.get(k);
    if (arr) arr.push(rel); else map.set(k, [rel]);
  };

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const raw = rows[r][c];
      const f = parseFormula(raw);
      if (!f) continue;
      const k = cellKey(r, c);
      const rel: CellRelation = {
        formulaCell: k,
        op: f.op,
        inputsA: new Set(f.setA),
        inputsB: new Set(f.setB),
      };
      push(k, rel);
      for (const ck of f.setA) push(ck, rel);
      for (const ck of f.setB) push(ck, rel);
    }
  }
  return map;
}

/* ------------------------------------------------------------------ */
/*  Table helpers                                                      */
/* ------------------------------------------------------------------ */

function parseTable(raw: string): TableData {
  try {
    const parsed = JSON.parse(raw) as any;
    if (Array.isArray(parsed.columns) && Array.isArray(parsed.rows)) {
      const rowNames: string[] = Array.isArray(parsed.rowNames)
        ? parsed.rowNames
        : parsed.rows.map((_: unknown, i: number) => `Row ${i + 1}`);
      return {
        columns: parsed.columns, rowNames, rows: parsed.rows,
        colWidths: Array.isArray(parsed.colWidths) ? parsed.colWidths : undefined,
        rowHeights: Array.isArray(parsed.rowHeights) ? parsed.rowHeights : undefined,
      };
    }
  } catch { /* fallthrough */ }
  return {
    columns: Array.from({ length: 5 }, (_, i) => `Col ${i + 1}`),
    rowNames: Array.from({ length: 5 }, (_, i) => `Row ${i + 1}`),
    rows: Array.from({ length: 5 }, () => Array(5).fill("")),
  };
}

function getColW(t: TableData, ci: number): number { return t.colWidths?.[ci] ?? DEFAULT_COL_W; }
function getRowH(t: TableData, ri: number): number { return t.rowHeights?.[ri] ?? DEFAULT_ROW_H; }

function rangeBetween(a: [number, number], b: [number, number]): Set<CellKey> {
  const rMin = Math.min(a[0], b[0]); const rMax = Math.max(a[0], b[0]);
  const cMin = Math.min(a[1], b[1]); const cMax = Math.max(a[1], b[1]);
  const s = new Set<CellKey>();
  for (let r = rMin; r <= rMax; r++) for (let c = cMin; c <= cMax; c++) s.add(cellKey(r, c));
  return s;
}

const OP_LABELS: Record<Exclude<ToolOp, null>, string> = { sum: "Sum", average: "Average", multiply: "Multiply", divide: "Divide" };
const OP_CODES: Record<Exclude<ToolOp, null>, string> = { sum: "SUM", average: "AVG", multiply: "MUL", divide: "DIV" };
const needsTwoSets = (op: ToolOp) => op === "divide" || op === "multiply";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FinanceTablePage({ slug }: { slug: string }) {
  const { hasRole, isOwner } = useUserRole();
  const router = useRouter();
  const page = useQuery(api.finance.getBySlug, { slug });
  const updateTableData = useMutation(api.finance.updateTableData);
  const updateTitle = useMutation(api.finance.updateTitle);
  const removePage = useMutation(api.finance.remove);

  const [table, setTable] = useState<TableData | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingCell, setEditingCell] = useState<CellKey | null>(null);
  const [focusedCell, setFocusedCell] = useState<CellKey | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastServerData = useRef<string | null>(null);

  const [activeTool, setActiveTool] = useState<ToolOp>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [setA, setSetA] = useState<Set<CellKey>>(new Set());
  const [setB, setSetB] = useState<Set<CellKey>>(new Set());
  const [hoverCell, setHoverCell] = useState<CellKey | null>(null);
  const dragAnchor = useRef<[number, number] | null>(null);
  const isDragging = useRef(false);

  const resizingCol = useRef<{ ci: number; startX: number; startW: number } | null>(null);
  const resizingRow = useRef<{ ri: number; startY: number; startH: number } | null>(null);

  useEffect(() => {
    if (!page) return;
    const incoming = page.tableData;
    if (incoming === lastServerData.current) return;
    lastServerData.current = incoming;
    if (!saveTimer.current) setTable(parseTable(incoming));
  }, [page, page?.tableData]);

  const canEdit = page?.canEdit ?? false;
  const canDelete = page?.canDelete ?? false;

  /* ---- computed display values (reactive to table changes) ---- */
  const displayValues = useMemo(() => {
    if (!table) return new Map<CellKey, string>();
    return evaluateSheet(table.rows);
  }, [table]);

  const relationMap = useMemo(() => {
    if (!table) return new Map<CellKey, CellRelation[]>();
    return buildRelationMap(table.rows);
  }, [table]);

  /**
   * When a cell is focused (clicked without being in tool/edit mode),
   * compute highlight sets for all related cells:
   *  - "inputA" = blue (set A inputs)
   *  - "inputB" = red  (set B inputs, for MUL/DIV)
   *  - "output" = green (the formula cell)
   */
  const focusHighlights = useMemo(() => {
    const highlights = new Map<CellKey, "inputA" | "inputB" | "output">();
    if (!focusedCell || !table) return highlights;

    const rels = relationMap.get(focusedCell);
    if (!rels || rels.length === 0) return highlights;

    for (const rel of rels) {
      highlights.set(rel.formulaCell, "output");
      for (const k of rel.inputsA) highlights.set(k, "inputA");
      for (const k of rel.inputsB) highlights.set(k, "inputB");
    }

    return highlights;
  }, [focusedCell, table, relationMap]);

  /* ---- persistence ---- */
  const persistTable = useCallback((next: TableData) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const serialized = JSON.stringify(next);
      lastServerData.current = serialized;
      void updateTableData({ slug, tableData: serialized }).finally(() => { saveTimer.current = null; });
    }, 600);
  }, [slug, updateTableData]);

  const applyTable = useCallback((updater: (prev: TableData) => TableData) => {
    setTable((prev) => { if (!prev) return prev; const next = updater(prev); persistTable(next); return next; });
  }, [persistTable]);

  /* ---- resize ---- */
  const startColResize = (ci: number, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation(); if (!table) return;
    resizingCol.current = { ci, startX: e.clientX, startW: getColW(table, ci) };
    const onMove = (ev: MouseEvent) => {
      if (!resizingCol.current) return;
      const newW = Math.max(MIN_COL_W, resizingCol.current.startW + ev.clientX - resizingCol.current.startX);
      const targetCi = resizingCol.current.ci;
      setTable((prev) => prev ? { ...prev, colWidths: prev.columns.map((_, i) => i === targetCi ? newW : getColW(prev, i)) } : prev);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp);
      resizingCol.current = null;
      setTable((prev) => { if (prev) persistTable(prev); return prev; });
    };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  };

  const startRowResize = (ri: number, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation(); if (!table) return;
    resizingRow.current = { ri, startY: e.clientY, startH: getRowH(table, ri) };
    const onMove = (ev: MouseEvent) => {
      if (!resizingRow.current) return;
      const newH = Math.max(MIN_ROW_H, resizingRow.current.startH + ev.clientY - resizingRow.current.startY);
      const targetRi = resizingRow.current.ri;
      setTable((prev) => prev ? { ...prev, rowHeights: prev.rows.map((_, i) => i === targetRi ? newH : getRowH(prev, i)) } : prev);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp);
      resizingRow.current = null;
      setTable((prev) => { if (prev) persistTable(prev); return prev; });
    };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  };

  /* ---- table ops ---- */
  const updateCell = (r: number, c: number, value: string) => {
    applyTable((prev) => ({ ...prev, rows: prev.rows.map((row, ri) => ri === r ? row.map((cell, ci) => ci === c ? value : cell) : row) }));
  };
  const updateColumnHeader = (c: number, value: string) => { applyTable((prev) => ({ ...prev, columns: prev.columns.map((col, i) => i === c ? value : col) })); };
  const updateRowName = (r: number, value: string) => { applyTable((prev) => ({ ...prev, rowNames: prev.rowNames.map((n, i) => i === r ? value : n) })); };
  const addColumn = () => { applyTable((prev) => ({ ...prev, columns: [...prev.columns, `Col ${prev.columns.length + 1}`], rows: prev.rows.map((row) => [...row, ""]), colWidths: prev.colWidths ? [...prev.colWidths, DEFAULT_COL_W] : undefined })); };
  const addRow = () => { applyTable((prev) => ({ ...prev, rowNames: [...prev.rowNames, `Row ${prev.rowNames.length + 1}`], rows: [...prev.rows, Array(prev.columns.length).fill("")], rowHeights: prev.rowHeights ? [...prev.rowHeights, DEFAULT_ROW_H] : undefined })); };
  const removeColumn = (c: number) => { applyTable((prev) => prev.columns.length <= 1 ? prev : { ...prev, columns: prev.columns.filter((_, i) => i !== c), rows: prev.rows.map((row) => row.filter((_, i) => i !== c)), colWidths: prev.colWidths?.filter((_, i) => i !== c) }); };
  const removeRow = (r: number) => { applyTable((prev) => prev.rows.length <= 1 ? prev : { ...prev, rowNames: prev.rowNames.filter((_, i) => i !== r), rows: prev.rows.filter((_, i) => i !== r), rowHeights: prev.rowHeights?.filter((_, i) => i !== r) }); };

  /* ---- title ---- */
  const handleTitleSave = () => { setEditingTitle(false); if (page && titleDraft.trim().length > 0 && titleDraft.trim() !== page.title) void updateTitle({ slug, title: titleDraft.trim() }); };
  const handleDelete = () => { if (!window.confirm(`Delete "${page?.title}"? This cannot be undone.`)) return; void removePage({ slug }).then(() => router.push("/finance")); };

  /* ---- tool actions ---- */
  const resetToolState = () => { setActiveTool(null); setPhase("idle"); setSetA(new Set()); setSetB(new Set()); setHoverCell(null); setFocusedCell(null); dragAnchor.current = null; isDragging.current = false; };
  const startTool = (op: ToolOp) => { if (activeTool === op) { resetToolState(); return; } setActiveTool(op); setPhase("selecting"); setSetA(new Set()); setSetB(new Set()); setHoverCell(null); setFocusedCell(null); dragAnchor.current = null; isDragging.current = false; };
  const confirmA = () => { if (setA.size === 0) return; if (needsTwoSets(activeTool)) setPhase("selecting_b"); else setPhase("placing"); };
  const confirmB = () => { if (setB.size === 0) return; setPhase("placing"); };

  /* ---- live preview using display values ---- */
  const previewValue = useMemo(() => {
    if (!table || !activeTool) return null;
    const sumSet = (keys: Set<CellKey>) => {
      let total = 0; let count = 0;
      for (const k of keys) {
        const v = displayValues.get(k) ?? "";
        const n = Number(v);
        if (Number.isFinite(n)) { total += n; count++; }
      }
      return { total, count };
    };
    const a = sumSet(setA);
    if (a.count === 0) return null;
    switch (activeTool) {
      case "sum": return Math.round(a.total * 1e6) / 1e6;
      case "average": return Math.round((a.total / a.count) * 1e6) / 1e6;
      case "multiply": { const b = sumSet(setB); return b.count > 0 ? Math.round(a.total * b.total * 1e6) / 1e6 : Math.round(a.total * 1e6) / 1e6; }
      case "divide": { const b = sumSet(setB); return b.count > 0 && b.total !== 0 ? Math.round((a.total / b.total) * 1e6) / 1e6 : null; }
      default: return null;
    }
  }, [table, activeTool, setA, setB, displayValues]);

  const placeResult = (r: number, c: number) => {
    if (!activeTool) return;
    const opCode = OP_CODES[activeTool];
    const formula = buildFormula(opCode, [...setA], [...setB]);
    updateCell(r, c, formula);
    resetToolState();
  };

  /* ---- cell interaction ---- */
  const setActiveSet = phase === "selecting_b" ? setSetB : setSetA;

  const handleCellMouseDown = (r: number, c: number, e: React.MouseEvent) => {
    if (phase === "selecting" || phase === "selecting_b") {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        setActiveSet((prev) => { const next = new Set(prev); const k = cellKey(r, c); if (next.has(k)) next.delete(k); else next.add(k); return next; });
      } else {
        dragAnchor.current = [r, c]; isDragging.current = true;
        setActiveSet(new Set([cellKey(r, c)]));
      }
    } else if (phase === "placing") {
      e.preventDefault(); placeResult(r, c);
    }
  };

  const handleCellMouseEnter = (r: number, c: number) => {
    if ((phase === "selecting" || phase === "selecting_b") && isDragging.current && dragAnchor.current) setActiveSet(rangeBetween(dragAnchor.current, [r, c]));
    if (phase === "placing") setHoverCell(cellKey(r, c));
  };
  const handleCellMouseLeave = () => { if (phase === "placing") setHoverCell(null); };

  useEffect(() => {
    if (phase !== "selecting" && phase !== "selecting_b") return;
    const onUp = () => { isDragging.current = false; dragAnchor.current = null; };
    window.addEventListener("mouseup", onUp); return () => window.removeEventListener("mouseup", onUp);
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeTool) resetToolState();
        else if (focusedCell) setFocusedCell(null);
      }
      if (activeTool && e.key === "Enter") {
        if (phase === "selecting" && setA.size > 0) confirmA();
        else if (phase === "selecting_b" && setB.size > 0) confirmB();
      }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [activeTool, phase, setA.size, setB.size, focusedCell]);

  /* ---- render ---- */
  if (page === undefined) return <div className="mx-auto w-full max-w-[1400px] px-12 py-12"><p className="text-sm text-zinc-500">Loading…</p></div>;
  if (page === null) return <div className="mx-auto w-full max-w-[1400px] px-12 py-12"><p className="text-sm text-zinc-500">Finance page not found.</p><Link href="/finance" className="mt-4 inline-block text-sm text-sky-400 hover:underline">← Back to Finance</Link></div>;

  const toolActive = activeTool !== null;

  const statusNode = (() => {
    if (!toolActive) {
      if (focusedCell && focusHighlights.size > 0) {
        const rels = relationMap.get(focusedCell);
        if (rels && rels.length > 0) {
          const rel = rels[0];
          const opName = { SUM: "Sum", AVG: "Average", MUL: "Multiply", DIV: "Divide" }[rel.op] ?? rel.op;
          const isFocusedTheOutput = rel.formulaCell === focusedCell;
          return (
            <span className="text-zinc-400">
              <span className="mr-2 rounded bg-amber-900/40 px-1.5 py-0.5 text-xs font-semibold text-amber-300">Viewing</span>
              <strong className="text-emerald-400">{opName}</strong>
              {" — "}
              {isFocusedTheOutput
                ? <><span className="text-sky-400">{rel.inputsA.size} input{rel.inputsA.size !== 1 ? "s" : ""}</span>{rel.inputsB.size > 0 && <>{" + "}<span className="text-red-400">{rel.inputsB.size} operand{rel.inputsB.size !== 1 ? "s" : ""}</span></>}{" → "}<span className="text-emerald-400">this cell</span></>
                : <><span className="text-zinc-300">this cell</span>{" → "}<span className="text-emerald-400">output</span></>
              }
            </span>
          );
        }
      }
      return <span className="text-zinc-500">Select a tool to begin</span>;
    }
    const label = OP_LABELS[activeTool!];
    if (phase === "selecting") {
      const isTwoSet = needsTwoSets(activeTool);
      const hint = isTwoSet ? (activeTool === "divide" ? "Select dividend cells" : "Select first operand cells") : "Click or drag cells to select";
      return (<>
        <span className="text-zinc-400"><strong className="text-sky-400">{label}</strong>{" — "}{setA.size === 0 ? hint : `${setA.size} cell${setA.size > 1 ? "s" : ""} selected`}</span>
        {setA.size > 0 && previewValue !== null && <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-300">= {previewValue}</span>}
        {setA.size > 0 && <Button type="button" size="sm" onClick={confirmA} className="ml-1 h-7 text-xs">{isTwoSet ? "Next" : "Confirm"}</Button>}
      </>);
    }
    if (phase === "selecting_b") {
      const hint = activeTool === "divide" ? "Select divisor cells" : "Select second operand cells";
      return (<>
        <span className="text-zinc-400"><strong className="text-red-400">{label}</strong>{" — "}{setB.size === 0 ? hint : `${setB.size} cell${setB.size > 1 ? "s" : ""} selected`}</span>
        {setB.size > 0 && previewValue !== null && <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-300">= {previewValue}</span>}
        {setB.size > 0 && <Button type="button" size="sm" onClick={confirmB} className="ml-1 h-7 text-xs">Confirm</Button>}
      </>);
    }
    if (phase === "placing") return <span className="text-zinc-400"><strong className="text-emerald-400">{label}</strong>{" = "}<span className="font-mono text-zinc-200">{previewValue ?? "?"}</span>{" — click a cell to place the result"}</span>;
    return null;
  })();

  return (
    <div className="relative flex min-h-[calc(100vh-5rem)] flex-col">
      <div className="mx-auto w-full max-w-[1400px] flex-1 px-12 py-12 pb-28">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/finance" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-white"><ArrowLeft className="size-4" /> Finance</Link>
        </div>

        <div className="mb-8 flex items-start justify-between gap-4">
          {editingTitle && canEdit ? (
            <input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} onBlur={handleTitleSave}
              onKeyDown={(e) => { if (e.key === "Enter") handleTitleSave(); if (e.key === "Escape") setEditingTitle(false); }}
              className="bg-transparent text-[2.5rem] font-extrabold leading-tight tracking-tighter text-white outline-none" autoFocus />
          ) : (
            <h1 className={cn("text-[2.5rem] font-extrabold leading-tight tracking-tighter text-white", canEdit && "cursor-pointer")}
              onClick={() => { if (!canEdit) return; setEditingTitle(true); setTitleDraft(page.title); }}>{page.title}</h1>
          )}
          {canDelete && <Button type="button" variant="ghost" size="sm" className="mt-2 shrink-0 text-zinc-600 hover:text-red-400" onClick={handleDelete}><Trash2 className="size-4" /></Button>}
        </div>

        {table && (
          <div className="overflow-x-auto select-none" onMouseLeave={handleCellMouseLeave}>
            <table className="border-collapse" style={{ tableLayout: "fixed" }}>
              <colgroup>
                {canEdit && !toolActive && <col style={{ width: 32 }} />}
                <col style={{ width: ROW_NAME_W }} />
                {table.columns.map((_, ci) => <col key={ci} style={{ width: getColW(table, ci) }} />)}
                {canEdit && !toolActive && <col style={{ width: 40 }} />}
              </colgroup>
              <thead>
                <tr>
                  {canEdit && !toolActive && <th className="w-8" />}
                  <th className="border border-zinc-800 bg-zinc-900/40 px-3 py-2"><span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">&nbsp;</span></th>
                  {table.columns.map((col, ci) => (
                    <th key={ci} className="group/col relative border border-zinc-800 bg-zinc-900/60 px-1 py-2">
                      <div className="flex items-center">
                        {canEdit && !toolActive ? (
                          <input value={col} onChange={(e) => updateColumnHeader(ci, e.target.value)} className="min-w-0 flex-1 bg-transparent text-center text-xs font-semibold uppercase tracking-wider text-zinc-300 outline-none" />
                        ) : (
                          <span className="min-w-0 flex-1 text-center text-xs font-semibold uppercase tracking-wider text-zinc-300">{col}</span>
                        )}
                        {canEdit && !toolActive && table.columns.length > 1 && (
                          <button type="button" onClick={() => removeColumn(ci)} className="invisible inline-flex size-5 shrink-0 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-red-900 hover:text-red-400 group-hover/col:visible" title="Remove column"><span className="text-xs leading-none">×</span></button>
                        )}
                      </div>
                      {canEdit && !toolActive && <div onMouseDown={(e) => startColResize(ci, e)} className="absolute -right-[3px] top-0 z-10 h-full w-[5px] cursor-col-resize hover:bg-sky-500/40" />}
                    </th>
                  ))}
                  {canEdit && !toolActive && <th className="border border-transparent"><button type="button" onClick={addColumn} className="flex size-8 items-center justify-center rounded border border-dashed border-zinc-700 text-zinc-600 transition-colors hover:border-sky-500 hover:text-sky-400" title="Add column"><Plus className="size-4" /></button></th>}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, ri) => (
                  <tr key={ri} className="group/row" style={{ height: getRowH(table, ri) }}>
                    {canEdit && !toolActive && (
                      <td className="w-8 border border-transparent pr-1 text-center align-middle">
                        {table.rows.length > 1 && <button type="button" onClick={() => removeRow(ri)} className="invisible inline-flex size-5 items-center justify-center rounded-full bg-zinc-800 text-zinc-500 hover:bg-red-900 hover:text-red-400 group-hover/row:visible" title="Remove row"><span className="text-xs leading-none">×</span></button>}
                      </td>
                    )}
                    <td className="relative border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                      {canEdit && !toolActive ? (
                        <input value={table.rowNames[ri] ?? ""} onChange={(e) => updateRowName(ri, e.target.value)} className="w-full bg-transparent text-xs font-semibold uppercase tracking-wider text-zinc-300 outline-none" />
                      ) : (
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">{table.rowNames[ri] ?? ""}</span>
                      )}
                      {canEdit && !toolActive && <div onMouseDown={(e) => startRowResize(ri, e)} className="absolute -bottom-[3px] left-0 z-10 h-[5px] w-full cursor-row-resize hover:bg-sky-500/40" />}
                    </td>
                    {row.map((rawCell, ci) => {
                      const k = cellKey(ri, ci);
                      const inA = setA.has(k);
                      const inB = setB.has(k);
                      const isHov = hoverCell === k;
                      const cellIsFormula = isFormula(rawCell);
                      const displayVal = displayValues.get(k) ?? rawCell;
                      const isEditing = editingCell === k;
                      const focusHL = focusHighlights.get(k);
                      const isFocused = focusedCell === k;

                      let borderClass = "border-zinc-800";
                      let bgClass = "";
                      if (focusHL === "inputA") { borderClass = "border-sky-500"; bgClass = "bg-sky-500/10"; }
                      if (focusHL === "inputB") { borderClass = "border-red-500"; bgClass = "bg-red-500/10"; }
                      if (focusHL === "output") { borderClass = "border-emerald-500"; bgClass = "bg-emerald-500/10"; }
                      if (isFocused) { borderClass = "border-amber-400"; bgClass = "bg-amber-400/10"; }
                      if (inA) { borderClass = "border-sky-500"; bgClass = "bg-sky-500/15"; }
                      if (inB) { borderClass = "border-red-500"; bgClass = "bg-red-500/15"; }
                      if (isHov && phase === "selecting_b") { borderClass = "border-red-500"; bgClass = "bg-red-500/10"; }
                      if (isHov && phase === "placing") { borderClass = "border-emerald-500"; bgClass = "bg-emerald-500/10"; }

                      const handleFocusClick = () => {
                        if (toolActive || isEditing) return;
                        const hasRelations = relationMap.has(k);
                        if (hasRelations) {
                          setFocusedCell(focusedCell === k ? null : k);
                        } else {
                          setFocusedCell(null);
                        }
                      };

                      return (
                        <td key={ci}
                          className={cn("border px-3 py-2 transition-colors", borderClass, bgClass, toolActive && "cursor-crosshair")}
                          onMouseDown={(e) => { if (toolActive) handleCellMouseDown(ri, ci, e); }}
                          onMouseEnter={() => { if (toolActive) handleCellMouseEnter(ri, ci); }}
                          onMouseLeave={handleCellMouseLeave}>
                          {canEdit && !toolActive ? (
                            isEditing ? (
                              <input
                                value={rawCell}
                                onChange={(e) => updateCell(ri, ci, e.target.value)}
                                onBlur={() => setEditingCell(null)}
                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingCell(null); }}
                                className="w-full bg-transparent text-sm text-zinc-300 outline-none placeholder:text-zinc-700"
                                placeholder="—"
                                autoFocus
                              />
                            ) : (
                              <div
                                className="flex w-full cursor-text items-center"
                                onClick={(e) => {
                                  if (e.detail === 2) { setFocusedCell(null); setEditingCell(k); }
                                  else handleFocusClick();
                                }}
                              >
                                {cellIsFormula && <span className="mr-1 text-[10px] font-bold text-sky-500" title={rawCell}>ƒ</span>}
                                <span className={cn("flex-1 text-sm", cellIsFormula ? "text-sky-300" : "text-zinc-300")}>
                                  {displayVal || "—"}
                                </span>
                              </div>
                            )
                          ) : (
                            <div className="flex w-full items-center" onClick={handleFocusClick}>
                              {cellIsFormula && <span className="mr-1 text-[10px] font-bold text-sky-500" title={rawCell}>ƒ</span>}
                              <span className={cn("flex-1 text-sm", cellIsFormula ? "text-sky-300" : "text-zinc-300")}>{displayVal || "—"}</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                    {canEdit && !toolActive && <td className="border border-transparent" />}
                  </tr>
                ))}
              </tbody>
            </table>
            {canEdit && !toolActive && (
              <button type="button" onClick={addRow} className="mt-2 flex h-8 items-center justify-center rounded border border-dashed border-zinc-700 text-zinc-600 transition-colors hover:border-sky-500 hover:text-sky-400"
                style={{ width: `${ROW_NAME_W + table.columns.reduce((sum, _, ci) => sum + getColW(table, ci), 0) + 32 + 40}px`, marginLeft: "32px" }} title="Add row"><Plus className="size-4" /></button>
            )}
          </div>
        )}
      </div>

      {canEdit && (
        <div className="sticky bottom-0 z-50 border-t border-zinc-800 bg-zinc-950/95 px-8 py-3 backdrop-blur-sm">
          <div className="mx-auto flex max-w-[1400px] items-center gap-3">
            <ToolBtn icon={<Sigma className="size-4" />} label="Sum" active={activeTool === "sum"} onClick={() => startTool("sum")} />
            <ToolBtn icon={<span className="text-sm font-bold leading-none">÷</span>} label="Divide" active={activeTool === "divide"} onClick={() => startTool("divide")} />
            <ToolBtn icon={<XIcon className="size-4" />} label="Multiply" active={activeTool === "multiply"} onClick={() => startTool("multiply")} />
            <ToolBtn icon={<span className="text-sm font-semibold leading-none">x̄</span>} label="Average" active={activeTool === "average"} onClick={() => startTool("average")} />
            <div className="mx-2 h-6 w-px bg-zinc-800" />
            <div className="flex min-w-0 flex-1 items-center gap-3 text-sm">{statusNode}</div>
            {toolActive && <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-zinc-500 hover:text-white" onClick={resetToolState}>Cancel</Button>}
          </div>
        </div>
      )}
    </div>
  );
}

function ToolBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title={label}
      className={cn("inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
        active ? "bg-sky-600 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white")}>
      {icon}{label}
    </button>
  );
}
