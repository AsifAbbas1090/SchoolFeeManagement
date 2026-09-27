// Shared chart maths (client-safe).

// "Nice" axis: 0 plus 4 even steps (0, 2.5k, 5k, 7.5k, 10k) covering `max`.
export function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 250, 500, 750, 1000];
  const rough = max / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough)!;
  return [0, 1, 2, 3, 4].map((i) => i * step);
}

// Compact rupees for axis ticks: 1,500 -> 1.5k, 250,000 -> 2.5L (lakh).
export const shortRs = (n: number) =>
  n >= 100_000 ? `${+(n / 100_000).toFixed(1)}L` : n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : String(n);

/**
 * Smooth path through points WITHOUT overshooting (monotone cubic, Fritsch–Carlson):
 * a zero day stays on the baseline instead of dipping below it like a naive spline.
 */
export function monotonePath(pts: [number, number][]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const dx = (i: number) => pts[i + 1][0] - pts[i][0];
  const slope = (i: number) => (pts[i + 1][1] - pts[i][1]) / dx(i);
  const m: number[] = new Array(n);
  m[0] = slope(0);
  m[n - 1] = slope(n - 2);
  for (let i = 1; i < n - 1; i++) {
    const a = slope(i - 1), b = slope(i);
    // Harmonic mean of neighbouring slopes; 0 at a peak/valley so the curve never overshoots.
    m[i] = a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx(i) / 3;
    d += ` C${pts[i][0] + h},${pts[i][1] + m[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - m[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}
