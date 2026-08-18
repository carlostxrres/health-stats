import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BOUNDARY_HOUR_ITEMS } from "./boundaryDay";

export function BoundaryHourSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex gap-2 lg:flex-col">
      <Label htmlFor="boundary-hour-select">Inicio del día</Label>
      <Select
        id="boundary-hour-select"
        items={BOUNDARY_HOUR_ITEMS}
        value={value}
        onValueChange={(next) => onChange(next ?? 0)}
      >
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BOUNDARY_HOUR_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
