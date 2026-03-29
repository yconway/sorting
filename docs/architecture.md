# sorting — Architecture Reference

A sorting algorithm visualizer. Step-by-step interactive visualization of merge sort and quicksort, built with D3.js and vanilla TypeScript.

---

## Stack

| Layer | Technology |
|---|---|
| Language | TypeScript 5.9+ (strict mode) |
| Bundler | Vite 8 |
| Visualization | D3.js 7 |
| Deployment | AWS S3 + CloudFront |
| Package manager | yarn |
| Node version | v24 (`.nvmrc`) |

No frontend framework. Everything is vanilla DOM + D3 SVG manipulation.

---

## Project Layout

```
d3-geo-viz/
├── src/
│   ├── main.ts              # Entire UI, animation loop, D3 rendering
│   ├── style.css            # Dark theme styles
│   └── algorithms/
│       ├── types.ts         # Frame and Algorithm type definitions
│       ├── mergeSort.ts     # Merge sort generator
│       └── quickSort.ts     # Quicksort generator (random pivot)
├── public/                  # Static assets (favicon, icons)
├── scripts/
│   └── deploy.sh            # S3 sync + CloudFront invalidation
├── index.html               # Entry HTML with control panel markup
├── package.json
└── tsconfig.json
```

---

## Core Abstraction: Frames and Generators

The algorithm layer and the rendering layer are decoupled through a single contract defined in `src/algorithms/types.ts`.

```typescript
interface Frame {
  array: number[];
  comparing?: number[];      // indices to highlight amber
  swapping?: number[];       // indices to highlight pink
  range?: [number, number];  // bracket drawn below bars
  pivotValue?: number;       // dashed horizontal line (quicksort only)
}

type Algorithm = (input: number[]) => Generator<Frame>;
```

Each algorithm is a generator function that yields `Frame` objects — one per visual step. The playback engine just calls `.next()` on the generator at a configurable interval and passes the frame to the renderer. Algorithms pre-compute all frames into a local array, then `yield*` that array at the end (so the generator pattern is used for consistency, not lazy evaluation).

---

## Rendering (src/main.ts)

All rendering lives in `main.ts`. There are three SVG layers managed by D3:

- **`chartGroup`** — the bars themselves (rectangles, positioned with `scaleBand` + `scaleLinear`)
- **`bracketGroup`** — an SVG path drawn below the bars to show the active sort range
- **`pivotLineGroup`** — a dashed horizontal line + "PIVOT" label for quicksort

Bar color is resolved per-frame by `resolveBarColor()`:
- Swapping indices → pink (`#f57eb6`)
- Comparing indices → amber (`#f5c07e`)
- Sorted/complete → green (set by the ripple effect)
- Base color → sequential scale from pastel blue (`#7ec8f5`) to yellow (`#f5e17e`), based on bar value

---

## Animation State Machine

State is held in module-level variables in `main.ts`:

| Variable | Purpose |
|---|---|
| `currentArray` | The working array (shuffled, being sorted) |
| `sortGenerator` | Active generator instance, or null if not sorting |
| `selectedAlgorithm` | `mergeSort` or `quickSort` function reference |
| `animationTimer` | `setTimeout` ID for the current playback tick |
| `isPlaying` | Whether the playback loop is running |
| `isBreathing` | Whether the idle breathing animation is active |
| `lastFrameArray` | Snapshot of the most recently rendered frame |

### Playback loop

```
advanceFrame()
  → generator.next()
  → renderFrame(frame)      // D3 data binding → SVG update
  → setTimeout(advanceFrame, frameDelayMs)
```

Speed options: slow (120ms), medium (50ms), fast (10ms).

### Special animations

- **Breathing** — when paused, a `requestAnimationFrame` loop applies a sine-wave saturation pulse to comparing/swapping bars to keep the visualization alive.
- **Completion ripple** — when the sort finishes, bars turn green outward from center using staggered `setTimeout` calls.

---

## Algorithms

### Merge Sort (`src/algorithms/mergeSort.ts`)
Classic recursive divide-and-conquer. `sortRegion()` splits, `mergeHalves()` merges. Each comparison and placement yields a frame. The active merge range is included as `range` so the bracket renders correctly.

### Quicksort (`src/algorithms/quickSort.ts`)
Random pivot selection (avoids O(n²) on pre-sorted input). `partition()` does a Hoare-like scan: walks left pointer rightward, swapping elements smaller than pivot to the left side. The initial pivot swap is silent (no frame). Each comparison and swap during partitioning yields a frame with `pivotValue` set, so the dashed cutoff line renders throughout the partition.

---

## Adding a New Algorithm

1. Create `src/algorithms/yourSort.ts`
2. Implement `(input: number[]) => Generator<Frame>` — yield a `Frame` at each visual step
3. Export and import it in `main.ts`
4. Add a button in `index.html` wired to `setAlgorithm(yourSort)`

---

## Controls

| Control | Effect |
|---|---|
| Sort / Pause / Resume button | Toggle playback |
| Step button | Advance one frame |
| Shuffle button | Randomize array, reset generator |
| Algorithm buttons | Switch between merge/quick sort |
| Speed buttons | Set frame delay (slow/medium/fast) |
| Size slider | Change array length, reshuffle |
| Spacebar | Pause / resume |
| Window resize | Re-sync SVG dimensions, re-render |

---

## Deployment

`yarn deploy` runs `scripts/deploy.sh`, which:
1. Runs `yarn build`
2. Syncs JS/CSS assets to S3 with long-term cache headers (`max-age=31536000, immutable`)
3. Uploads `index.html` with short cache (`max-age=60`) so updates propagate quickly
4. Invalidates the CloudFront distribution (`/*`)

Bucket name and CloudFront distribution ID are pulled from CloudFormation stack outputs.