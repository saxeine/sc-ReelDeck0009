import React from "react";
import { useHoldRepeat } from "../utils/useHoldRepeat";

interface HoldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onAction: () => void;
  initialDelay?: number;
  repeatInterval?: number;
}

export const HoldButton: React.FC<HoldButtonProps> = ({
  onAction,
  initialDelay = 300,
  repeatInterval = 70,
  children,
  ...props
}) => {
  const bind = useHoldRepeat({
    onAction,
    initialDelay,
    repeatInterval,
  });

  return (
    <button
      type="button"
      {...props}
      {...bind}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {children}
    </button>
  );
};
