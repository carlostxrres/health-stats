import {
  AlarmClock,
  BedDouble,
  CalendarDays,
  Flame,
  Rss,
  Scale,
  Sparkles,
  Target,
} from "lucide-react";
import type { ComponentType } from "react";
import { FeedView } from "@/views/feed/FeedView";
import { InsightsView } from "@/views/insights/InsightsView";
import { NutritionComplianceView } from "@/views/nutrition-compliance/NutritionComplianceView";
import { PoopRegularityView } from "@/views/poop-regularity/PoopRegularityView";
import { SleepPeriodsView } from "@/views/sleep-periods/SleepPeriodsView";
import { SleepTimesView } from "@/views/sleep-times/SleepTimesView";
import { WeekView } from "@/views/week/WeekView";
import { WeightView } from "@/views/weight/WeightView";

export type ViewDefinition = {
  slug: string;
  name: string;
  icon: ComponentType<{ className?: string }>;
  component: ComponentType;
};

export const VIEWS: ViewDefinition[] = [
  {
    slug: "feed",
    name: "Feed",
    icon: Rss,
    component: FeedView,
  },
  {
    slug: "weight",
    name: "Body weight",
    icon: Scale,
    component: WeightView,
  },
  {
    slug: "sleep-times",
    name: "Sleep times",
    icon: BedDouble,
    component: SleepTimesView,
  },
  {
    slug: "sleep-periods",
    name: "Sleep periods",
    icon: AlarmClock,
    component: SleepPeriodsView,
  },
  {
    slug: "week",
    name: "Week",
    icon: CalendarDays,
    component: WeekView,
  },
  {
    slug: "poop-regularity",
    name: "Regularity",
    icon: Flame,
    component: PoopRegularityView,
  },
  {
    slug: "insights",
    name: "Insights IA",
    icon: Sparkles,
    component: InsightsView,
  },
  {
    slug: "cumplimiento",
    name: "Cumplimiento",
    icon: Target,
    component: NutritionComplianceView,
  },
];

export function getView(slug: string | undefined): ViewDefinition | undefined {
  return VIEWS.find((view) => view.slug === slug);
}
