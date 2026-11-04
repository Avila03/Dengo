/** Personal delivery preferences; never used to authorize access to couple records. */
export const NOTIFICATION_TYPES = [
  "upcomingEvent", "eventChanges", "newResponsibility", "paymentDue",
  "overdue", "partnerCompletion", "newPlan", "dailyDigest",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationPreferences = {
  version: 1;
  enabled: Record<NotificationType, boolean>;
  eventMinutesBefore: 15 | 30 | 60 | 120 | 1440;
  paymentDaysBefore: 1 | 3 | 7;
  paymentOnDueDay: boolean;
  paymentAudience: "mine" | "couple";
  dailyTime: string;
  quietHours: { enabled: boolean; start: string; end: string };
  hidePreview: boolean;
  timeZone: "America/Sao_Paulo";
};

export const NOTIFICATION_METADATA_KEY = "dengo_notifications_v1";
export function notificationStorageKey(userId: string) {
  return "dengo:notifications:v1:" + userId;
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}
const isTime = (value: unknown): value is string =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

/** Reject malformed fields individually and omit unselected/unknown notification types. */
export function parseNotificationPreferences(input: unknown): NotificationPreferences {
  const value = record(input);
  const enabled = record(value.enabled);
  const quiet = record(value.quietHours);
  return {
    version: 1,
    enabled: Object.fromEntries(NOTIFICATION_TYPES.map((key) =>
      [key, typeof enabled[key] === "boolean" ? enabled[key] : true])) as Record<NotificationType, boolean>,
    eventMinutesBefore: [15, 30, 60, 120, 1440].includes(Number(value.eventMinutesBefore))
      ? Number(value.eventMinutesBefore) as NotificationPreferences["eventMinutesBefore"] : 30,
    paymentDaysBefore: [1, 3, 7].includes(Number(value.paymentDaysBefore))
      ? Number(value.paymentDaysBefore) as NotificationPreferences["paymentDaysBefore"] : 1,
    paymentOnDueDay: typeof value.paymentOnDueDay === "boolean" ? value.paymentOnDueDay : true,
    paymentAudience: value.paymentAudience === "couple" ? "couple" : "mine",
    dailyTime: isTime(value.dailyTime) ? value.dailyTime : "09:00",
    quietHours: {
      enabled: typeof quiet.enabled === "boolean" ? quiet.enabled : true,
      start: isTime(quiet.start) ? quiet.start : "22:00",
      end: isTime(quiet.end) ? quiet.end : "08:00",
    },
    hidePreview: typeof value.hidePreview === "boolean" ? value.hidePreview : true,
    timeZone: "America/Sao_Paulo",
  };
}

export function validateNotificationPreferences(value: NotificationPreferences) {
  if (value.enabled.dailyDigest && !isTime(value.dailyTime))
    throw new Error("Escolha um horário válido para o resumo do dia.");
  if (value.quietHours.enabled &&
      (!isTime(value.quietHours.start) || !isTime(value.quietHours.end) ||
       value.quietHours.start === value.quietHours.end))
    throw new Error("Escolha horários diferentes para o início e o fim do silêncio.");
}
