import { ENTRY_TYPES, type EntryTypeCode } from "@shared/entryTypes";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Field } from "@/components/forms/Field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiClient } from "@/lib/api-client";

type NormalizedEntry = {
  id: string;
  type: EntryTypeCode;
  occurredAt: string;
  title: string;
  source: string;
};

const PAGE_SIZE = 50;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function typeLabel(code: EntryTypeCode) {
  return ENTRY_TYPES.find((t) => t.code === code)?.shortLabel ?? code;
}

export function LogsPage() {
  const navigate = useNavigate();
  const [selectedTypes, setSelectedTypes] = useState<Set<EntryTypeCode>>(new Set());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [items, setItems] = useState<NormalizedEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(offset: number, append: boolean) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      for (const type of selectedTypes) params.append("type", type);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("sort", sort);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));

      const res = await apiClient.get<{ items: NormalizedEntry[]; total: number }>(
        `/entries?${params.toString()}`,
      );
      setItems((prev) => (append ? [...prev, ...res.items] : res.items));
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload from scratch whenever a filter changes, not when `load` itself changes.
  useEffect(() => {
    load(0, false);
  }, [selectedTypes, from, to, sort]);

  function toggleType(code: EntryTypeCode) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4 p-4">
      <div>
        <h1 className="font-heading text-lg font-medium">Registros</h1>
        <p className="text-sm text-muted-foreground">
          Todo lo registrado, sin gráficos ni distracciones.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {ENTRY_TYPES.map((type) => (
            <Button
              key={type.code}
              type="button"
              size="sm"
              variant={selectedTypes.has(type.code) ? "default" : "outline"}
              onClick={() => toggleType(type.code)}
            >
              {type.shortLabel}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <Field label="Desde">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Hasta">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Field label="Orden">
            <Select
              items={[
                { value: "desc", label: "Más recientes primero" },
                { value: "asc", label: "Más antiguos primero" },
              ]}
              value={sort}
              onValueChange={(value) => setSort(value as "asc" | "desc")}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Más recientes primero</SelectItem>
                <SelectItem value="asc">Más antiguos primero</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No hay entradas para estos filtros.</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Origen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer"
                onClick={() => navigate(`/log/${item.id}`)}
              >
                <TableCell className="text-muted-foreground">
                  {formatDateTime(item.occurredAt)}
                </TableCell>
                <TableCell className="max-w-60 truncate whitespace-nowrap font-medium">
                  <Link to={`/log/${item.id}`} onClick={(e) => e.stopPropagation()}>
                    {item.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{typeLabel(item.type)}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground capitalize">{item.source}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {items.length < total && (
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => load(items.length, true)}
          className="self-center"
        >
          {loading ? "Cargando…" : "Cargar más"}
        </Button>
      )}
    </div>
  );
}
