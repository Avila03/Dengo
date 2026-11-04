"use client";
import { Brand } from "./brand";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  House,
  Wallet,
  ListChecks,
  Settings,
  ArrowUpRight,
  RefreshCw,
  LogOut,
  Clapperboard,
  MapPin,
} from "lucide-react";
import { useDengo } from "./provider";
const links = [
  { href: "/", label: "Nosso dia", icon: House },
  { href: "/compromissos", label: "Responsabilidades", icon: ListChecks },
  { href: "/compras", label: "Financeiro", icon: Wallet },
  { href: "/lugares", label: "Nossos lugares", icon: MapPin },
  { href: "/filmes", label: "Filmes e séries", icon: Clapperboard },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { demo, error, refresh, signOut, preferences } = useDengo();
  const mobileLinks = links.map((link) => ({
    ...link,
    label: link.href === "/lugares" ? "Lugares" :
      link.href === "/filmes" ? "Filmes" :
      link.href === "/compromissos" ? "Responsa\u00adbilidades" : link.label,
  }));
  const mobileActive = (href: string) =>
    href === "/" ? path === "/" || path === "/calendario" : path === href;
  return (
    <div className="app">
      <a className="skip" href="#conteudo">
        Pular para o conteúdo
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand-link" aria-label="Dengo — Nosso dia"><Brand tagline /></Link>
        <div className="nav-label">NOSSO COTIDIANO</div>
        <nav aria-label="Navegação principal">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={path === href || (href === "/" && path === "/calendario") ? "active" : ""}
              aria-current={path === href || (href === "/" && path === "/calendario") ? "page" : undefined}
            >
              <Icon size={21} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="couple">
          <div className="avatar">
            {preferences.photo ? (
              <img
                src={preferences.photo}
                alt="Foto do casal"
                width={36}
                height={36}
              />
            ) : (
              "D"
            )}
          </div>
          <div>
            <Link className="couple-name" href="/configuracoes#casal">
              Configurações do casal
            </Link>
            <small>{demo ? "Prévia local" : "Espaço privado"}</small>
          </div>
          {!demo ? (
            <button className="icon-btn" onClick={signOut} aria-label="Sair">
              <LogOut size={18} />
            </button>
          ) : (
            <Heart size={17} />
          )}
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">

          <Link href="/" className="brand-link mobile-brand-link" aria-label="Dengo — Nosso dia"><Brand compact /></Link>
          <Link href="/configuracoes#casal" className="lobby-title" title={preferences.title}>
            {preferences.title}
          </Link>
          <div className="topbar-right">
            <button
              className="icon-btn topbar-refresh"
              onClick={refresh}
              aria-label="Atualizar dados"
              title="Atualizar dados"
            >
              <RefreshCw size={17} />
            </button>
            <Link
              href="/configuracoes"
              className={"icon-btn settings-shortcut" + (path === "/configuracoes" ? " active" : "")}
              aria-label="Configurações do casal"
              aria-current={path === "/configuracoes" ? "page" : undefined}
              title="Configurações"
            >
              <Settings size={20} />
            </Link>
          </div>
        </header>
        {demo ? (
          <div className="demo-banner">
            Prévia local · O que você salvar fica apenas neste navegador.{" "}
            <Link href="/configuracoes">
              Entenda <ArrowUpRight size={13} />
            </Link>
          </div>
        ) : null}
        <main id="conteudo" className="clean-main" tabIndex={-1}>
          {error ? (
            <div role="alert" className="error">
              {error} <button onClick={refresh}>Tentar novamente</button>
            </div>
          ) : null}
          {children}

        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegação no celular">
        {mobileLinks.map(({ href, label, icon: Icon }) => (
          <Link
            href={href}
            key={href}
            className={mobileActive(href) ? "active" : ""}
            aria-current={mobileActive(href) ? "page" : undefined}
            aria-label={href === "/compromissos" ? "Responsabilidades" : label}
          >
            <Icon size={22} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
