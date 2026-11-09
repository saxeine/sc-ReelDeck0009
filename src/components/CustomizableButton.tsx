import React, { forwardRef } from "react";
import { cn } from "../utils/cn";

/**
 * Compatibility adapter for the editors' customizable controls. ReelDeck does
 * not include the source app's global UI-customization service, so controls
 * render their supplied defaults instead.
 */
interface CustomizableButtonProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  buttonId: string;
  defaultLabel?: string;
  defaultIcon?: React.ReactNode;
  iconClassName?: string;
  labelClassName?: string;
  badge?: React.ReactNode;
  showLabelAlways?: boolean;
  forceZeroText?: boolean;
  lockIconOnly?: boolean;
  disableGlow?: boolean;
  as?: "button" | "label" | "div" | "span";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onContextMenuCustom?: (e: React.MouseEvent) => void;
  children?: React.ReactNode | ((props: { label: string; isTextHidden: boolean; config: undefined }) => React.ReactNode);
}

export const CustomizableButton = forwardRef<HTMLElement, CustomizableButtonProps>(function CustomizableButton(
  {
    buttonId, defaultLabel = "", defaultIcon, labelClassName, badge,
    forceZeroText = false, lockIconOnly = false, as: Component = "button", type = "button",
    disabled, children, className, title, iconClassName: _iconClassName,
    showLabelAlways: _showLabelAlways, disableGlow: _disableGlow, onContextMenuCustom,
    ...rest
  },
  ref
) {
  const isTextHidden = forceZeroText || lockIconOnly;
  const content = typeof children === "function"
    ? children({ label: defaultLabel, isTextHidden, config: undefined })
    : <>{!isTextHidden && defaultLabel && <span className={cn("truncate whitespace-nowrap", labelClassName)}>{defaultLabel}</span>}{children}</>;
  const attributes = {
    ...rest,
    ref: ref as any,
    id: rest.id || buttonId,
    "data-editor-control": buttonId,
    className: cn("transition-all flex items-center justify-center select-none", className),
    title,
    // Icon-only controls need a name even when their tooltip is missing.
    "aria-label": rest["aria-label"] || (isTextHidden || (!defaultLabel && !children) ? (title || defaultLabel || buttonId.replace(/_/g, " ")) : undefined),
    onContextMenu: onContextMenuCustom || rest.onContextMenu,
    ...(Component === "button" ? { type, disabled } : {}),
  };
  return <Component {...attributes}>{defaultIcon}{content}{badge}</Component>;
});
