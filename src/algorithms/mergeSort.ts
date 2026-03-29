import type { Frame, Algorithm } from "./types";

export const mergeSort: Algorithm = function* (input) {
  const frames: Frame[] = [];
  const workingArray = [...input];

  function mergeHalves(startIndex: number, midIndex: number, endIndex: number) {
    const activeRange: [number, number] = [startIndex, endIndex];
    const leftHalf = workingArray.slice(startIndex, midIndex + 1);
    const rightHalf = workingArray.slice(midIndex + 1, endIndex + 1);

    let leftPointer = 0;
    let rightPointer = 0;
    let writeIndex = startIndex;

    // Pick the smaller of the two candidates and place it
    while (leftPointer < leftHalf.length && rightPointer < rightHalf.length) {
      const leftSourceIndex = startIndex + leftPointer;
      const rightSourceIndex = midIndex + 1 + rightPointer;

      frames.push({ array: [...workingArray], comparing: [leftSourceIndex, rightSourceIndex], range: activeRange });

      if (leftHalf[leftPointer] <= rightHalf[rightPointer]) {
        workingArray[writeIndex] = leftHalf[leftPointer++];
      } else {
        workingArray[writeIndex] = rightHalf[rightPointer++];
      }
      frames.push({ array: [...workingArray], swapping: [writeIndex], range: activeRange });
      writeIndex++;
    }

    // Drain any remaining elements from the left half
    while (leftPointer < leftHalf.length) {
      workingArray[writeIndex] = leftHalf[leftPointer++];
      frames.push({ array: [...workingArray], swapping: [writeIndex], range: activeRange });
      writeIndex++;
    }

    // Drain any remaining elements from the right half
    while (rightPointer < rightHalf.length) {
      workingArray[writeIndex] = rightHalf[rightPointer++];
      frames.push({ array: [...workingArray], swapping: [writeIndex], range: activeRange });
      writeIndex++;
    }
  }

  function sortRegion(startIndex: number, endIndex: number) {
    if (startIndex >= endIndex) return;
    const midIndex = Math.floor((startIndex + endIndex) / 2);
    sortRegion(startIndex, midIndex);
    sortRegion(midIndex + 1, endIndex);
    mergeHalves(startIndex, midIndex, endIndex);
  }

  sortRegion(0, workingArray.length - 1);
  frames.push({ array: [...workingArray] });

  yield* frames;
};
