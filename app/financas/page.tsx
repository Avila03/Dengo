import { Suspense } from "react";
import { Finance } from "@/components/finance";
export default function Page() {
  return (
    <Suspense fallback={<p>Carregando finanças…</p>}>
      <Finance />
    </Suspense>
  );
}
