import type { Details, Entry } from "./model.ts";

export type EventFormValues = {
  title: string;
  due: string;
  time: string;
  endDate: string;
  topicId: string;
  assignee: string;
  placeId: string;
  location: string;
  detail: string;
  repeat: NonNullable<Details["eventRepeat"]>;
  counter: NonNullable<Details["eventCounter"]>;
};

export const EVENT_REPEAT_LABELS = {
  none: "Não repetir", weekly: "Toda semana", monthly: "Todo mês", yearly: "Todo ano",
};
export function eventFormValues(entry: Entry): EventFormValues {
  return {
    title: entry.title, due: entry.due, time: entry.data?.time || "",
    endDate: entry.data?.endDate || "", topicId: entry.data?.topicId || "outros",
    assignee: entry.assignee, detail: entry.detail,
    placeId: entry.data?.placeId || (entry.data?.sourceKind === "place" ? entry.data.sourceId || "" : ""),
    location: entry.data?.location || "",
    repeat: entry.data?.eventRepeat || "none", counter: entry.data?.eventCounter || "off",
  };
}

/** Shared by creation and editing. Existing movie sources survive a place selection. */
export function eventDataFromForm(values: EventFormValues, entries: Entry[], base?: Details): Details {
  const place = entries.find((e) => e.kind === "place" && e.id === values.placeId);
  return {
    ...base,
    ...(base?.sourceKind === "place" ? {
      sourceId: values.placeId, sourceKind: values.placeId ? "place" : undefined,
    } : {}),
    time: values.time, endTime: "", endDate: values.endDate,
    topicId: values.topicId, placeId: values.placeId,
    location: place ? [place.title, place.data?.address].filter(Boolean).join(" · ").slice(0, 240) : values.location,
    eventRepeat: values.repeat,
    eventCounter: values.repeat === "none" ? "off" : values.counter,
  };
}
