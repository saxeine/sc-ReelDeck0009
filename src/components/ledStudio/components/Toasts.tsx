import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import type { ToastKind, ToastMsg } from '../types';
import { cn } from '../utils/cn';

const ICONS = {
  success: CheckCircle2,
  info: Info,
  error: AlertTriangle,
};

const STYLES: Record<ToastKind, string> = {
  success: 'border-led-lime/50 text-led-lime',
  info: 'border-cyan-500/50 text-cyan-100',
  error: 'border-rose-500/50 text-rose-200',
};

const ICON_STYLES: Record<ToastKind, string> = {
  success: 'text-led-lime',
  info: 'text-cyan-400',
  error: 'text-rose-400',
};

export function Toasts({ items }: { items: ToastMsg[] }) {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence>
        {items.map((t) => {
          const Icon = ICONS[t.kind] ?? Info;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 22, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 480, damping: 32 }}
              className={cn(
                'glass border rounded-xl px-3.5 py-2 flex items-center gap-2 text-[11px] font-semibold shadow-[0_18px_40px_#0009]',
                STYLES[t.kind]
              )}
            >
              <Icon className={cn('w-3.5 h-3.5 shrink-0', ICON_STYLES[t.kind])} />
              {t.text}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
