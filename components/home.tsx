"use client";
import Link from "next/link";
import {
  ArrowRight,
  ShoppingBag,
  ListChecks,
  Heart,
  Sparkles,
  CalendarDays,
  Wallet,
  Clapperboard,
  MapPin,
  Check,
} from "lucide-react";
import { Shell } from "./shell";
import { useDengo } from "./provider";
import { dayLabel, localToday, isOverdue } from "@/lib/model";
export function Home() {
  const { entries, busy, toggle } = useDengo();
  const shopping = entries.filter((e) => e.kind === "shopping" && !e.done);
  const tasks = entries
    .filter((e) => e.kind === "task" && !e.done)
    .sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
  const completed = entries.filter((e) => e.done).length;
  const today = localToday();
  return (
    <Shell>
      <section className="page-heading">
        <div>
          <span className="eyebrow">O MELHOR DA ROTINA É COMPARTILHAR</span>
          <h1>
            Um pouco de nós,
            <br />
            todos os dias<span className="rose">.</span>
          </h1>
          <p>Menos coisas para lembrar. Mais tempo para viver juntos.</p>
        </div>
        <div className="date-chip">
          <CalendarDays size={18} />
          {new Intl.DateTimeFormat("pt-BR", {
            day: "numeric",
            month: "long",
          }).format(new Date())}
        </div>
      </section>
      <section className="hero">
        <div className="hero-copy">
          <span className="pill">
            <Heart size={14} /> NOSSO CANTINHO
          </span>
          <h2>
            Cuidar da vida.
            <br />
            Cuidar da gente.
          </h2>
          <p>
            Uma lista resolvida, uma tarefa dividida.
            <br />
            Todo pequeno cuidado faz parte da nossa história.
          </p>
          <Link href="/tarefas" className="primary">
            Organizar nosso dia <ArrowRight size={17} />
          </Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="heart-one">
            <Heart fill="currentColor" strokeWidth={1} />
          </div>
          <div className="heart-two">
            <Heart fill="currentColor" strokeWidth={1} />
          </div>
          <span className="art-caption">a vida fica mais leve a dois</span>
          <Sparkles className="spark spark-one" />
          <Sparkles className="spark spark-two" />
        </div>
      </section>
      <section className="stats" aria-label="Resumo">
        <Link href="/compras" className="stat">
          <span className="stat-icon blush">
            <ShoppingBag />
          </span>
          <div>
            <strong>{shopping.length}</strong>
            <span>itens para comprar</span>
          </div>
          <ArrowRight size={18} />
        </Link>
        <Link href="/tarefas" className="stat">
          <span className="stat-icon sage">
            <ListChecks />
          </span>
          <div>
            <strong>{tasks.length}</strong>
            <span>cuidados pendentes</span>
          </div>
          <ArrowRight size={18} />
        </Link>
        <div className="stat">
          <span className="stat-icon cream">
            <Heart />
          </span>
          <div>
            <strong>{completed}</strong>
            <span>pequenos cuidados feitos</span>
          </div>
        </div>
      </section>
      <div className="two-columns">
        <section className="panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">UM PASSO DE CADA VEZ</span>
              <h2>Na nossa lista</h2>
            </div>
            <Link href="/tarefas" className="text-link">
              Ver tudo <ArrowRight size={15} />
            </Link>
          </div>
          {tasks.length ? (
            tasks.slice(0, 4).map((e) => (
              <div className="mini-row" key={e.id}>
                <button
                  className="check"
                  disabled={busy}
                  onClick={() => void toggle(e)}
                  aria-label={`Concluir ${e.title}`}
                >
                  <Check size={14} />
                </button>
                <div>
                  <strong>{e.title}</strong>
                  <span>
                    {e.assignee} ·{" "}
                    <span className={isOverdue(e, today) ? "overdue" : ""}>
                      {dayLabel(e.due)}
                    </span>
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="empty">
              <ListChecks />
              <h3>Um dia mais leve começa aqui.</h3>
              <p>Dividam as tarefas e cuidem da rotina juntos.</p>
              <Link href="/tarefas" className="text-link">
                Adicionar primeiro cuidado <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </section>
        <section className="panel shopping-preview">
          <div className="section-title">
            <div>
              <span className="eyebrow">PARA NOSSA CASA</span>
              <h2>Falta alguma coisa?</h2>
            </div>
            <ShoppingBag size={22} />
          </div>
          <p>
            Do café da manhã ao jantar especial, mantenham tudo na mesma lista.
          </p>
          {shopping.slice(0, 3).map((e) => (
            <div className="preview-item" key={e.id}>
              <span />
              {e.title}
              <small>{e.detail}</small>
            </div>
          ))}
          <Link href="/compras" className="secondary">
            {shopping.length ? "Abrir lista de compras" : "Criar nossa lista"}{" "}
            <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      <section className="coming">
        <div className="section-title">
          <div>
            <span className="eyebrow">NOSSO PRÓXIMO CAPÍTULO</span>
            <h2>Mais espaço para os nossos planos</h2>
          </div>
          <span className="tag">Em breve</span>
        </div>
        <div className="future-grid">
          {[
            {
              icon: Wallet,
              name: "Finanças",
              desc: "Contas claras, planos juntos.",
            },
            {
              icon: CalendarDays,
              name: "Calendário",
              desc: "Tempo reservado para nós.",
            },
            {
              icon: Clapperboard,
              name: "Filmes & séries",
              desc: "O próximo “só mais um”.",
            },
            {
              icon: MapPin,
              name: "Nossos lugares",
              desc: "Novas histórias pelo caminho.",
            },
          ].map(({ icon: Icon, name, desc }) => (
            <div className="future" key={name}>
              <Icon size={22} />
              <h3>{name}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
