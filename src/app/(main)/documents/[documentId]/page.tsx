"use client";

import React from "react";
import { useQuery } from "convex/react";
import { BlockEditor } from "@/components/editor/block-editor";
import { DocumentHeader } from "@/components/editor/document-header";
import { DocumentNotFound } from "@/components/editor/document-not-found";
import { EditorSkeleton } from "@/components/editor/editor-skeleton";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

type PageProps = { params: Promise<{ documentId: string }> };

export default function DocumentPage({ params }: PageProps) {
  const [documentId, setDocumentId] = React.useState<string | null>(null);
  
  // Unwrap params
  React.useEffect(() => {
    params.then(({ documentId }) => setDocumentId(documentId));
  }, [params]);
  
  if (!documentId) {
    return <EditorSkeleton />;
  }
  
  // Type assertion for Convex ID
  const docId = documentId as Id<"documents">;
  
  return <DocumentPageContent documentId={docId} />;
}

function DocumentPageContent({ documentId }: { documentId: Id<"documents"> }) {
  const document = useQuery(api.documents.getById, { id: documentId });
  
  if (document === undefined) {
    return (
      <div className="flex min-h-full flex-col p-8">
        <EditorSkeleton />
      </div>
    );
  }
  
  if (document === null) {
    return (
      <div className="flex min-h-full flex-col p-8">
        <DocumentNotFound />
      </div>
    );
  }
  
  return (
    <div className="flex min-h-full flex-col p-8">
      <DocumentHeader documentId={documentId} />
      <BlockEditor documentId={documentId} />
    </div>
  );
}
