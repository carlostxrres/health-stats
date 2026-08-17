// Local regression (LOESS, degree 1): for every point, fits a line to its
// neighborhood weighted by distance (tricube kernel) and evaluates it at
// that point. `bandwidth` is the fraction of all points considered "close".
export type LoessPoint = { x: number; y: number };

function tricube(u: number) {
  return u < 1 ? (1 - u ** 3) ** 3 : 0;
}

export function loess(points: LoessPoint[], bandwidth = 0.3): LoessPoint[] {
  const n = points.length;
  if (n < 2) return points;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const windowSize = Math.min(n, Math.max(2, Math.ceil(bandwidth * n)));

  return points.map((point) => {
    const distances = xs.map((x) => Math.abs(x - point.x));
    const bandwidthDistance = [...distances].sort((a, b) => a - b)[windowSize - 1] || 1;

    let sumW = 0;
    let sumWX = 0;
    let sumWY = 0;
    let sumWXY = 0;
    let sumWXX = 0;
    for (let i = 0; i < n; i++) {
      const w = tricube(distances[i] / bandwidthDistance);
      if (w <= 0) continue;
      sumW += w;
      sumWX += w * xs[i];
      sumWY += w * ys[i];
      sumWXY += w * xs[i] * ys[i];
      sumWXX += w * xs[i] * xs[i];
    }

    const denom = sumW * sumWXX - sumWX * sumWX;
    const y =
      Math.abs(denom) < 1e-9
        ? sumWY / sumW
        : (() => {
            const slope = (sumW * sumWXY - sumWX * sumWY) / denom;
            const intercept = (sumWY - slope * sumWX) / sumW;
            return intercept + slope * point.x;
          })();

    return { x: point.x, y };
  });
}
