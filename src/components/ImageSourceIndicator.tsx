
export type ImageSourceKind = "static" | "slots" | "secondary";
export const IMAGE_SOURCE_LABELS: Record<ImageSourceKind, string> = {
  static: "Front-page static artwork",
  slots: "Slots / panel selection",
  secondary: "Sequencer secondary artwork",
};
const COLORS: Record<ImageSourceKind, string> = { static: "#f59e0b", slots: "#22d3ee", secondary: "#a78bfa" };

export function ImageSourceDot({ kind, label = false }: { kind: ImageSourceKind; label?: boolean }) {
  return <span title={IMAGE_SOURCE_LABELS[kind]} aria-label={IMAGE_SOURCE_LABELS[kind]} className="inline-flex items-center gap-1 text-[10px] text-slate-300" data-image-source={kind}>
    <span aria-hidden="true" className="inline-block h-2 w-2 shrink-0 rounded-full ring-1 ring-black/60" style={{ backgroundColor: COLORS[kind] }} />
    {label && IMAGE_SOURCE_LABELS[kind]}
  </span>;
}

export function ImageSourceLegend() {
  return <div aria-label="Image source color legend" className="flex flex-wrap items-center gap-x-3 gap-y-1">
    <ImageSourceDot kind="static" label /><ImageSourceDot kind="slots" label /><ImageSourceDot kind="secondary" label />
  </div>;
}
