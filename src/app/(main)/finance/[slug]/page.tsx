import { FinanceTablePage } from "@/components/finance/finance-table-page";

type PageProps = { params: Promise<{ slug: string }> };

export default async function FinanceDynamicPage({ params }: PageProps) {
  const { slug } = await params;
  return <FinanceTablePage slug={slug} />;
}
