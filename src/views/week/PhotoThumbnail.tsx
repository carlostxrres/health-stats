import { ImageIcon } from "lucide-react";
import { useSignedPhotoUrl } from "@/lib/useSignedPhotoUrl";

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
