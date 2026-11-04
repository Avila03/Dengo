import { DEFAULT_CALENDAR_TOPICS, type CalendarTopic } from "./calendar-topics.ts";
export type Kind =
  "shopping" | "task" | "expense" | "transfer" | "event" | "movie" | "place";
export type EventOccurrenceChanges = {
  canceled?: boolean;
  title?: string;
  detail?: string;
  assignee?: string;
  due?: string;
  endDate?: string;
  time?: string;
  endTime?: string;
  location?: string;
  topicId?: string;
  sourceId?: string;
  sourceKind?: Kind;
};
export type Details = {
  amount?: number;
  /** Modelos de pagamentos recorrentes/parcelados; não contam como gasto pago. */
  paymentPlanType?: "subscription" | "installment" | "bill";
  planStatus?: "active" | "paused" | "canceled";
  planFrequency?: "monthly" | "yearly";
  planCount?: number;
  planReminderDays?: 0 | 1 | 3 | 7;
  /** Despesa gerada para um vencimento específico do plano. */
  paymentPlanId?: string;
  paymentCycle?: number;
  paymentPlanVirtual?: boolean;
  paymentMethod?: "pix" | "credit" | "debit" | "boleto" | "cash" | "transfer" | "other";
  paymentPaidAt?: string;
  payer?: 0 | 1;
  shareFirst?: number;
  category?: string;
  repeatAnchor?: number;
  recurrence?: "none" | "daily" | "weekly" | "monthly";
  alternate?: boolean;
  time?: string;
  endTime?: string;
  endDate?: string;
  location?: string;
  eventRepeatUntil?: string;
  eventOccurrenceDate?: string;
  eventOverrides?: Record<string, EventOccurrenceChanges>;
  /** Preparativos do evento ou de uma ocorrência: ID ou ID::YYYY-MM-DD. */
  eventInstanceKey?: string;
  topicId?: string;
  /** Datas especiais: independentes de tarefas recorrentes. */
  eventRepeat?: "none" | "monthly" | "yearly";
  /** Forma de mostrar o tempo transcorrido entre a data inicial e cada ocorrência. */
  eventCounter?: "elapsed" | "together" | "age" | "off";
  /** Data verdadeira da primeira ocorrência; preenchida nas projeções virtuais. */
  eventAnchorDate?: string;
  /** Identificador da série original de um evento projetado. */
  eventSourceId?: string;
  sourceId?: string;
  sourceKind?: Kind;
  mediaType?: "movie" | "tv";
  watchStatus?: "not_started" | "watching" | "watched";
  mediaFeedback?: string;
  currentSeason?: number;
  currentEpisode?: number;
  tmdbId?: number;
  poster?: string;
  overview?: string;
  year?: string;
  ratingFirst?: number;
  ratingSecond?: number;
  interestFirst?: boolean;
  interestSecond?: boolean;
  address?: string;
  googlePlaceId?: string;
  osmPlaceId?: string;
  latitude?: number;
  longitude?: number;
  budget?: number;
  url?: string;
  review?: string;
  placeCollection?: string;
  favorite?: boolean;
  visitedAt?: string;
};
export type Entry = {
  id: string;
  space_id?: string;
  kind: Kind;
  title: string;
  detail: string;
  assignee: string;
  due: string;
  done: boolean;
  created_at: string;
  data?: Details;
  occurrence_from?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_by_slot?: 0 | 1 | null;
  updated_by_slot?: 0 | 1 | null;
  updated_at?: string | null;
};
export type Draft = Omit<
  Entry,
  | "id"
  | "created_at"
  | "space_id"
  | "occurrence_from"
  | "created_by"
  | "updated_by"
  | "created_by_slot"
  | "updated_by_slot"
  | "updated_at"
>;
export type Preferences = {
  title: string;
  names: [string, string];
  since: string;
  photo: string;
  budgets: Record<string, number>;
  calendarTopics?: CalendarTopic[];
};
export const DEFAULT_PREFS: Preferences = {
  title: "Nosso cantinho",
  names: ["Eu", "Meu amor"],
  since: "",
  photo: "",
  budgets: {},
  calendarTopics: DEFAULT_CALENDAR_TOPICS,
};
export const STORAGE_KEY = "dengo.demo.v1";
export const PREFS_KEY = "dengo.preferences.v1";
const kinds: Kind[] = [
  "shopping",
  "task",
  "expense",
  "transfer",
  "event",
  "movie",
  "place",
];
export function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === value;
}
export function isEntry(value: unknown): value is Entry {
  if (!value || typeof value !== "object") return false;
  const e = value as Entry;
  return (
    typeof e.id === "string" &&
    kinds.includes(e.kind) &&
    typeof e.title === "string" &&
    typeof e.detail === "string" &&
    typeof e.assignee === "string" &&
    typeof e.due === "string" &&
    (e.due === "" || isDate(e.due)) &&
    typeof e.done === "boolean" &&
    typeof e.created_at === "string" &&
    (!e.data || typeof e.data === "object")
  );
}
export function readEntries(raw: string | null): Entry[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(isEntry))
    throw new Error(
      "Dados locais inválidos. Exporte ou verifique o armazenamento antes de continuar.",
    );
  return parsed;
}
export function dayLabel(date: string) {
  return isDate(date)
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "numeric",
        month: "short",
      }).format(new Date(`${date}T12:00:00`))
    : "Sem prazo";
}
export function isOverdue(entry: Entry, today: string) {
  return !entry.done && !!entry.due && entry.due < today;
}
export function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function addMonths(date: string, months: number, desiredDay?: number) {
  const [y, m, d] = date.split("-").map(Number);
  const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + months, Math.min(desiredDay ?? d, last)))
    .toISOString()
    .slice(0, 10);
}
export function nextDate(date: string, repeat: Details["recurrence"]) {
  if (!isDate(date) || !repeat || repeat === "none") return "";
  if (repeat === "monthly") return addMonths(date, 1);
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + (repeat === "weekly" ? 7 : 1));
  return d.toISOString().slice(0, 10);
}
export function successor(entry: Entry, names: string[]): Draft | null {
  const anchor = entry.data?.repeatAnchor || Number(entry.due.slice(-2));
  const due =
    entry.data?.recurrence === "monthly" && isDate(entry.due)
      ? addMonths(entry.due, 1, anchor)
      : nextDate(entry.due, entry.data?.recurrence);
  if (!due || !["task", "expense"].includes(entry.kind)) return null;
  return {
    kind: entry.kind,
    title: entry.title,
    detail: entry.detail,
    assignee: entry.data?.alternate
      ? entry.assignee === names[0]
        ? names[1]
        : names[0]
      : entry.assignee,
    due,
    done: false,
    data: { ...entry.data, sourceId: undefined, repeatAnchor: anchor },
  };
}
export function validateDraft(d: Draft) {
  if (!d.title.trim() || d.title.length > 120)
    throw new Error("Informe um título com até 120 caracteres.");
  if (d.detail.length > 240)
    throw new Error("A observação deve ter até 240 caracteres.");
  if (d.due && !isDate(d.due)) throw new Error("Informe uma data válida.");
  if (d.kind === "event" && d.data?.eventRepeat &&
      !["none", "monthly", "yearly"].includes(d.data.eventRepeat))
    throw new Error("Selecione uma repetição válida para o calendário.");
  if (d.kind === "event") {
    const details = d.data;
    if (details?.endDate && !isDate(details.endDate))
      throw new Error("Data final inválida.");
    if (details?.endDate && details.endDate < d.due)
      throw new Error("O término não pode ser anterior ao início.");
    const start = details?.time || "";
    const end = details?.endTime || "";
    if (start && !/^([01]\d|2[0-3]):[0-5]\d$/.test(start))
      throw new Error("Horário inicial inválido.");
    if (end && !/^([01]\d|2[0-3]):[0-5]\d$/.test(end))
      throw new Error("Horário final inválido.");
    if (end && !start) throw new Error("Informe o horário inicial para definir o término.");
    if (start && end && (!details?.endDate || details.endDate === d.due) && end <= start)
      throw new Error("O término deve ser depois do horário inicial.");
    if (details?.endDate) {
      const duration = Math.round((Date.parse(details.endDate + "T12:00:00Z") - Date.parse(d.due + "T12:00:00Z")) / 86400000);
      if (duration > 60) throw new Error("Eventos podem durar até 61 dias.");
    }
    if (details?.eventRepeatUntil && !isDate(details.eventRepeatUntil))
      throw new Error("Data limite da recorrência inválida.");
    if (details?.eventOverrides) {
      if (Object.keys(details.eventOverrides).length > 300)
        throw new Error("Esta série excedeu o limite de exceções.");
      for (const [scheduledDate, change] of Object.entries(details.eventOverrides)) {
        if (!isDate(scheduledDate)) throw new Error("Ocorrência inválida.");
        if (change.due && !isDate(change.due)) throw new Error("Data de remarcação inválida.");
        if (change.endDate && !isDate(change.endDate)) throw new Error("Data final da exceção inválida.");
      }
    }
  }
  if (d.kind === "event" && d.data?.eventCounter &&
      !["elapsed", "together", "age", "off"].includes(d.data.eventCounter))
    throw new Error("Selecione uma contagem válida para a data especial.");
  if (d.kind === "event" && d.data?.eventRepeat &&
      d.data.eventRepeat !== "none" && !d.due)
    throw new Error("Um evento recorrente precisa de uma data inicial.");
  if (d.data?.recurrence && d.data.recurrence !== "none" && !d.due)
    throw new Error("Uma repetição precisa de data inicial.");
  if (d.kind === "movie") {
    if (d.data?.mediaFeedback !== undefined &&
        (typeof d.data.mediaFeedback !== "string" || d.data.mediaFeedback.length > 800))
      throw new Error("O feedback deve ter até 800 caracteres.");
    if (d.data?.watchStatus && !["not_started", "watching", "watched"].includes(d.data.watchStatus))
      throw new Error("Escolha um status de acompanhamento válido.");
    for (const [field, number] of [
      ["temporada", d.data?.currentSeason],
      ["episódio", d.data?.currentEpisode],
    ] as const) {
      if (number !== undefined && (!Number.isInteger(number) || number < 1 || number > 999))
        throw new Error("Informe um número válido para " + field + " (1 a 999).");
    }
    if (d.data?.mediaType === "movie" &&
        (d.data?.currentSeason !== undefined || d.data?.currentEpisode !== undefined))
      throw new Error("Acompanhamento por temporada e episódio é exclusivo de séries.");
  }
  if (["expense", "transfer"].includes(d.kind)) {
    if (d.data?.paymentPlanType) {
      const plan = d.data;
      if (d.kind !== "expense" ||
          !["subscription", "installment", "bill"].includes(plan.paymentPlanType))
        throw new Error("Tipo de pagamento recorrente inválido.");
      if (!d.due) throw new Error("Defina a data do primeiro vencimento.");
      if (!["active", "paused", "canceled"].includes(plan.planStatus || "active"))
        throw new Error("Situação do pagamento inválida.");
      if (!["monthly", "yearly"].includes(plan.planFrequency || "monthly"))
        throw new Error("Frequência inválida.");
      if (plan.paymentPlanType !== "subscription" && plan.planFrequency === "yearly")
        throw new Error("Contas fixas e parcelas são mensais.");
      if (plan.paymentPlanType === "installment" &&
          (!Number.isInteger(plan.planCount) || plan.planCount! < 2 || plan.planCount! > 240))
        throw new Error("Parcelamentos devem ter entre 2 e 240 parcelas.");
      if (plan.planReminderDays !== undefined &&
          ![0, 1, 3, 7].includes(plan.planReminderDays))
        throw new Error("Prazo do lembrete inválido.");
      if (d.done || plan.paymentPlanId)
        throw new Error("O cadastro da cobrança não é um pagamento.");
    }
    if (d.data?.paymentPlanId) {
      if (d.kind !== "expense" || !Number.isInteger(d.data.paymentCycle) ||
          d.data.paymentCycle! < 0)
        throw new Error("Referência inválida ao vencimento.");
    }
    if (d.data?.paymentMethod && !["pix","credit","debit","boleto","cash","transfer","other"].includes(d.data.paymentMethod))
      throw new Error("Forma de pagamento inválida.");
    if (d.data?.paymentPaidAt && !isDate(d.data.paymentPaidAt))
      throw new Error("Data de pagamento inválida.");

    if (
      !Number.isSafeInteger(d.data?.amount) ||
      (d.data!.amount! <= 0 && d.data?.paymentPlanType !== "bill") ||
      d.data!.amount! > 100000000
    )
      throw new Error("Informe um valor entre R$ 0,01 e R$ 1.000.000,00.");
    if (d.data?.payer !== 0 && d.data?.payer !== 1)
      throw new Error("Selecione quem pagou.");
    if (
      d.kind === "expense" &&
      (!Number.isInteger(d.data?.shareFirst) ||
        d.data!.shareFirst! < 0 ||
        d.data!.shareFirst! > 10000)
    )
      throw new Error("A divisão deve estar entre 0 e 100%.");
  }
}
