import type { Entry } from "@/lib/model";
import { calendarEntryColor, type CalendarTopic } from "@/lib/calendar-topics";

/** Cada registro do dia contribui com seu próprio indicador, sem limite arbitrário. */
export function TopicDots({
  entries, topics,
}: {
  entries: Entry[];
  topics: CalendarTopic[];
}) {
  if (!entries.length) return null;
  return (
    <span className="topic-dots" aria-hidden="true">
      {entries.map((entry) => (
        <span key={entry.id} className="topic-dot"
          style={{ backgroundColor: calendarEntryColor(entry, topics) }} />
      ))}
    </span>
  );
}
