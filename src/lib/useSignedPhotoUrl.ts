import { useEffect, useState } from "react";
import { PHOTOS_BUCKET, SIGNED_URL_TTL_SECONDS } from "@/lib/photoStorage";
import { supabase } from "@/lib/supabase";

// Module-level cache so repeated renders of the same photo across the app
// don't re-request a signed URL for one we've already resolved.
const signedUrlCache = new Map<string, string>();

export function useSignedPhotoUrl(storagePath: string) {
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
