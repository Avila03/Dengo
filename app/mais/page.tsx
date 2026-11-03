import Link from "next/link";
import {
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
          <p>Lugares, filmes e configurações do nosso espaço.</p>
        </div>
      </section>
      <div className="places-grid">
        {[
          {
            href: "/lugares",
            title: "Nossos lugares",
            description: "Endereços, vídeos e lugares que queremos visitar.",
            icon: MapPin,
          },
          {
            href: "/filmes",
            title: "Filmes e séries",
            description: "Escolher nossa próxima sessão.",
            icon: Clapperboard,
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
