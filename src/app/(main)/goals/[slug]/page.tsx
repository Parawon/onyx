import { GoalsSubPage } from "@/components/goals/goals-sub-page";

type PageProps = { params: Promise<{ slug: string }> };

export default async function GoalsDynamicSubPage({ params }: PageProps) {
  const { slug } = await params;
  return <GoalsSubPage slug={slug} />;
}
