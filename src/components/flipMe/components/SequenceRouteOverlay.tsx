import { useId } from "react";
import { sequenceSegments } from "../utils/sequenceRoute";

interface RouteRegion {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  active?: boolean;
}

/** Shared exported route, drawn over the sequencer's actual grid region centers. */
export function SequenceRouteOverlay({ path, columns, regions, currentStep, playing }: {
  path: number[];
  columns: number;
  regions: Map<number, RouteRegion>;
  currentStep: number;
  playing: boolean;
}) {
  const arrowId = `flip-route-${useId().replace(/:/g, "")}`;
  const points = path.flatMap((slot) => {
    const region = regions.get(slot);
    if (!region || region.active === false) return [];
    return [{ slot, x: region.col + region.colSpan / 2, y: region.row + region.rowSpan / 2 }];
  });
  if (points.length < 2) return null;
  const segments = sequenceSegments(points);
  const leader = points[currentStep - 1];
  return (
    <svg aria-label="flipMe sequence route; red dashed segments are return visits" role="img" className="pointer-events-none absolute inset-0 z-20 h-full w-full" viewBox={`0 0 ${columns} ${columns}`} preserveAspectRatio="none">
      <defs>
        <marker id={arrowId} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="0.132" markerHeight="0.132" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#22d3ee" />
        </marker>
      </defs>
      {segments.map(({ from, to, returning, index }) => (
        <line key={index} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
          stroke={returning ? "#ef4444" : "#22d3ee"} strokeWidth="0.055" strokeLinecap="round"
          strokeDasharray={returning ? "0.12 0.09" : undefined}
          markerEnd={index === points.length - 1 ? `url(#${arrowId})` : undefined}
          data-return-visit={returning || undefined}
        />
      ))}
      {playing && leader && <circle cx={leader.x} cy={leader.y} r="0.09" fill="#34d399" stroke="#ecfdf5" strokeWidth="0.025" />}
    </svg>
  );
}
