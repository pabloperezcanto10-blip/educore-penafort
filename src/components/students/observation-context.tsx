import { formatMadridDate } from "@/lib/date-time/madrid";
import type { StudentObservation } from "@/lib/tutors/students";

export function ObservationContext({ observation }: { observation: StudentObservation }) {
  return (
    <span>
      {formatMadridDate(observation.observation_date ?? observation.created_at)}
      {observation.author_name ? ` · ${observation.author_name}` : ""}
    </span>
  );
}
