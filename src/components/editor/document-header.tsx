"use client";

import { useMutation, useQuery } from "convex/react";
import { useState, useRef, useEffect } from "react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface DocumentHeaderProps {
  documentId: Id<"documents">;
}

export function DocumentHeader({ documentId }: DocumentHeaderProps) {
  const document = useQuery(api.documents.getById, { id: documentId });
  const updateDocument = useMutation(api.documents.update);
  
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local title when document loads
  useEffect(() => {
    if (document?.title) {
      setTitle(document.title);
    }
  }, [document?.title]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (!title.trim()) return;
    
    try {
      await updateDocument({
        id: documentId,
        title: title.trim(),
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update title:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setTitle(document?.title || "");
      setIsEditing(false);
    }
  };

  if (!document) {
    return (
      <div className="mb-8">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800"></div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full border-none bg-transparent text-3xl font-bold text-zinc-900 outline-none dark:text-zinc-50",
            "placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
          )}
          placeholder="Untitled"
        />
      ) : (
        <h1
          onClick={() => setIsEditing(true)}
          className={cn(
            "cursor-pointer text-3xl font-bold text-zinc-900 dark:text-zinc-50",
            "hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded px-1 py-0.5 -mx-1 -my-0.5 transition-colors",
            !document.title && "text-zinc-400 dark:text-zinc-600"
          )}
        >
          {document.title || "Untitled"}
        </h1>
      )}
    </div>
  );
}