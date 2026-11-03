import type { Entry } from "@/lib/model";
import { calendarEntryColor, type CalendarTopic } from "@/lib/calendar-topics";

export function TopicDots({
  entries, topics, max = 3,
}: {
  entries: Entry[];
  topics: CalendarTopic[];
  max?: number;
}) {
  if (!entries.length) return null;
  return (
    <span className="topic-dots" aria-hidden="true">
      {entries.slice(0, max).map((entry) => (
        <span key={entry.id} className="topic-dot"
          style={{ backgroundColor: calendarEntryColor(entry, topics) }} />
      ))}
      {entries.length > max ? <small className="topic-dots-more">+{entries.length - max}</small> : null}
    </span>
  );
}
