import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import { Icon } from "./Icon";

/* ---------------- buttons ---------------- */

type BtnProps = {
  children?: ReactNode;
  icon?: string;
  variant?: "solid" | "outline" | "ghost" | "danger" | "cool";
  size?: "xs" | "sm" | "md";
  active?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Btn({
  children,
  icon,
  variant = "outline",
  size = "sm",
  active,
  className,
  ...rest
}: BtnProps) {
  const sizes = {
    xs: "h-7 px-2 text-[11px] gap-1.5",
    sm: "h-8 px-3 text-[12px] gap-1.5",
    md: "h-10 px-4 text-[13px] gap-2",
  }[size];
  const variants = {
    solid:
      "bg-gradient-to-b from-amber to-ember text-ink-950 border border-amber/60 shadow-[0_2px_14px_-2px_rgba(255,140,26,0.55)] hover:brightness-110 font-semibold",
    outline:
      "bg-ink-700/70 text-bone border border-line hover:border-amber/70 hover:bg-ink-600 hover:text-amber",
    ghost: "text-mute hover:text-bone hover:bg-ink-700/80 border border-transparent",
    danger:
      "bg-danger/12 text-danger border border-danger/40 hover:bg-danger/22 hover:border-danger",
    cool: "bg-cyan/12 text-cyan border border-cyan/40 hover:bg-cyan/22 hover:border-cyan",
  }[variant];
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-[5px] font-medium tracking-wide",
        "transition-all duration-150 active:scale-[0.97] focus-ring select-none",
        "disabled:opacity-35 disabled:pointer-events-none whitespace-nowrap",
        sizes,
        variants,
        active && "!border-amber !text-amber !bg-amber/15",
        className
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === "md" ? 16 : 14} />}
      {children}
    </button>
  );
}

export function IconBtn({
  icon,
  label,
  active,
  tone = "default",
  size = 30,
  className,
  ...rest
}: {
  icon: string;
  label: string;
  active?: boolean;
  tone?: "default" | "danger" | "cool" | "accent";
  size?: number;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const tones = {
    default: "text-mute hover:text-bone hover:border-line",
    danger: "text-mute hover:text-danger hover:border-danger/60 hover:bg-danger/10",
    cool: "text-mute hover:text-cyan hover:border-cyan/60 hover:bg-cyan/10",
    accent: "text-mute hover:text-amber hover:border-amber/60 hover:bg-amber/10",
  }[tone];
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[5px] border border-transparent",
        "transition-all duration-150 active:scale-90 focus-ring",
        "disabled:opacity-30 disabled:pointer-events-none",
        tones,
        active && "!text-amber !border-amber/60 !bg-amber/15",
        className
      )}
      {...rest}
    >
      <Icon name={icon} size={Math.round(size * 0.53)} />
    </button>
  );
}

/* ---------------- form controls ---------------- */

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  hint?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block group" title={hint}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="tk text-mute group-hover:text-bone transition-colors">
          {label}
        </span>
        <span className="font-mono text-[11px] text-amber tabular-nums">
          {Number.isInteger(value) ? value : value.toFixed(2)}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--pct" as string]: `${pct}%` }}
        className="focus-ring"
      />
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      title={hint}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-[5px] border px-2 py-1.5 text-left",
        "transition-all duration-150 focus-ring group",
        checked
          ? "border-amber/40 bg-amber/10"
          : "border-ink-600 bg-ink-800/60 hover:border-line"
      )}
    >
      <span
        className={cn(
          "text-[11px] tracking-wide transition-colors",
          checked ? "text-amber" : "text-mute group-hover:text-bone"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "relative h-[14px] w-[26px] shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-amber/70" : "bg-ink-500"
        )}
      >
        <span
          className={cn(
            "absolute top-[2px] h-[10px] w-[10px] rounded-full bg-bone transition-all duration-200",
            checked ? "left-[14px] shadow-[0_0_8px_rgba(255,171,31,0.9)]" : "left-[2px]"
          )}
        />
      </span>
    </button>
  );
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
  size = "sm",
}: {
  options: { value: T; label: string; title?: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: "xs" | "sm";
}) {
  return (
    <div className="inline-flex rounded-[5px] border border-ink-600 bg-ink-850 p-[2px]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title ?? o.label}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-[3px] font-medium tracking-wide transition-all duration-150 focus-ring",
            size === "xs" ? "px-2 py-[3px] text-[10px]" : "px-2.5 py-1 text-[11px]",
            value === o.value
              ? "bg-gradient-to-b from-amber to-ember text-ink-950 shadow-[0_1px_8px_-1px_rgba(255,140,26,0.6)]"
              : "text-mute hover:text-bone"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label && <span className="tk mb-1 block text-mute">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-8 w-full rounded-[5px] border border-ink-600 bg-ink-850 pl-2 pr-6 text-[12px] text-bone transition-colors hover:border-line focus:border-amber focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TextInput({
  label,
  className,
  ...rest
}: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("block", className)}>
      {label && <span className="tk mb-1 block text-mute">{label}</span>}
      <input
        {...rest}
        className="h-8 w-full rounded-[5px] border border-ink-600 bg-ink-850 px-2 text-[12px] text-bone transition-colors placeholder:text-dim hover:border-line focus:border-amber focus:outline-none"
      />
    </label>
  );
}

export function SectionTitle({
  children,
  right,
  hue = "#ffab1f",
}: {
  children: ReactNode;
  right?: ReactNode;
  hue?: string;
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span
          className="h-[11px] w-[3px] rounded-full"
          style={{ background: hue, boxShadow: `0 0 8px ${hue}` }}
        />
        <h3 className="tk text-bone">{children}</h3>
      </div>
      {right}
    </div>
  );
}

export function Chip({
  children,
  color = "#a5948a",
  onClick,
  active,
  title,
}: {
  children: ReactNode;
  color?: string;
  onClick?: () => void;
  active?: boolean;
  title?: string;
}) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-[2px] font-mono text-[10px] uppercase tracking-[0.12em] transition-all duration-150",
        onClick && "hover:brightness-125 active:scale-95 cursor-pointer"
      )}
      style={{
        color,
        borderColor: `${color}55`,
        background: active ? `${color}26` : `${color}12`,
      }}
    >
      {children}
    </Tag>
  );
}

export function Empty({
  icon = "image",
  title,
  body,
  action,
}: {
  icon?: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line/70 bg-ink-850/50 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-ink-800 text-amber">
        <Icon name={icon} size={22} />
      </span>
      <h4 className="display text-2xl text-bone">{title}</h4>
      <p className="max-w-sm text-[12px] leading-relaxed text-mute">{body}</p>
      {action}
    </div>
  );
}
