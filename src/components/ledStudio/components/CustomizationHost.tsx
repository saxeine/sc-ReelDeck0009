import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Wand2 } from 'lucide-react';

/**
 * Alt+Click any control to re-skin it. Cycles the clicked control through a
 * hue rotation so the deck can be personalised on the fly.
 */
export function CustomizationHost() {
  const hues = useRef(new WeakMap<HTMLElement, number>());
  const [hint, setHint] = useState<{ x: number; y: number; key: number; label: string } | null>(null);

  useEffect(() => {
    let timer = 0;
    const onClick = (e: MouseEvent) => {
      if (!e.altKey) return;
      const el = (e.target as HTMLElement)?.closest?.('button, a, [data-cz]') as HTMLElement | null;
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      const next = ((hues.current.get(el) ?? 0) + 45) % 360;
      hues.current.set(el, next);
      el.style.filter = next === 0 ? '' : `hue-rotate(${next}deg) saturate(1.3)`;
      el.style.transition = 'filter 300ms ease';
      setHint({
        x: Math.min(e.clientX + 12, window.innerWidth - 190),
        y: Math.max(e.clientY - 34, 8),
        key: Date.now(),
        label: next === 0 ? 'skin reset' : `hue ${next}°`,
      });
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setHint(null), 1400);
    };
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <AnimatePresence>
      {hint && (
        <motion.div
          key={hint.key}
          initial={{ opacity: 0, y: 6, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="fixed z-[80] pointer-events-none glass border border-fuchsia-500/40 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-[10px] font-mono text-fuchsia-200 shadow-[0_0_24px_rgba(217,70,239,0.25)]"
          style={{ left: hint.x, top: hint.y }}
        >
          <Wand2 className="w-3 h-3 text-fuchsia-400" />
          re-skinned · {hint.label}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
