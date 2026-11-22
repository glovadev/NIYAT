import NoticesPage from "../page";

export const dynamic = "force-dynamic";

interface SingleNoticeProps {
  params: Promise<{ id: string }>;
}

export default async function SingleNoticePage({ params }: SingleNoticeProps) {
  const { id } = await params;
  return NoticesPage({ searchParams: Promise.resolve({ id }) });
}
