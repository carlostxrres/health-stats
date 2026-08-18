import { ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { useSignedPhotoUrl } from "@/lib/useSignedPhotoUrl";
import { cn } from "@/lib/utils";

function CarouselPhoto({ storagePath }: { storagePath: string }) {
  const url = useSignedPhotoUrl(storagePath);
  if (!url) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
        <ImageIcon className="size-8 text-muted-foreground" />
      </div>
    );
  }
  return <img src={url} alt="" className="aspect-video w-full rounded-lg object-cover" />;
}

// The Card ancestor clips overflow, which would cut off the default
// shadcn CarouselPrevious/CarouselNext buttons (they sit outside the
// carousel's own bounds via negative offsets). Dot indicators instead —
// swipe/drag to navigate, same as a typical mobile feed's image carousel.
export function PostPhotoCarousel({ photos }: { photos: { id: string; storagePath: string }[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!api) return;
    setSelected(api.selectedScrollSnap());
    const onSelect = () => setSelected(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (photos.length === 1) {
    return <CarouselPhoto storagePath={photos[0].storagePath} />;
  }

  return (
    <div className="flex flex-col gap-2">
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent>
          {photos.map((photo) => (
            <CarouselItem key={photo.id}>
              <CarouselPhoto storagePath={photo.storagePath} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="flex justify-center gap-1">
        {photos.map((photo, index) => (
          <span
            key={photo.id}
            className={cn(
              "size-1.5 rounded-full",
              index === selected ? "bg-foreground" : "bg-muted-foreground/30",
            )}
          />
        ))}
      </div>
    </div>
  );
}
