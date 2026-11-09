/** One initial visit plus up to two returns; stationary pointer events add no steps. */
export function appendSequenceVisit(sequence: number[], slot: number): number[] {
  if (sequence[sequence.length - 1] === slot || sequence.filter((point) => point === slot).length >= 3) return sequence;
  return [...sequence, slot];
}

export function sequenceSegments<T extends { slot: number; x: number; y: number }>(points: T[]) {
  const visited = new Set<number>();
  return points.flatMap((point, index) => {
    const returning = visited.has(point.slot);
    visited.add(point.slot);
    return index === 0 ? [] : [{ from: points[index - 1], to: point, returning, index }];
  });
}
