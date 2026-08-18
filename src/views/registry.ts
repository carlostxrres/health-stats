import { AlarmClock, BedDouble, CalendarDays, Scale } from "lucide-react";
import type { ComponentType } from "react";
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
    slug: "weight",
    name: "Body weight (simple)",
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
];

export function getView(slug: string | undefined): ViewDefinition | undefined {
  return VIEWS.find((view) => view.slug === slug);
}
