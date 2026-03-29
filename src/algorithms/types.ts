export interface Frame {
  array: number[];
  comparing?: number[]; // indices being compared — highlighted amber
  swapping?: number[];  // indices being placed/moved — highlighted pink
  range?: [number, number]; // [lo, hi] — current working region, shown as bracket
  pivotValue?: number;      // quicksort pivot value — shown as a horizontal cutoff line
}

export type Algorithm = (input: number[]) => Generator<Frame>;
