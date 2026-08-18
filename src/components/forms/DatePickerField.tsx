import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Field } from "@/components/forms/Field";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dayKeyFromDate, formatDayLabel } from "@/lib/localTime";

export function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T00:00:00`) : undefined;

  return (
    <Field label={label}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button type="button" variant="outline" className="w-full justify-start font-normal" />
          }
        >
          <CalendarIcon className="size-4" />
          {selected ? (
            formatDayLabel(value)
          ) : (
            <span className="text-muted-foreground">Selecciona una fecha</span>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            locale={es}
            captionLayout="dropdown"
            startMonth={new Date(1930, 0)}
            endMonth={new Date()}
            defaultMonth={selected}
            selected={selected}
            disabled={{ after: new Date() }}
            onSelect={(date) => {
              if (!date) return;
              onChange(dayKeyFromDate(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </Field>
  );
}
