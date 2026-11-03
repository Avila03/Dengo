"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  House,
  ShoppingBag,
  ListChecks,
  Settings2,
  ArrowUpRight,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { useDengo } from "./provider";
const links = [
  { href: "/", label: "Nosso dia", icon: House },
  { href: "/compras", label: "Compras", icon: ShoppingBag },
  { href: "/tarefas", label: "Responsabilidades", icon: ListChecks },
  { href: "/configuracoes", label: "Nosso espaço", icon: Settings2 },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { demo, error, refresh, signOut } = useDengo();
  return (
    <div className="app">
      <a className="skip" href="#conteudo">
        Pular para o conteúdo
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand">
          <Heart fill="currentColor" />
          dengo<span>um lugar para nós</span>
        </Link>
        <div className="nav-label">NOSSO COTIDIANO</div>
        <nav aria-label="Navegação principal">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={path === href ? "active" : ""}
              aria-current={path === href ? "page" : undefined}
            >
              <Icon size={21} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <Heart size={22} />
          <p>
            As pequenas coisas
            <br />
            também são amor.
          </p>
          <span>Um dia de cada vez, juntos.</span>
        </div>
        <div className="couple">
          <div className="avatar">D</div>
          <div>
            <strong>Nosso cantinho</strong>
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
          <span className="desktop-only">FEITO DE PEQUENOS MOMENTOS</span>
          <Link href="/" className="mobile-brand">
            dengo
            <Heart size={18} fill="currentColor" />
          </Link>
          <div className="topbar-right">
            <span className="status-dot" />
            {demo ? "Demonstração" : "Só vocês dois"}
            <button
              className="icon-btn"
              onClick={refresh}
              aria-label="Atualizar dados"
            >
              <RefreshCw size={17} />
            </button>
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
        <main id="conteudo" tabIndex={-1}>
          {error ? (
            <div role="alert" className="error">
              {error} <button onClick={refresh}>Tentar novamente</button>
            </div>
          ) : null}
          {children}
          <footer>
            Com carinho, para a vida que vocês constroem. <Heart size={13} />
          </footer>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegação no celular">
        {links.map(({ href, label, icon: Icon }, i) => (
          <Link
            href={href}
            key={href}
            className={path === href ? "active" : ""}
            aria-current={path === href ? "page" : undefined}
          >
            <Icon size={22} />
            <span>{i === 2 ? "Tarefas" : i === 3 ? "Espaço" : label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
