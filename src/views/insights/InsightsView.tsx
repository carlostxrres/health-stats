import { Loader2, Send, Sparkles, UtensilsCrossed } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { apiClient } from "@/lib/api-client";
import { localInputToIso, nowAsLocalInputValue } from "@/lib/datetime";

type Focus = "meal" | "general";

type ChatMessage = { role: "user" | "assistant"; content: string };

const PRESETS: { focus: Focus; label: string; icon: typeof UtensilsCrossed; question: string }[] = [
  {
    focus: "meal",
    label: "Comida",
    icon: UtensilsCrossed,
    question:
      "¿Cómo estoy comiendo últimamente? Coméntame patrones, tendencias, y si ves algo que debería vigilar (por ejemplo, variedad de alimentos o algún grupo que falte).",
  },
  {
    focus: "general",
    label: "General",
    icon: Sparkles,
    question:
      "Dame un resumen general de mis datos de salud recientes: sueño, peso, entrenamientos, y cualquier cosa que te llame la atención.",
  },
];

export function InsightsView() {
  const [focus, setFocus] = useState<Focus | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(activeFocus: Focus, text: string, historyOverride?: ChatMessage[]) {
    const history = historyOverride ?? messages;
    setLoading(true);
    setError(null);
    setMessages([...history, { role: "user", content: text }]);
    try {
      const now = localInputToIso(nowAsLocalInputValue());
      const res = await apiClient.post<{ answer: string }>("/ai/parse?kind=insights", {
        focus: activeFocus,
        question: text,
        history,
        now,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: res.answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar una respuesta.");
      setMessages(history);
    } finally {
      setLoading(false);
    }
  }

  function startPreset(preset: (typeof PRESETS)[number]) {
    if (loading) return;
    setFocus(preset.focus);
    send(preset.focus, preset.question, []);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (loading || !trimmed) return;
    // A free-text question with no focus chosen yet defaults to "general" —
    // the broadest digest, since there's nothing narrower to infer from.
    send(focus ?? "general", trimmed);
    setFocus((f) => f ?? "general");
    setQuestion("");
  }

  return (
    <div className="flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="font-heading text-lg font-medium">Insights IA</h1>
        <p className="text-sm text-muted-foreground">
          Pídele a la IA su opinión sobre tus datos registrados.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.focus}
            type="button"
            variant={focus === preset.focus ? "default" : "outline"}
            size="sm"
            disabled={loading}
            onClick={() => startPreset(preset)}
          >
            <preset.icon className="size-4" />
            {preset.label}
          </Button>
        ))}
      </div>

      {messages.length === 0 && !loading && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Elige un tema o escribe una pregunta</EmptyTitle>
            <EmptyDescription>
              La IA analizará un resumen de tus registros recientes para responder.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <div className="flex flex-1 flex-col gap-3">
        {messages.map((message, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: messages are only ever appended, never reordered or removed individually.
            key={index}
            className={
              message.role === "user"
                ? "max-w-[85%] self-end rounded-2xl bg-primary px-3.5 py-2 text-sm text-primary-foreground"
                : "max-w-[85%] self-start rounded-2xl bg-muted px-3.5 py-2 text-sm whitespace-pre-wrap text-foreground"
            }
          >
            {message.content}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 self-start text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Pensando…
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <form onSubmit={handleSubmit} className="sticky bottom-0 bg-background pt-1">
        <InputGroup>
          <InputGroupTextarea
            placeholder="Pregunta algo más…"
            rows={1}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="submit"
              size="icon-xs"
              variant="default"
              disabled={loading || question.trim().length === 0}
              aria-label="Enviar"
            >
              <Send />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </div>
  );
}
