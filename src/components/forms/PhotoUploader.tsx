import { X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

const PHOTOS_BUCKET = "health-photos";

export type UploadedPhotoFile = { storagePath: string; file: File };

export function PhotoUploader({
  pathPrefix,
  value,
  onChange,
  onFilesChange,
}: {
  pathPrefix: string;
  value: string[];
  onChange: (paths: string[]) => void;
  onFilesChange?: (files: UploadedPhotoFile[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filesByPathRef = useRef(new Map<string, File>());

  function reportFiles(paths: string[]) {
    onFilesChange?.(
      paths.flatMap((path) => {
        const file = filesByPathRef.current.get(path);
        return file ? [{ storagePath: path, file }] : [];
      }),
    );
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(fileList)) {
        const path = `${pathPrefix}/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from(PHOTOS_BUCKET)
          .upload(path, file);
        if (uploadError) {
          throw uploadError;
        }
        filesByPathRef.current.set(path, file);
        uploaded.push(path);
      }
      const next = [...value, ...uploaded];
      onChange(next);
      reportFiles(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir la foto");
    } finally {
      setUploading(false);
    }
  }

  function removeAt(index: number) {
    const removed = value[index];
    filesByPathRef.current.delete(removed);
    const next = value.filter((_, i) => i !== index);
    onChange(next);
    reportFiles(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        accept="image/*"
        multiple
        disabled={uploading}
        onChange={(e) => handleFiles(e.target.files)}
        className="text-sm"
      />
      {uploading && <p className="text-sm text-muted-foreground">Subiendo…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {value.length > 0 && (
        <ul className="flex flex-col gap-1">
          {value.map((path, index) => (
            <li key={path} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{path.split("/").pop()}</span>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeAt(index)}>
                <X className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
