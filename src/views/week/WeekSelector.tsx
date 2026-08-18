import { es } from "date-fns/locale";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  addDays,
  dayKeyFromDate,
  formatWeekRangeLabel,
  getWeekDays,
  getWeekStartDay,
  localDayKey,
} from "@/lib/localTime";

export function WeekSelector({
  weekDays,
  onWeekChange,
}: {
  weekDays: string[];
  onWeekChange: (weekStartDay: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const weekStartDay = getWeekStartDay();
  const todayWeekDays = getWeekDays(localDayKey(new Date().toISOString()), weekStartDay);
  const isCurrentWeek = weekDays[0] === todayWeekDays[0];

  const weekStart = weekDays[0];
  const weekStartDate = new Date(`${weekStart}T00:00:00`);
  const weekEndDate = new Date(`${weekDays[weekDays.length - 1]}T00:00:00`);
  const lastSelectableDay = new Date(`${todayWeekDays[todayWeekDays.length - 1]}T00:00:00`);

  function goToWeek(day: string) {
    onWeekChange(getWeekDays(day, weekStartDay)[0]);
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Semana anterior"
        onClick={() => goToWeek(addDays(weekStart, -7))}
      >
        <ChevronLeftIcon />
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant="outline" size="sm" className="min-w-40" />}>
          {formatWeekRangeLabel(weekDays)}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            weekStartsOn={weekStartDay as 0 | 1 | 2 | 3 | 4 | 5 | 6}
            locale={es}
            defaultMonth={weekStartDate}
            disabled={{ after: lastSelectableDay }}
            modifiers={{
              selected: { from: weekStartDate, to: weekEndDate },
              range_start: weekStartDate,
              range_end: weekEndDate,
              range_middle: (date: Date) => date > weekStartDate && date < weekEndDate,
            }}
            onDayClick={(date, modifiers) => {
              if (modifiers.disabled) return;
              goToWeek(dayKeyFromDate(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Semana siguiente"
        disabled={isCurrentWeek}
        onClick={() => goToWeek(addDays(weekStart, 7))}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
}
