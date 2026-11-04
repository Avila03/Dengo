import { redirect } from "next/navigation";

// Navegação anterior: os cinco destinos agora estão disponíveis diretamente.
export default function Page() {
  redirect("/");
}
