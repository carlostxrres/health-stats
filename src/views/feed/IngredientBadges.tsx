import type { MealIngredient } from "@shared/types";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const INGREDIENT_SEPARATOR = " · ";
const MAX_VISIBLE_INGREDIENTS = 4;

function formatIngredient({
  ingredient,
  quantityValue,
  quantityUnit,
  quantityRaw,
}: MealIngredient) {
  if (quantityValue && quantityUnit) {
    return `${quantityValue} ${quantityUnit}${INGREDIENT_SEPARATOR}${ingredient}`;
  }
  if (quantityValue) return `${quantityValue}x${INGREDIENT_SEPARATOR}${ingredient}`;
  if (quantityRaw) return `${quantityRaw}${INGREDIENT_SEPARATOR}${ingredient}`;
  return ingredient;
}

// Feed posts need a predictable height, so overflow ingredients go in a
// Popover instead of expanding the card in place (a Collapsible would push
// every post below it down as it opens, which feels bad in a scroll feed).
export function IngredientBadges({ ingredients }: { ingredients: MealIngredient[] }) {
  const visible = ingredients.slice(0, MAX_VISIBLE_INGREDIENTS);
  const hiddenCount = ingredients.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((ingredient) => (
        <Badge key={ingredient.id} variant="secondary" className="font-normal">
          {formatIngredient(ingredient)}
        </Badge>
      ))}
      {hiddenCount > 0 && (
        <Popover>
          <PopoverTrigger
            nativeButton={false}
            render={<Badge variant="outline" className="cursor-pointer font-normal" />}
          >
            +{hiddenCount} más
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <ul className="space-y-1 text-sm">
              {ingredients.map((ingredient) => (
                <li key={ingredient.id}>{formatIngredient(ingredient)}</li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
