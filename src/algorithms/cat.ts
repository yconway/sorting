import * as d3 from "d3"

// Waypoints defining the cat silhouette: [normalizedX (0–1), normalizedHeight (0–1)]
// Right half is the original tail/rump section. Left half is that right half mirrored.
const CAT_WAYPOINTS: [number, number][] = [
	[0.0, 0.5], // mirror of tail end
	[0.03, 0.68],
	[0.055, 0.83],
	[0.085, 0.9], // LEFT EAR TIP (mirror of tail tip)
	[0.12, 0.85],
	[0.16, 0.72],
	[0.21, 0.54],
	[0.26, 0.37], // left dip (mirror of tail base)
	[0.3, 0.5],
	[0.36, 0.55],
	[0.45, 0.58],
	[0.5, 0.58], // center
	[0.55, 0.58],
	[0.64, 0.55],
	[0.7, 0.5],
	[0.74, 0.37], // right dip (tail base)
	[0.79, 0.54],
	[0.84, 0.72],
	[0.88, 0.85],
	[0.915, 0.9], // RIGHT EAR TIP (tail tip)
	[0.945, 0.83],
	[0.97, 0.68],
	[1.0, 0.5], // tail end
]

const FLOAT_AMPLITUDE = 0.03 // fraction of barCount — how much bars bob
const FLOAT_PERIOD_MS = 3200 // full wave cycle duration
const FLOAT_PHASE_STEP = 0.1 // radians per bar → wave propagates left→right

const catColorScale = d3
	.scaleSequential()
	.interpolator(d3.interpolateRgb("#c87530", "#f5d090")) // burnt orange → warm wheat

type ChartGroup = d3.Selection<SVGGElement, unknown, d3.BaseType, unknown>

let isActive = false
let floatFrameId: number | null = null
let baseHeights: number[] = []

function sampleCatHeight(normalizedX: number): number {
	for (
		let waypointIndex = 0;
		waypointIndex < CAT_WAYPOINTS.length - 1;
		waypointIndex++
	) {
		const [leftX, leftY] = CAT_WAYPOINTS[waypointIndex]
		const [rightX, rightY] = CAT_WAYPOINTS[waypointIndex + 1]
		if (normalizedX >= leftX && normalizedX <= rightX) {
			const interpolationT = (normalizedX - leftX) / (rightX - leftX)
			return leftY + interpolationT * (rightY - leftY)
		}
	}
	return CAT_WAYPOINTS[CAT_WAYPOINTS.length - 1][1]
}

function generateBaseHeights(barCount: number): number[] {
	return Array.from({ length: barCount }, (_value, barIndex) => {
		const normalizedX = barIndex / Math.max(barCount - 1, 1)
		return sampleCatHeight(normalizedX) * barCount
	})
}

function renderCatBars(
	chartGroup: ChartGroup,
	heights: number[],
	chartWidth: number,
	chartHeight: number,
): void {
	const barCount = heights.length
	const barScale = d3
		.scaleBand(d3.range(barCount).map(String), [0, chartWidth])
		.padding(barCount > 100 ? 0.02 : 0.05)
	const heightScale = d3.scaleLinear([0, barCount], [0, chartHeight])

	catColorScale.domain([0, barCount])

	chartGroup
		.selectAll<SVGRectElement, number>("rect")
		.data(heights)
		.join("rect")
		.attr("x", (_height, barIndex) => barScale(String(barIndex))!)
		.attr("y", (height) => chartHeight - heightScale(height))
		.attr("width", barScale.bandwidth())
		.attr("height", (height) => heightScale(height))
		.attr("fill", (height) => catColorScale(height))
		.attr("rx", 2)
}

export function isCatMode(): boolean {
	return isActive
}

export function startCat(
	chartGroup: ChartGroup,
	getDimensions: () => { width: number; height: number },
	getItemCount: () => number,
): void {
	stopCat()
	isActive = true
	baseHeights = generateBaseHeights(getItemCount())

	function floatFrame(timestamp: number) {
		if (!isActive) return
		const itemCount = getItemCount()
		const floatAmplitude = FLOAT_AMPLITUDE * itemCount
		const { width, height } = getDimensions()

		const floatedHeights = baseHeights.map((baseHeight, barIndex) => {
			const phase =
				(timestamp / FLOAT_PERIOD_MS) * Math.PI * 2 +
				barIndex * FLOAT_PHASE_STEP
			return Math.max(
				0.01 * itemCount,
				baseHeight + floatAmplitude * Math.sin(phase),
			)
		})

		renderCatBars(chartGroup, floatedHeights, width, height)
		floatFrameId = requestAnimationFrame(floatFrame)
	}

	floatFrameId = requestAnimationFrame(floatFrame)
}

export function stopCat(): void {
	isActive = false
	if (floatFrameId !== null) {
		cancelAnimationFrame(floatFrameId)
		floatFrameId = null
	}
}
