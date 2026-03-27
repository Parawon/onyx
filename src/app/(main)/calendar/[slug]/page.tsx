import { CalendarSubPage } from "@/components/calendar/calendar-sub-page";

type PageProps = { params: Promise<{ slug: string }> };

export default async function CalendarDynamicSubPage({ params }: PageProps) {
  const { slug } = await params;
  return <CalendarSubPage slug={slug} />;
}
