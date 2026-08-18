import { ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { PHOTOS_BUCKET, SIGNED_URL_TTL_SECONDS } from "@/lib/photoStorage";
import { supabase } from "@/lib/supabase";

// Module-level cache so hovering the same day repeatedly during a session
// doesn't re-request a signed URL for a photo we've already resolved.
const signedUrlCache = new Map<string, string>();

function useSignedPhotoUrl(storagePath: string) {
  const [url, setUrl] = useState(() => signedUrlCache.get(storagePath));

  useEffect(() => {
    if (signedUrlCache.has(storagePath)) {
      setUrl(signedUrlCache.get(storagePath));
      return;
    }
    let cancelled = false;
    supabase.storage
      .from(PHOTOS_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)
      .then(({ data }) => {
        if (cancelled || !data?.signedUrl) return;
        signedUrlCache.set(storagePath, data.signedUrl);
        setUrl(data.signedUrl);
      })
      .catch(() => {
        // Network errors just leave this photo without a preview.
      });
    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  return url;
}

export function PhotoThumbnail({ storagePath }: { storagePath: string }) {
  const url = useSignedPhotoUrl(storagePath);
  if (!url) {
    return (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
        <ImageIcon className="size-4 text-muted-foreground" />
      </div>
    );
  }
  return <img src={url} alt="" className="size-10 shrink-0 rounded-md object-cover" />;
}
