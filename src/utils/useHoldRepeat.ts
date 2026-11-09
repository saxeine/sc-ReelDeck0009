import React, { useRef, useCallback } from "react";

export interface HoldRepeatOptions {
  onAction: () => void;
  initialDelay?: number;
  repeatInterval?: number;
}

export function useHoldRepeat({ onAction, initialDelay = 300, repeatInterval = 70 }: HoldRepeatOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const actionRef = useRef(onAction);
  actionRef.current = onAction;

  const stop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ("button" in e && e.button !== 0) return;
    
    stop();
    actionRef.current();

    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        actionRef.current();
      }, repeatInterval);
    }, initialDelay);
  }, [initialDelay, repeatInterval, stop]);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
    onTouchCancel: stop,
  };
}
