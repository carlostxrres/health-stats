import { Image as ImageIcon, ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import { PHOTOS_BUCKET, SIGNED_URL_TTL_SECONDS } from "@/lib/photoStorage";
import { supabase } from "@/lib/supabase";

export type UploadedPhotoFile = { storagePath: string; file: File };

type PendingPhoto = {
  path: string;
  status: "uploading" | "error";
  error?: string;
};

function filenameFromPath(path: string) {
  const name = path.split("/").pop() ?? path;
  return name.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "");
}

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
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // Always-current refs so an in-flight upload's completion never acts on a
  // stale `value`/`onChange` closure (e.g. the parent resetting photoPaths
  // to [] on submit while another photo is still uploading).
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onFilesChangeRef = useRef(onFilesChange);
  onFilesChangeRef.current = onFilesChange;

  const filesByPathRef = useRef(new Map<string, File>());
  const objectUrlsRef = useRef(new Map<string, string>());
  const signedRequestedRef = useRef(new Set<string>());
  const removedWhileUploadingRef = useRef(new Set<string>());

  function reportFiles(paths: string[]) {
    onFilesChangeRef.current?.(
      paths.flatMap((path) => {
        const file = filesByPathRef.current.get(path);
        return file ? [{ storagePath: path, file }] : [];
      }),
    );
  }

  // Fetch signed URLs for committed paths we don't already have a File for
  // (pre-existing photos seeded via initialData in edit mode).
  useEffect(() => {
    const missing = value.filter(
      (path) => !filesByPathRef.current.has(path) && !signedRequestedRef.current.has(path),
    );
    if (missing.length === 0) return;
    for (const path of missing) signedRequestedRef.current.add(path);

    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.all(
          missing.map(async (path) => {
            const { data } = await supabase.storage
              .from(PHOTOS_BUCKET)
              .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
            return [path, data?.signedUrl] as const;
          }),
        );
        if (cancelled) return;
        setSignedUrls((prev) => {
          const next = { ...prev };
          for (const [path, url] of results) {
            if (url) next[path] = url;
          }
          return next;
        });
      } catch {
        // Network errors just leave those photos without a preview (icon
        // fallback); nothing to recover from here.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value]);

  // Garbage-collect object URLs (and their File refs) for photos no longer
  // referenced by `value` or `pending` — covers both explicit removal and
  // the parent externally resetting `value` after a successful submit.
  useEffect(() => {
    const alive = new Set([...value, ...pending.map((p) => p.path)]);
    for (const [path, url] of objectUrlsRef.current) {
      if (!alive.has(path)) {
        URL.revokeObjectURL(url);
        objectUrlsRef.current.delete(path);
        filesByPathRef.current.delete(path);
      }
    }
  }, [value, pending]);

  // Revoke everything on unmount.
  useEffect(() => {
    const objectUrls = objectUrlsRef.current;
    return () => {
      for (const url of objectUrls.values()) URL.revokeObjectURL(url);
    };
  }, []);

  function registerFile(path: string, file: File) {
    filesByPathRef.current.set(path, file);
    if (!objectUrlsRef.current.has(path)) {
      objectUrlsRef.current.set(path, URL.createObjectURL(file));
    }
  }

  async function uploadOne(path: string, file: File) {
    let uploadError: { message: string } | null = null;
    try {
      const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, file);
      uploadError = error;
    } catch (err) {
      uploadError = { message: err instanceof Error ? err.message : "Error al subir la foto" };
    }

    if (removedWhileUploadingRef.current.has(path)) {
      removedWhileUploadingRef.current.delete(path);
      // Best-effort: don't leave an orphaned object in storage if it
      // uploaded successfully after the user already removed it.
      if (!uploadError) void supabase.storage.from(PHOTOS_BUCKET).remove([path]);
      return;
    }

    if (uploadError) {
      setPending((prev) =>
        prev.map((p) =>
          p.path === path ? { ...p, status: "error", error: uploadError.message } : p,
        ),
      );
      return;
    }

    setPending((prev) => prev.filter((p) => p.path !== path));
    const next = [...valueRef.current, path];
    onChangeRef.current(next);
    reportFiles(next);
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    for (const file of Array.from(fileList)) {
      const path = `${pathPrefix}/${crypto.randomUUID()}-${file.name}`;
      registerFile(path, file);
      setPending((prev) => [...prev, { path, status: "uploading" }]);
      void uploadOne(path, file);
    }
  }

  function removeCommitted(path: string) {
    const next = value.filter((p) => p !== path);
    onChange(next);
    reportFiles(next);
  }

  function removePending(path: string) {
    removedWhileUploadingRef.current.add(path);
    setPending((prev) => prev.filter((p) => p.path !== path));
  }

  function previewUrlFor(path: string) {
    return objectUrlsRef.current.get(path) ?? signedUrls[path];
  }

  const items = [
    ...value.map((path) => ({ path, meta: null as PendingPhoto | null })),
    ...pending.map((p) => ({ path: p.path, meta: p })),
  ];

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          // Allow re-selecting the same file later (e.g. re-add after
          // removing it) — without this the browser won't fire another
          // change event for an identical selection.
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus className="size-3.5" /> Añadir fotos
      </Button>

      {items.length > 0 && (
        <AttachmentGroup>
          {items.map(({ path, meta }) => {
            const previewUrl = previewUrlFor(path);
            const state = meta ? meta.status : "done";
            return (
              <Attachment key={path} orientation="vertical" state={state}>
                <AttachmentMedia variant={previewUrl ? "image" : "icon"}>
                  {previewUrl ? (
                    <img src={previewUrl} alt={filenameFromPath(path)} />
                  ) : (
                    <ImageIcon />
                  )}
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{filenameFromPath(path)}</AttachmentTitle>
                  {meta?.status === "error" && (
                    <AttachmentDescription>{meta.error}</AttachmentDescription>
                  )}
                </AttachmentContent>
                <AttachmentActions>
                  <AttachmentAction
                    aria-label="Quitar foto"
                    onClick={() => (meta ? removePending(path) : removeCommitted(path))}
                  >
                    <X className="size-3.5" />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
            );
          })}
        </AttachmentGroup>
      )}
    </div>
  );
}
