import type { MealWithDetails } from "@shared/types";
import { MapPin, Utensils } from "lucide-react";
import { IngredientBadges } from "./IngredientBadges";
import { PostCard } from "./PostCard";
import { PostPhotoCarousel } from "./PostPhotoCarousel";

export function MealPost({ meal }: { meal: MealWithDetails }) {
  return (
    <PostCard icon={Utensils} verb="Comió" occurredAt={meal.eatenAt}>
      <p className="font-medium text-foreground">{meal.title}</p>
      {meal.location && (
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5" />
          {meal.location}
        </p>
      )}
      {meal.description && <p className="text-sm text-muted-foreground">{meal.description}</p>}
      {meal.photos.length > 0 && <PostPhotoCarousel photos={meal.photos} />}
      {meal.ingredients.length > 0 && <IngredientBadges ingredients={meal.ingredients} />}
    </PostCard>
  );
}
