import "./style.css";
import * as d3 from "d3";
import type { Frame } from "./algorithms/types";
import { mergeSort } from "./algorithms/mergeSort";
import { quickSort } from "./algorithms/quickSort";
import type { Algorithm } from "./algorithms/types";
import { isCatMode, startCat, stopCat } from "./algorithms/cat";
import { ICONS } from "./icons";
import { SPEED_DELAYS, RIPPLE_STEP_DELAY_MS, BREATH_PERIOD_MS, BREATH_AMPLITUDE, chartMargin, COLORS } from "./constants";

// --- State ---
let itemCount = 80;
let currentArray: number[] = [];
let sortGenerator: Generator<Frame> | null = null;
let selectedAlgorithm: Algorithm = mergeSort;
let animationTimer: ReturnType<typeof setTimeout> | null = null;
let isPlaying = false;
let frameDelayMs: number = SPEED_DELAYS.medium;
let lastFrameArray: number[] = []; // tracks the most recently rendered frame's array

// Breathing
let isBreathing = false;
let breathAnimationFrameId: number | null = null;

// Ripple
let rippleTimeoutIds: ReturnType<typeof setTimeout>[] = [];

// --- DOM ---
const vizContainer   = document.getElementById("viz")!;
const sortButton     = document.getElementById("btn-sort")   as HTMLButtonElement;
const stepButton     = document.getElementById("btn-step")   as HTMLButtonElement;
const shuffleButton  = document.getElementById("btn-shuffle") as HTMLButtonElement;
const sizeSlider     = document.getElementById("sl-size")    as HTMLInputElement;
const sizeLabel      = document.getElementById("size-val")!;
const slowButton       = document.getElementById("btn-slow")        as HTMLButtonElement;
const mediumButton     = document.getElementById("btn-medium")      as HTMLButtonElement;
const fastButton       = document.getElementById("btn-fast")        as HTMLButtonElement;
const algoMergeButton    = document.getElementById("btn-algo-merge")     as HTMLButtonElement;
const algoQuickButton    = document.getElementById("btn-algo-quick")     as HTMLButtonElement;
const catButton          = document.getElementById("btn-cat")             as HTMLButtonElement;

// --- SVG ---
const svg        = d3.select("#viz").append("svg");
const chartGroup = svg.append("g").attr("transform", `translate(${chartMargin.left},${chartMargin.top})`);
const bracketGroup   = chartGroup.append("g");
const pivotLineGroup = chartGroup.append("g");

const barColorScale = d3
  .scaleSequential()
  .interpolator(d3.interpolateRgb("#7ec8f5", "#f5e17e")); // pastel blue → yellow

// --- Sizing ---
function getChartDimensions() {
  return {
    width:  vizContainer.clientWidth  - chartMargin.left - chartMargin.right,
    height: vizContainer.clientHeight - chartMargin.top  - chartMargin.bottom,
  };
}

function syncSvgToContainer() {
  svg
    .attr("width",  vizContainer.clientWidth)
    .attr("height", vizContainer.clientHeight);
}

// --- Color helpers ---
function resolveBarColor(
  value: number,
  barIndex: number,
  comparingSet: Set<number>,
  swappingSet: Set<number>,
  breathSaturationBoost = 0,
  colorOverrides: Map<number, string> = new Map(),
  activeRange?: [number, number],
): string {
  if (colorOverrides.has(barIndex)) return colorOverrides.get(barIndex)!;
  if (swappingSet.has(barIndex))  return COLORS.swapping;
  if (comparingSet.has(barIndex)) return COLORS.comparing;

  const isOutsideActiveRange =
    activeRange !== undefined &&
    (barIndex < activeRange[0] || barIndex > activeRange[1]);

  if (isOutsideActiveRange) {
    const greyColor = d3.hsl(barColorScale(value));
    greyColor.s = 0;
    return greyColor.toString();
  }

  if (breathSaturationBoost === 0) return barColorScale(value);
  const hslColor = d3.hsl(barColorScale(value));
  hslColor.s = Math.max(0, Math.min(1, hslColor.s + breathSaturationBoost));
  return hslColor.toString();
}

// --- Rendering ---
function buildBarScale(barCount: number, chartWidth: number): d3.ScaleBand<string> {
  return d3
    .scaleBand(d3.range(barCount).map(String), [0, chartWidth])
    .padding(barCount > 100 ? 0.02 : 0.05);
}

function renderBracket(
  activeRange: [number, number] | undefined,
  barScale: d3.ScaleBand<string>,
  chartHeight: number,
) {
  bracketGroup.selectAll("*").remove();
  if (!activeRange) return;

  const [rangeStart, rangeEnd] = activeRange;
  const bracketLeft   = barScale(String(rangeStart))!;
  const bracketRight  = barScale(String(rangeEnd))! + barScale.bandwidth();
  const bracketTop    = chartHeight + 8;
  const tickHeight    = 6;
  const bracketBottom = bracketTop + tickHeight;

  bracketGroup
    .append("path")
    .attr("d", [
      `M${bracketLeft},${bracketTop}`,   `L${bracketLeft},${bracketBottom}`,
      `M${bracketLeft},${bracketBottom}`, `L${bracketRight},${bracketBottom}`,
      `M${bracketRight},${bracketTop}`,  `L${bracketRight},${bracketBottom}`,
    ].join(" "))
    .attr("stroke", COLORS.bracket)
    .attr("stroke-width", 1.5)
    .attr("fill", "none")
    .attr("stroke-linecap", "round");
}

function renderBars(
  arrayData: number[],
  comparingSet: Set<number>,
  swappingSet: Set<number>,
  breathSaturationBoost = 0,
  colorOverrides: Map<number, string> = new Map(),
  activeRange?: [number, number],
): { barScale: d3.ScaleBand<string>; chartHeight: number } {
  const { width, height } = getChartDimensions();
  const barCount  = arrayData.length;
  const barScale  = buildBarScale(barCount, width);
  const heightScale = d3.scaleLinear([0, barCount], [0, height]);

  chartGroup
    .selectAll<SVGRectElement, number>("rect")
    .data(arrayData)
    .join("rect")
    .attr("x",      (_value, barIndex) => barScale(String(barIndex))!)
    .attr("y",      (value) => height - heightScale(value))
    .attr("width",  barScale.bandwidth())
    .attr("height", (value) => heightScale(value))
    .attr("fill",   (value, barIndex) =>
      resolveBarColor(value, barIndex, comparingSet, swappingSet, breathSaturationBoost, colorOverrides, activeRange)
    )
    .attr("rx", 2);

  return { barScale, chartHeight: height };
}

function renderPivotLine(pivotValue: number | undefined, chartWidth: number, heightScale: d3.ScaleLinear<number, number>) {
  pivotLineGroup.selectAll("*").remove();
  if (pivotValue === undefined) return;

  const lineY = heightScale(pivotValue);
  pivotLineGroup
    .append("line")
    .attr("x1", 0)
    .attr("x2", chartWidth)
    .attr("y1", lineY)
    .attr("y2", lineY)
    .attr("stroke", COLORS.pivotLine)
    .attr("stroke-width", 3)
    .attr("stroke-dasharray", "10 4")
    .attr("opacity", 1);

  pivotLineGroup
    .append("text")
    .attr("x", 4)
    .attr("y", lineY - 5)
    .attr("text-anchor", "start")
    .attr("fill", COLORS.pivotLine)
    .attr("font-size", "11px")
    .attr("font-weight", "bold")
    .attr("letter-spacing", "0.05em")
    .text("PIVOT");

  pivotLineGroup.raise();
}

function renderFrame(frame: Frame) {
  lastFrameArray = frame.array;
  const comparingSet = new Set(frame.comparing ?? []);
  const swappingSet  = new Set(frame.swapping  ?? []);
  const { barScale, chartHeight } = renderBars(frame.array, comparingSet, swappingSet, 0, new Map(), frame.range);
  renderBracket(frame.range, barScale, chartHeight);

  const { width, height } = getChartDimensions();
  const heightScale = d3.scaleLinear([0, frame.array.length], [height, 0]);
  renderPivotLine(frame.pivotValue, width, heightScale);
}

function renderCurrentArray() {
  barColorScale.domain([1, itemCount]);
  renderFrame({ array: currentArray });
}

// --- Breathing ---
function stopBreathing() {
  isBreathing = false;
  if (breathAnimationFrameId !== null) {
    cancelAnimationFrame(breathAnimationFrameId);
    breathAnimationFrameId = null;
  }
}

function startBreathing() {
  stopBreathing();
  isBreathing = true;

  function breathStep(timestamp: number) {
    if (!isBreathing) return;
    const saturationBoost = BREATH_AMPLITUDE * Math.sin(timestamp / BREATH_PERIOD_MS);
    renderBars(lastFrameArray, new Set(), new Set(), saturationBoost);
    breathAnimationFrameId = requestAnimationFrame(breathStep);
  }

  breathAnimationFrameId = requestAnimationFrame(breathStep);
}

// --- Ripple ---
function clearRippleTimeouts() {
  for (const timeoutId of rippleTimeoutIds) clearTimeout(timeoutId);
  rippleTimeoutIds = [];
}

function triggerCompletionRipple(sortedArray: number[]) {
  clearRippleTimeouts();
  stopBreathing();
  bracketGroup.selectAll("*").remove();

  const barCount    = sortedArray.length;
  const centerIndex = Math.floor(barCount / 2);
  const maxStep     = centerIndex;
  const rippleColorMap = new Map<number, string>();

  for (let step = 0; step <= maxStep; step++) {
    const leftIndex  = centerIndex - step;
    const rightIndex = centerIndex + step;

    rippleTimeoutIds.push(setTimeout(() => {
      if (leftIndex >= 0) rippleColorMap.set(leftIndex, COLORS.ripple);
      if (rightIndex < barCount && rightIndex !== leftIndex) rippleColorMap.set(rightIndex, COLORS.ripple);

      renderBars(sortedArray, new Set(), new Set(), 0, rippleColorMap);

      if (step === maxStep) {
        rippleTimeoutIds = [];
        currentArray = sortedArray;
      }
    }, step * RIPPLE_STEP_DELAY_MS));
  }
}

// --- Playback ---
function syncSortButton() {
  if (isPlaying) {
    sortButton.innerHTML = ICONS.stop;
    sortButton.title = "Stop";
  } else {
    sortButton.innerHTML = ICONS.play;
    sortButton.title = sortGenerator ? "Resume" : "Sort";
  }
}

function clearAnimationTimer() {
  if (animationTimer) clearTimeout(animationTimer);
  animationTimer = null;
}

function advanceFrame() {
  if (!sortGenerator) return;
  const nextFrame = sortGenerator.next();

  if (nextFrame.done) {
    clearAnimationTimer();
    sortGenerator = null;
    isPlaying = false;
    sortGenerator = null;
    isPlaying = false;
    syncSortButton();
    triggerCompletionRipple(lastFrameArray);
    return;
  }

  renderFrame(nextFrame.value);
  animationTimer = setTimeout(advanceFrame, frameDelayMs);
}

function startSort() {
  stopBreathing();
  clearRippleTimeouts();
  sortGenerator = selectedAlgorithm([...currentArray]);
  isPlaying = true;
  syncSortButton();
  advanceFrame();
}

function pauseSort() {
  clearAnimationTimer();
  isPlaying = false;
  syncSortButton();
  startBreathing();
}

function resumeSort() {
  stopBreathing();
  isPlaying = true;
  syncSortButton();
  advanceFrame();
}

function resetSort() {
  clearAnimationTimer();
  clearRippleTimeouts();
  stopBreathing();
  sortGenerator = null;
  isPlaying = false;
  syncSortButton();
}

function stepOneFrame() {
  // If playing, pause first
  if (isPlaying) {
    clearAnimationTimer();
    isPlaying = false;
    syncSortButton();
  }

  // If no generator yet, initialise one (but don't start auto-playing)
  if (!sortGenerator) {
    stopBreathing();
    clearRippleTimeouts();
    sortGenerator = selectedAlgorithm([...currentArray]);
    syncSortButton();
  }

  // Always stop breathing — the stepped frame shows compare/swap highlights
  // which the breathing loop would immediately overwrite
  stopBreathing();

  const nextFrame = sortGenerator.next();
  if (nextFrame.done) {
    sortGenerator = null;
    isPlaying = false;
    syncSortButton();
    triggerCompletionRipple(lastFrameArray);
    return;
  }

  renderFrame(nextFrame.value);
}

// --- Shuffle ---
function shuffle() {
  resetSort();
  barColorScale.domain([1, itemCount]);
  currentArray = d3.shuffle(d3.range(1, itemCount + 1));
  renderCurrentArray();
  startBreathing();
}

// --- Cat mode ---
function enterCatMode() {
  resetSort();
  stopBreathing();
  clearRippleTimeouts();
  bracketGroup.selectAll("*").remove();
  pivotLineGroup.selectAll("*").remove();
  for (const algoButton of [algoMergeButton, algoQuickButton]) {
    algoButton.classList.remove("algo-active");
  }
  catButton.classList.add("cat-active");
  sortButton.disabled = true;
  stepButton.disabled = true;
  startCat(chartGroup, getChartDimensions, () => itemCount);
}

function exitCatMode() {
  if (!isCatMode()) return;
  stopCat();
  catButton.classList.remove("cat-active");
  sortButton.disabled = false;
  stepButton.disabled = false;
}

// --- Algorithm ---
function setAlgorithm(algorithm: Algorithm, activeButton: HTMLButtonElement) {
  exitCatMode();
  selectedAlgorithm = algorithm;
  for (const algoButton of [algoMergeButton, algoQuickButton]) {
    algoButton.classList.toggle("algo-active", algoButton === activeButton);
  }
  resetSort();
  renderCurrentArray();
}

// --- Speed ---
function setSpeed(delayMs: number, activeButton: HTMLButtonElement) {
  frameDelayMs = delayMs;
  for (const speedButton of [slowButton, mediumButton, fastButton]) {
    speedButton.classList.toggle("speed-active", speedButton === activeButton);
  }
}

// --- Events ---
sortButton.addEventListener("click", () => {
  if (!sortGenerator) startSort();
  else if (isPlaying) pauseSort();
  else resumeSort();
});

shuffleButton.addEventListener("click", shuffle);
stepButton.addEventListener("click", stepOneFrame);
algoMergeButton.addEventListener("click", () => setAlgorithm(mergeSort, algoMergeButton));
algoQuickButton.addEventListener("click",   () => setAlgorithm(quickSort,   algoQuickButton));
catButton.addEventListener("click", enterCatMode);

slowButton.addEventListener("click",   () => setSpeed(SPEED_DELAYS.slow,   slowButton));
mediumButton.addEventListener("click", () => setSpeed(SPEED_DELAYS.medium, mediumButton));
fastButton.addEventListener("click",   () => setSpeed(SPEED_DELAYS.fast,   fastButton));

sizeSlider.addEventListener("input", () => {
  itemCount = parseInt(sizeSlider.value);
  sizeLabel.textContent = String(itemCount);
});

sizeSlider.addEventListener("change", () => {
  if (isCatMode()) {
    startCat(chartGroup, getChartDimensions, () => itemCount);
  } else {
    shuffle();
  }
});

document.addEventListener("keydown", (keyEvent) => {
  if (keyEvent.code !== "Space") return;
  if (!sortGenerator) return; // sort hasn't started yet — ignore
  keyEvent.preventDefault();
  if (isPlaying) pauseSort();
  else resumeSort();
});

window.addEventListener("resize", () => {
  syncSvgToContainer();
  if (!isBreathing && !isPlaying) renderCurrentArray();
});

// --- Init ---
shuffleButton.innerHTML = ICONS.shuffle;
stepButton.innerHTML = ICONS.step;
syncSvgToContainer();
shuffle();
