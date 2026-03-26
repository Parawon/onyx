"use client";

import React from "react";
import { useMutation, useQuery } from "convex/react";
import { useState, useCallback } from "react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

interface SimpleEditorProps {
  documentId: Id<"documents">;
}

export function SimpleEditor({ documentId }: SimpleEditorProps) {
  const document = useQuery(api.documents.getById, { id: documentId });
  const updateDocument = useMutation(api.documents.update);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Update local content when document loads
  React.useEffect(() => {
    if (document?.content && document.content !== "[]") {
      try {
        const parsed = JSON.parse(document.content);
        if (Array.isArray(parsed) && parsed[0]?.content?.[0]?.text) {
          setContent(parsed[0].content[0].text);
        }
      } catch {
        setContent(document.content);
      }
    }
  }, [document?.content]);

  // Debounced save
  const debouncedSave = useCallback(
    debounce(async (text: string) => {
      setIsSaving(true);
      try {
        const blockContent = JSON.stringify([
          {
            type: "paragraph",
            content: [{ type: "text", text }]
          }
        ]);
        await updateDocument({
          id: documentId,
          content: blockContent,
        });
      } catch (error) {
        console.error("Failed to save:", error);
      } finally {
        setIsSaving(false);
      }
    }, 1000),
    [documentId, updateDocument]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    debouncedSave(newContent);
  };

  if (document === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm text-zinc-500">Loading document...</div>
      </div>
    );
  }

  if (document === null) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm text-zinc-500">Document not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-[400px] w-full">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs text-zinc-500">
          {isSaving ? "Saving..." : "Saved"}
        </div>
      </div>
      <textarea
        value={content}
        onChange={handleChange}
        className="w-full h-96 resize-none border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-transparent text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Start writing..."
      />
    </div>
  );
}

// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}