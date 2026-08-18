import { useEffect, useRef, useState } from "react";
import { FeedPost } from "./FeedPost";
import { createFeedLoader } from "./feedItems";
import type { FeedItem } from "./types";

export function FeedView() {
  const [loader] = useState(() => createFeedLoader());
  const [items, setItems] = useState<FeedItem[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const inFlightRef = useRef(false);
  const initialLoadStartedRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<() => void>(() => {});

  async function loadMore() {
    if (inFlightRef.current || !hasMore) return;
    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const page = await loader.loadPage();
      setItems((prev) => [...prev, ...page.items]);
      setHasMore(page.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el feed.");
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }

  loadMoreRef.current = loadMore;

  useEffect(() => {
    if (initialLoadStartedRef.current) return;
    initialLoadStartedRef.current = true;
    loadMoreRef.current();
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreRef.current();
      },
      { rootMargin: "400px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4 p-4">
      <div>
        <h1 className="font-heading text-lg font-medium">Feed</h1>
        <p className="text-sm text-muted-foreground">
          Comidas, sueño y entrenamientos, en orden cronológico.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {items.length === 0 && loading && <p className="text-sm text-muted-foreground">Cargando…</p>}

      {items.length === 0 && !loading && !error && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Todavía no hay nada que mostrar.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <FeedPost key={item.id} item={item} />
        ))}
      </div>

      {hasMore && <div ref={sentinelRef} aria-hidden className="h-1" />}
      {items.length > 0 && loading && (
        <p className="text-center text-sm text-muted-foreground">Cargando más…</p>
      )}
    </div>
  );
}
