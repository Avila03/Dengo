import { test } from "node:test";
import assert from "node:assert/strict";
import type { Entry } from "../lib/model.ts";
import { DEFAULT_CALENDAR_TOPICS } from "../lib/calendar-topics.ts";
import {
  monthWeeks, monthGrid, dayEntries, dayTimeLabel, nextDates, upcomingGroups,
  visibleEntries, categoryOf, calendarCategories, daysAwayLabel,
} from "../lib/calendar-view.ts";

const topics = DEFAULT_CALENDAR_TOPICS;
const ev = (id: string, due: string, data: Entry["data"] = {}, title = id, kind: Entry["kind"] = "event"): Entry => ({
  id, kind, title, detail: "", assignee: "Nós dois", due, done: false, created_at: "2026-11-01T00:00:00Z",
  data: kind === "event" ? { eventRepeat: "none", topicId: "janta", ...data } : data,
});
const trip = ev("gramado", "2026-11-21", { endDate: "2026-11-23", topicId: "viagem", time: "07:00" }, "Viagem a Gramado");
const dinner = ev("jantar", "2026-11-19", { time: "20:00", endTime: "23:00" }, "Jantar");
const plants = ev("plantas", "2026-11-19", {}, "Regar as plantas", "task");
const bill = ev("luz", "2026-11-25", { amount: 18640, payer: 0, shareFirst: 5000 }, "Conta de luz", "expense");
const all = [trip, dinner, plants, bill];

test("semanas do mês começam no domingo e só as necessárias", () => {
  const nov = monthWeeks("2026-11");
  assert.equal(nov.length, 5);
  assert.equal(nov[0][0], "2026-11-01");
  assert.equal(nov[4][6], "2026-12-05");
  assert.equal(monthWeeks("2026-02").length, 4); // fevereiro de 2026 começa num domingo
  assert.equal(monthWeeks("2026-08").length, 6);
});

test("viagem vira faixa contínua: título só no início de cada trecho", () => {
  const grid = monthGrid("2026-11", all, topics);
  const day = (iso: string) => grid.flat().find((d) => d.date === iso)!;
  const [sat] = day("2026-11-21").bars, [sun] = day("2026-11-22").bars, [mon] = day("2026-11-23").bars;
  assert.equal(sat.label, "Viagem a Gramado");
  assert.ok(sat.multi && sat.segmentStart && sat.segmentEnd, "sábado fecha a semana");
  assert.equal(sun.label, "Viagem a Gramado", "domingo reabre o trecho na nova semana");
  assert.ok(sun.segmentStart && !sun.segmentEnd);
  assert.equal(mon.label, "");
  assert.ok(!mon.segmentStart && mon.segmentEnd);
  assert.equal(sat.color, topics.find((t) => t.id === "viagem")!.color);
});

test("no máximo duas faixas por dia, com contagem do resto", () => {
  const extra = [ev("a", "2026-11-19", { time: "08:00" }), ev("b", "2026-11-19", { time: "09:00" })];
  const d = monthGrid("2026-11", [...all, ...extra], topics).flat().find((x) => x.date === "2026-11-19")!;
  assert.equal(d.bars.length, 2);
  assert.equal(d.more, 2);
  assert.equal(d.total, 4);
});

test("lista do dia: dia todo primeiro e rótulos de horário", () => {
  const list = dayEntries("2026-11-19", all);
  assert.deepEqual(list.map((e) => e.id), ["plantas", "jantar"]);
  assert.equal(dayTimeLabel(dinner, "2026-11-19"), "20:00–23:00");
  assert.equal(dayTimeLabel(plants, "2026-11-19"), "dia todo");
  assert.equal(dayTimeLabel(trip, "2026-11-22"), "dia 2/3");
});

test("próximas datas: três depois de hoje, sem concluídos", () => {
  const done = { ...ev("feito", "2026-11-20"), done: true };
  const later = ev("natal", "2026-12-20", { endDate: "2026-12-27", topicId: "viagem" });
  const next = nextDates([...all, done, later], "2026-11-19");
  assert.deepEqual(next.map((n) => n.entry.id), ["gramado", "luz", "natal"]);
  assert.deepEqual(next.map((n) => n.daysAway), [2, 6, 31]);
  assert.equal(daysAwayLabel(1), "amanhã");
  assert.equal(daysAwayLabel(6), "em 6 dias");
});

test("próximos agrupados por semana, incluindo o que já começou", () => {
  // Domingo 22/11: a viagem já começou e a conta do dia 25 cai na mesma semana.
  const groups = upcomingGroups([...all, ev("dentista", "2026-12-02"), ev("natal", "2026-12-20")], "2026-11-22");
  assert.deepEqual(groups.map((g) => g.title), ["Esta semana", "Próxima semana", "Mais adiante"]);
  assert.deepEqual(groups[0].items.map((e) => e.id), ["gramado", "luz"]);
  assert.deepEqual(groups[1].items.map((e) => e.id), ["dentista"]);
  assert.deepEqual(groups[2].items.map((e) => e.id), ["natal"]);
  // Grupos vazios não aparecem.
  assert.deepEqual(upcomingGroups(all, "2026-11-22").map((g) => g.title), ["Esta semana"]);
});

test("categorias: tópicos, Combinados e Contas, e filtro por categoria", () => {
  assert.deepEqual(calendarCategories(topics).slice(-2).map((c) => c.id), ["combinados", "contas"]);
  assert.equal(categoryOf(plants, topics).id, "combinados");
  assert.equal(categoryOf(bill, topics).id, "contas");
  assert.equal(categoryOf(ev("x", "2026-11-01", { topicId: "inexistente" }), topics).id, "outros");
  const shown = visibleEntries(all, topics, new Set(["viagem", "contas"]));
  assert.deepEqual(shown.map((e) => e.id), ["jantar", "plantas"]);
});
