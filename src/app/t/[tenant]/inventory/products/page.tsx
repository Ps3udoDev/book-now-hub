import { redirect } from "next/navigation";

export default async function InventoryProductsAliasPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  redirect(`/t/${tenant}/inventory`);
}
