import type { PoopEntryWithPhotos } from "@shared/types";
import { BRISTOL_SCALE_LABELS, STOOL_COLOR_LABELS } from "@shared/validation";
import { MapPin, Toilet } from "lucide-react";
import { PostCard } from "./PostCard";
import { PostPhotoCarousel } from "./PostPhotoCarousel";

export function PoopPost({ entry }: { entry: PoopEntryWithPhotos }) {
  const headline =
    entry.bristolScale != null
      ? BRISTOL_SCALE_LABELS[entry.bristolScale as keyof typeof BRISTOL_SCALE_LABELS]
      : "Deposición";

  return (
    <PostCard icon={Toilet} verb="Fue al baño" occurredAt={entry.occurredAt}>
      <p className="font-medium text-foreground">{headline}</p>
      {entry.location && (
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5" />
          {entry.location}
        </p>
      )}
      {entry.urgency != null && (
        <p className="text-sm text-muted-foreground">Urgencia: {entry.urgency}/5</p>
      )}
      {entry.effort != null && (
        <p className="text-sm text-muted-foreground">Esfuerzo: {entry.effort}/5</p>
      )}
      {entry.feltComplete != null && (
        <p className="text-sm text-muted-foreground">
          {entry.feltComplete ? "Vaciado completo" : "Vaciado incompleto"}
        </p>
      )}
      {entry.color && (
        <p className="text-sm text-muted-foreground">
          Color: {STOOL_COLOR_LABELS[entry.color as keyof typeof STOOL_COLOR_LABELS]}
        </p>
      )}
      {entry.durationMinutes != null && (
        <p className="text-sm text-muted-foreground">Duración: {entry.durationMinutes} min</p>
      )}
      {entry.notes && <p className="text-sm text-muted-foreground">{entry.notes}</p>}
      {entry.photos.length > 0 && <PostPhotoCarousel photos={entry.photos} />}
    </PostCard>
  );
}
