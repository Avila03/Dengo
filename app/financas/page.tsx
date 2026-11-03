import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ compra?: string | string[] }>;
}) {
  const { compra } = await searchParams;
  const params = new URLSearchParams({ aba: "gastos" });
  if (typeof compra === "string" && /^[0-9a-fA-F-]{8,64}$/.test(compra)) {
    params.set("compra", compra);
  }
  redirect("/compras?" + params.toString());
}
