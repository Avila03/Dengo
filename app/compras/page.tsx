import { Suspense } from "react";
import { ShoppingHub } from "@/components/shopping-hub";

export default function Page() {
  return (
    <Suspense fallback={<p>Carregando compras…</p>}>
      <ShoppingHub />
    </Suspense>
  );
}
