import type { Frame, Algorithm } from "./types"

export const quickSort: Algorithm = function* (input) {
	const frames: Frame[] = []
	const workingArray = [...input]

	function partition(startIndex: number, endIndex: number): number {
		// Random pivot selection avoids O(n²) on sorted/reverse-sorted input.
		// Swap silently (no frame) so the visualization isn't interrupted by a setup step.
		const randomIndex =
			startIndex + Math.floor(Math.random() * (endIndex - startIndex + 1))
		if (randomIndex !== endIndex) {
			const swapTemp = workingArray[randomIndex]
			workingArray[randomIndex] = workingArray[endIndex]
			workingArray[endIndex] = swapTemp
		}

		const pivotIndex = endIndex
		const pivotValue = workingArray[pivotIndex]
		let wallIndex = startIndex - 1

		for (let scanIndex = startIndex; scanIndex < endIndex; scanIndex++) {
			// Show current element being compared against the pivot
			frames.push({
				array: [...workingArray],
				comparing: [scanIndex, pivotIndex],
				range: [startIndex, endIndex],
				pivotValue,
			})

			if (workingArray[scanIndex] <= pivotValue) {
				wallIndex++
				if (wallIndex !== scanIndex) {
					const swapTemp = workingArray[wallIndex]
					workingArray[wallIndex] = workingArray[scanIndex]
					workingArray[scanIndex] = swapTemp
					frames.push({
						array: [...workingArray],
						swapping: [wallIndex, scanIndex],
						range: [startIndex, endIndex],
						pivotValue,
					})
				}
			}
		}

		// Place pivot at its final sorted position
		const pivotFinalIndex = wallIndex + 1
		if (pivotFinalIndex !== pivotIndex) {
			const swapTemp = workingArray[pivotFinalIndex]
			workingArray[pivotFinalIndex] = workingArray[pivotIndex]
			workingArray[pivotIndex] = swapTemp
			frames.push({
				array: [...workingArray],
				swapping: [pivotFinalIndex, pivotIndex],
				range: [startIndex, endIndex],
				pivotValue,
			})
		}

		return pivotFinalIndex
	}

	function sortRegion(startIndex: number, endIndex: number) {
		if (startIndex >= endIndex) return
		const pivotFinalIndex = partition(startIndex, endIndex)
		sortRegion(startIndex, pivotFinalIndex - 1)
		sortRegion(pivotFinalIndex + 1, endIndex)
	}

	sortRegion(0, workingArray.length - 1)
	frames.push({ array: [...workingArray] })

	yield* frames
}

export const quickSortArray = function (unsorted: number[]): number[] {
	// pick random pivot
	const pivotIndex = Math.floor(Math.random() * unsorted.length)
	const pivot = unsorted[pivotIndex]

	//swap pivot with last element, since it's for sure in the "big" half
	unsorted[pivotIndex] = unsorted[unsorted.length - 1]
	unsorted[unsorted.length - 1] = pivot

	const underPivot = []
	const overPivot = []
	for (let index = 0; index < unsorted.length - 1; index++) {
		if (unsorted[index] < pivot) {
			underPivot.push(unsorted[index])
		} else {
			overPivot.push(unsorted[index])
		}
	}
	return [...quickSortArray(underPivot), pivot, ...quickSortArray(overPivot)]
}
