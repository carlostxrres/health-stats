import type { SleepSession } from "@shared/types";
import { QUALITY_RATING_INFO, WAKE_FEELING_INFO } from "@shared/validation";
import { Moon } from "lucide-react";
import { localClock } from "@/lib/localTime";
import { PostCard } from "./PostCard";

function formatDurationHours(wentToBedAt: string, wokeUpAt: string) {
  const hours = (new Date(wokeUpAt).getTime() - new Date(wentToBedAt).getTime()) / 3_600_000;
  return `${hours.toFixed(1)} horas`;
}

export function SleepPost({ session }: { session: SleepSession }) {
  return (
    <PostCard
      icon={Moon}
      verb={`Durmió${session.isNap ? " una siesta" : ""}`}
      occurredAt={session.wentToBedAt}
    >
      <p className="font-medium text-foreground">
        {formatDurationHours(session.wentToBedAt, session.wokeUpAt)}
      </p>
      <p className="text-sm text-muted-foreground">
        Se levantó a las {localClock(session.wokeUpAt)}
      </p>
      {session.notes && <p className="text-sm text-muted-foreground">{session.notes}</p>}
      {session.qualityRating != null && (
        <p className="text-sm text-muted-foreground">
          Calidad del sueño: {session.qualityRating} —{" "}
          {QUALITY_RATING_INFO[session.qualityRating as 1 | 2 | 3 | 4 | 5].name}
        </p>
      )}
      {session.wakeFeeling != null && (
        <p className="text-sm text-muted-foreground">
          Sensación al despertar: {session.wakeFeeling} —{" "}
          {WAKE_FEELING_INFO[session.wakeFeeling as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9].name}
        </p>
      )}
    </PostCard>
  );
}
