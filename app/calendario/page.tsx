import { Suspense } from "react";
import { Calendar } from "@/components/calendar";
export default function Page() {
  return (
    <Suspense fallback={<p>Carregando calendário…</p>}>
      <Calendar />
    </Suspense>
  );
}
