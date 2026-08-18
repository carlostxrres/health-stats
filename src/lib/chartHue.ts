// The chart highlight colors are oklch(), so only the hue channel needs to
// vary — lightness/chroma stay as authored in index.css. Each successive
// highlight's hue is offset by the golden angle (137.508°) from the last, so
// however many exist, they stay maximally spread out and never repeat.
const GOLDEN_ANGLE = 137.508;

const HIGHLIGHT_VARS = [
  { name: "--chart-highlight", lightness: 0.7, chroma: 0.125 },
  { name: "--chart-highlight-2", lightness: 0.7, chroma: 0.125 },
  { name: "--chart-highlight-3", lightness: 0.7, chroma: 0.125 },
  { name: "--chart-highlight-4", lightness: 0.7, chroma: 0.125 },
  { name: "--chart-highlight-5", lightness: 0.7, chroma: 0.125 },
  { name: "--chart-highlight-6", lightness: 0.7, chroma: 0.125 },
] as const;

export function chartHighlightHue(baseHue: number, index: number): number {
  return (baseHue + GOLDEN_ANGLE * index) % 360;
}

export function chartHighlightColor(baseHue: number, index: number): string {
  const { lightness, chroma } = HIGHLIGHT_VARS[index] ?? HIGHLIGHT_VARS[HIGHLIGHT_VARS.length - 1];
  return `oklch(${lightness} ${chroma} ${chartHighlightHue(baseHue, index)})`;
}

// Applies the derived palette app-wide by overriding the CSS custom
// properties on the root element (takes precedence over both the :root and
// .dark declarations in index.css, since inline style has higher
// specificity than either).
export function applyChartHuePalette(baseHue: number): void {
  HIGHLIGHT_VARS.forEach((variable, index) => {
    document.documentElement.style.setProperty(variable.name, chartHighlightColor(baseHue, index));
  });
}
