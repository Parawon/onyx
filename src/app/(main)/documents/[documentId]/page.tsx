import { BlockEditor } from "@/components/editor/block-editor";

type PageProps = { params: Promise<{ documentId: string }> };

export default async function DocumentPage({ params }: PageProps) {
  const { documentId } = await params;
  return <BlockEditor documentId={documentId} />;
}
