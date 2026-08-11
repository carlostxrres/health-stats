import type { EntryTypeCode } from "@shared/entryTypes";
import { Loader2, Send, Sparkles } from "lucide-react";
import { type FormEvent, useState } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { apiClient } from "@/lib/api-client";
import { localInputToIso, nowAsLocalInputValue } from "@/lib/datetime";

export function AiPromptBar({
  onParsed,
}: {
  onParsed: (type: EntryTypeCode, data: unknown) => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = text.trim().length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<{ type: EntryTypeCode; data: unknown }>("/ai/parse-entry", {
        text: trimmed,
        now: localInputToIso(nowAsLocalInputValue()),
      });
      onParsed(res.type, res.data);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo interpretar el texto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <form onSubmit={handleSubmit} className="mx-auto flex max-w-lg flex-col gap-1.5">
        <InputGroup>
          <InputGroupAddon>
            <Sparkles />
          </InputGroupAddon>
          <InputGroupInput
            placeholder='Describe qué quieres registrar, ej. "peso 87,75kg"'
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="submit"
              size="icon-xs"
              variant="default"
              disabled={loading || !canSubmit}
              aria-label="Enviar"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Send />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        {error && <InputGroupText className="text-destructive">{error}</InputGroupText>}
      </form>
    </div>
  );
}
