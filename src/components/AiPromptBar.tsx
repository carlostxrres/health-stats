import type { EntryTypeCode } from "@shared/entryTypes";
import { Image as ImageIcon, Loader2, Send, Sparkles } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { UploadedPhotoFile } from "@/components/forms/PhotoUploader";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { apiClient } from "@/lib/api-client";
import { localInputToIso, nowAsLocalInputValue } from "@/lib/datetime";
import { compressImageToBase64 } from "@/lib/imageCompression";

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
        const compressed = await Promise.all(images.map((img) => compressImageToBase64(img.file)));
        const res = await apiClient.post<{ type: "meal"; data: Record<string, unknown> }>(
          "/ai/parse-meal-photo",
          { text: trimmed || undefined, now, images: compressed },
        );
        type = res.type;
        data = { ...res.data, photos: images.map((img) => ({ storagePath: img.storagePath })) };
      } else {
        const res = await apiClient.post<{ type: EntryTypeCode; data: unknown }>(
          "/ai/parse-entry",
          { text: trimmed, now },
        );
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
    <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
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
          <InputGroupInput
            placeholder={
              hasImages
                ? "Añade contexto (opcional)…"
                : 'Describe qué quieres registrar, ej. "peso 87,75kg"'
            }
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
