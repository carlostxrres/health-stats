import { MealPost } from "./MealPost";
import { PoopPost } from "./PoopPost";
import { SleepPost } from "./SleepPost";
import type { FeedItem } from "./types";
import { WorkoutPost } from "./WorkoutPost";

export function FeedPost({ item }: { item: FeedItem }) {
  switch (item.kind) {
    case "meal":
      return <MealPost meal={item.data} />;
    case "sleep":
      return <SleepPost session={item.data} />;
    case "workout":
      return <WorkoutPost workout={item.data} />;
    case "poop":
      return <PoopPost entry={item.data} />;
  }
}
