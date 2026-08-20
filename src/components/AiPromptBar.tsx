import type { EntryTypeCode } from "@shared/entryTypes";
import { Image as ImageIcon, Loader2, Send, Sparkles } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useState } from "react";
import type { UploadedPhotoFile } from "@/components/forms/PhotoUploader";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { apiClient } from "@/lib/api-client";
import { localInputToIso, nowAsLocalInputValue } from "@/lib/datetime";
import { compressImageToBase64 } from "@/lib/imageCompression";
import { extractEarliestEatenAt } from "@/lib/imageExif";

const MAX_IMAGES = 4;

export function AiPromptBar({
  onParsed,
  images = [],
}: {
  onParsed: (type: EntryTypeCode, data: unknown) => void;
  images?: UploadedPhotoFile[];
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasImages = images.length > 0;
  const canSubmit = text.trim().length > 0 || hasImages;

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (loading || (!trimmed && !hasImages)) return;

    setLoading(true);
    setError(null);
    try {
      const now = localInputToIso(nowAsLocalInputValue());
      let type: EntryTypeCode;
      let data: unknown;

      if (hasImages) {
        if (images.length > MAX_IMAGES) {
          throw new Error(`Máximo ${MAX_IMAGES} fotos por análisis.`);
        }
        const files = images.map((img) => img.file);
        const [compressed, exifEatenAt] = await Promise.all([
          Promise.all(files.map((file) => compressImageToBase64(file))),
          extractEarliestEatenAt(files),
        ]);
        const res = await apiClient.post<{ type: "meal"; data: Record<string, unknown> }>(
          "/ai/parse?kind=meal-photo",
          { text: trimmed || undefined, now, images: compressed },
        );
        type = res.type;
        data = {
          ...res.data,
          eatenAt: exifEatenAt ?? res.data.eatenAt,
          photos: images.map((img) => ({ storagePath: img.storagePath })),
        };
      } else {
        const res = await apiClient.post<{ type: EntryTypeCode; data: unknown }>("/ai/parse", {
          text: trimmed,
          now,
        });
        type = res.type;
        data = res.data;
      }

      onParsed(type, data);
      setText("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : hasImages
            ? "No se pudo interpretar la foto."
            : "No se pudo interpretar el texto.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sticky bottom-0 z-10 border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <form onSubmit={handleSubmit} className="mx-auto flex max-w-lg flex-col gap-1.5">
        <InputGroup>
          <InputGroupAddon>
            <Sparkles />
          </InputGroupAddon>
          {hasImages && (
            <InputGroupAddon>
              <InputGroupText className="gap-1 text-foreground">
                <ImageIcon className="size-4" />
                {images.length}
              </InputGroupText>
            </InputGroupAddon>
          )}
          <InputGroupTextarea
            placeholder={
              hasImages
                ? "Añade contexto (opcional)…"
                : 'Describe qué quieres registrar, ej. "peso 87,75kg"'
            }
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
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
