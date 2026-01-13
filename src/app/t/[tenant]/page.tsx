// src/app/t/[tenant]/page.tsx
import { redirect } from "next/navigation";

interface TenantPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function TenantPage({ params }: TenantPageProps) {
  const { tenant } = await params;
  redirect(`/t/${tenant}/dashboard`);
}