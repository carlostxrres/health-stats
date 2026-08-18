import type { WorkoutSet } from "@shared/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function WorkoutSetsTable({ sets }: { sets: WorkoutSet[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ejercicio</TableHead>
          <TableHead>Serie</TableHead>
          <TableHead>Reps</TableHead>
          <TableHead>Peso</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sets.map((set) => (
          <TableRow key={set.id}>
            <TableCell className="font-medium">{set.exerciseName}</TableCell>
            <TableCell>{set.setNumber}</TableCell>
            <TableCell>{set.reps ?? "—"}</TableCell>
            <TableCell>{set.weightKg ? `${set.weightKg} kg` : "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
