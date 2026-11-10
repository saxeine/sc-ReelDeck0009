import React, { forwardRef } from "react";
import { cn } from "../utils/cn";

/** Default-label adapter; its rendered text can be edited with the global IBC customiser. */
interface CustomizableLabelProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  labelId: string;
  htmlFor?: string;
  defaultLabel?: string;
  defaultText?: string;
  defaultIcon?: React.ReactNode;
  iconClassName?: string;
  labelClassName?: string;
  badge?: React.ReactNode;
  showIconAlways?: boolean;
  showLabelAlways?: boolean;
  as?: "div" | "span" | "h1" | "h2" | "h3" | "h4" | "label" | "p";
  onContextMenuCustom?: (e: React.MouseEvent) => void;
  children?: React.ReactNode | ((props: { label: string; isTextHidden: boolean; config: undefined }) => React.ReactNode);
}

export const CustomizableLabel = forwardRef<HTMLElement, CustomizableLabelProps>(function CustomizableLabel(
  {
    labelId, defaultLabel, defaultText, defaultIcon, labelClassName, badge, as: Component = "div",
    children, className, iconClassName: _iconClassName, showIconAlways: _showIconAlways,
    showLabelAlways: _showLabelAlways, onContextMenuCustom, ...rest
  },
  ref
) {
  const label = defaultLabel || defaultText || "";
  const content = typeof children === "function"
    ? children({ label, isTextHidden: false, config: undefined })
    : <>{label && <span className={cn("truncate", labelClassName)}>{label}</span>}{children}</>;
  return (
    <Component {...rest} ref={ref as any} id={rest.id || labelId} data-editor-label={labelId}
      className={cn("inline-flex items-center gap-1.5 select-none", className)}
      onContextMenu={onContextMenuCustom || rest.onContextMenu}>
      {defaultIcon}{content}{badge}
    </Component>
  );
});
