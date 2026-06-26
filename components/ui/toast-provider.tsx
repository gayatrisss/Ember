"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Toast, type ToastIntent } from "@/components/ui/toast";

export type ToastOptions = {
  intent?: ToastIntent;
  title: string;
  description?: string;
  icon?: ReactNode;
  duration?: number; // ms; pass 0 to disable auto-dismiss
};

type ToastItem = ToastOptions & { id: string };

type ToastContextValue = {
  toast: (opts: ToastOptions) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

// Fire a toast from anywhere: const { toast } = useToast(); toast({ intent, title, ... }).
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const DEFAULT_DURATION = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (opts: ToastOptions) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, ...opts }]);
      const duration = opts.duration ?? DEFAULT_DURATION;
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// Renders the stack in a portal at the top-right of the viewport (portal so fixed
// positioning isn't trapped by transformed ancestors like the animated booking panel).
function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  // Render the portal only on the client (document.body isn't available during SSR),
  // without setting state in an effect.
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  if (!isClient) return null;

  return createPortal(
    <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-[var(--container-toast)] z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="w-full pointer-events-auto"
          >
            <Toast
              intent={t.intent}
              title={t.title}
              description={t.description}
              icon={t.icon}
              onDismiss={() => onDismiss(t.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}
