import Link from "next/link";
import {
  ListChecks,
  Clapperboard,
  MapPin,
  Settings2,
  ArrowRight,
} from "lucide-react";
import { Shell } from "@/components/shell";
export default function Page() {
  return (
    <Shell>
      <section className="page-heading">
        <div>
          <span className="eyebrow">CADA PARTE DA NOSSA VIDA</span>
          <h1>Mais do nosso espaço.</h1>
          <p>Responsabilidades, planos e o nosso jeito de ser.</p>
        </div>
      </section>
      <div className="places-grid">
        {[
          {
            href: "/tarefas",
            title: "Responsabilidades",
            description: "Dividir os cuidados do dia a dia.",
            icon: ListChecks,
          },
          {
            href: "/filmes",
            title: "Filmes & séries",
            description: "Escolher nossa próxima sessão.",
            icon: Clapperboard,
          },
          {
            href: "/lugares",
            title: "Nossos lugares",
            description: "Guardar os próximos destinos.",
            icon: MapPin,
          },
          {
            href: "/configuracoes",
            title: "Nosso espaço",
            description: "Fotos, nomes, orçamento e dados.",
            icon: Settings2,
          },
        ].map(({ href, title, description, icon: Icon }) => (
          <Link className="panel more-card" key={href} href={href}>
            <Icon />
            <h2>{title}</h2>
            <p>{description}</p>
            <ArrowRight size={18} />
          </Link>
        ))}
      </div>
    </Shell>
  );
}
