import { redirect } from "next/navigation";

export default async function TenantEcommercePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  redirect(`/t/${tenant}/settings/ecommerce`);
}
