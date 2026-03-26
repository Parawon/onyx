"use client";

import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";

export function CreateDocumentButton() {
  const router = useRouter();
  const createDocument = useMutation(api.documents.create);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      const docId = await createDocument({
        title: "Untitled",
      });
      router.push(`/documents/${docId}`);
    } catch (error) {
      console.error("Failed to create document:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button
      onClick={handleCreate}
      disabled={isCreating}
      size="sm"
      className="h-7 gap-1 text-xs"
    >
      <Plus className="size-3" />
      {isCreating ? "Creating..." : "New Page"}
    </Button>
  );
}