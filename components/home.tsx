"use client";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Clock3, Heart, ListChecks, ShoppingBag } from "lucide-react";
import { Shell } from "./shell";
import { useDengo } from "./provider";
import { localToday } from "@/lib/model";
import { todayEntries } from "@/lib/today";
import { money } from "@/lib/finance";
import type { Entry } from "@/lib/model";

const labels: Record<string, string> = {
  event: "Calendário",
  task: "Compromisso",
  expense: "Conta em Compras",
};

function itemDestination(entry: Entry) {
  return entry.kind === "event" ? "/calendario" :
    entry.kind === "expense" ? "/compras?aba=gastos" : "/compromissos";
}

export function Home() {
  const { entries, busy, toggle, preferences } = useDengo();
  const today = localToday();
  const todayList = todayEntries(entries, today);
  const pending = todayList.filter((item) => !item.done);
  const completed = todayList.length - pending.length;
  const dateText = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  }).format(new Date(today + "T12:00:00"));
  return (
    <Shell>
      <section className="today-heading">
        <div>
          <span className="eyebrow">UM DIA DE CADA VEZ, JUNTOS</span>
          <h1>Nosso dia<span className="rose">.</span></h1>
          <p>O que vocês marcaram para hoje, tudo organizado em um só lugar.</p>
        </div>
        <span className="today-date"><CalendarDays size={18} /> {dateText}</span>
      </section>
      <div className="couple-greeting">
        <Heart size={16} />
        <span>{preferences.names.join(" & ")} · nosso cotidiano, do nosso jeito</span>
      </div>
      <section className="today-summary" aria-label="Resumo de hoje">
        <div><CalendarDays size={21} /><strong>{todayList.length}</strong><span>marcados para hoje</span></div>
        <div><Clock3 size={21} /><strong>{pending.length}</strong><span>pendentes hoje</span></div>
        <div><Check size={21} /><strong>{completed}</strong><span>concluídos hoje</span></div>
      </section>
      <section className="panel today-panel">
        <div className="section-title">
          <div>
            <span className="eyebrow">TUDO QUE ESTÁ MARCADO PARA HOJE</span>
            <h2>Agenda de hoje</h2>
          </div>
          <Link href="/calendario" className="text-link">
            Abrir calendário <ArrowRight size={15} />
          </Link>
        </div>
        {todayList.length ? (
          <div className="today-agenda">
            {todayList.map((item) => (
              <article key={item.id} className={"today-item" + (item.done ? " is-done" : "")}>
                <div className="today-item-time">
                  {item.data?.time || "Dia inteiro"}
                </div>
                <div className="today-item-content">
                  <span className="tag">{labels[item.kind]}{item.done ? " · Concluído" : ""}</span>
                  <h3>{item.title}</h3>
                  <p>{item.assignee}{item.data?.location ? " · " + item.data.location : ""}</p>
                  {item.detail ? <p>{item.detail}</p> : null}
                  {item.kind === "expense" && item.data?.amount ? (
                    <strong className="today-item-value">{money(item.data.amount)} · {item.done ? "Pago" : "A pagar"}</strong>
                  ) : null}
                  <div className="today-item-actions">
                    <Link href={itemDestination(item)} className="text-link">Abrir registro <ArrowRight size={14} /></Link>
                    {(item.kind === "task" || item.kind === "expense") && !item.done ? (
                      <button type="button" className="secondary" disabled={busy}
                        onClick={() => void toggle(item)}>
                        <Check size={15} /> {item.kind === "expense" ? "Marcar como pago" : "Concluir tarefa"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="today-empty">
            <Heart size={30} />
            <h3>Hoje está livre por aqui!</h3>
            <p>Quando vocês marcarem um compromisso, tarefa com data ou conta para hoje, ela aparecerá aqui.</p>
            <Link href="/calendario" className="primary">Adicionar ao calendário <ArrowRight size={16} /></Link>
          </div>
        )}
      </section>
      <section className="today-shortcuts">
        <Link href="/calendario" className="panel today-shortcut">
          <CalendarDays size={22} /><strong>Calendário</strong><span>Marcar datas e encontros</span><ArrowRight size={17} />
        </Link>
        <Link href="/compromissos" className="panel today-shortcut">
          <ListChecks size={22} /><strong>Compromissos</strong><span>Organizar tarefas e responsáveis</span><ArrowRight size={17} />
        </Link>
        <Link href="/compras" className="panel today-shortcut">
          <ShoppingBag size={22} /><strong>Compras</strong><span>Itens e gastos em um só lugar</span><ArrowRight size={17} />
        </Link>
      </section>
    </Shell>
  );
}
