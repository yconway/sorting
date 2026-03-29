export const SPEED_DELAYS = { slow: 120, medium: 50, fast: 10 } as const;
export const RIPPLE_STEP_DELAY_MS = 12;
export const BREATH_PERIOD_MS = 750;   // sine half-period → full cycle = 1.5 s
export const BREATH_AMPLITUDE = 0.12;  // saturation units added/removed
export const chartMargin = { top: 24, right: 24, bottom: 24, left: 24 };

export const COLORS = {
  comparing: "#fbbf24", // amber    — bars being compared
  swapping:  "#f472b6", // pink     — bar being placed
  bracket:   "#a78bfa", // lavender — active range bracket
  ripple:    "#4ade80", // green    — completion ripple
  pivotLine: "#fb923c", // orange   — quicksort pivot cutoff line
};
