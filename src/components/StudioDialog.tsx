import { useEffect, useRef, type ReactNode } from "react";
import "./StudioEditors.css";

/** An accessible focus boundary for the imported full-screen studios. */
export function StudioDialog({ title, children }: { title: string; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    root.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !root.current) return;
      const controls = Array.from(root.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter((element) => element.getClientRects().length > 0 && !element.closest('[hidden]'));
      if (!controls.length) {
        event.preventDefault();
        root.current.focus();
        return;
      }
      const current = document.activeElement;
      if (event.shiftKey && (current === controls[0] || current === root.current || !root.current.contains(current))) {
        event.preventDefault();
        controls[controls.length - 1].focus();
      } else if (!event.shiftKey && (current === controls[controls.length - 1] || !root.current.contains(current))) {
        event.preventDefault();
        controls[0].focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  return <div ref={root} className="reeldeck-editor" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>{children}</div>;
}
