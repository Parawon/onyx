"use client";

import { createContext, useContext } from "react";

const GoalsEditorScopeContext = createContext<string | null>(null);

export function GoalsEditorScopeProvider({
  scope,
  children,
}: {
  scope: string;
  children: React.ReactNode;
}) {
  return (
    <GoalsEditorScopeContext.Provider value={scope}>{children}</GoalsEditorScopeContext.Provider>
  );
}

/** `null` when the editor is not a Goals workspace (e.g. documents). */
export function useGoalsEditorScope(): string | null {
  return useContext(GoalsEditorScopeContext);
}
