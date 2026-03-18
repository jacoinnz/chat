"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

// ── Context ──────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

const noop = () => {};
const noopCtx: ToastContextValue = {
  toast: noop,
  success: noop,
  error: noop,
  info: noop,
  warning: noop,
};

/** Safe to call outside ToastProvider — returns no-ops when no provider exists. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  return ctx ?? noopCtx;
}

// ── Single Toast Item ────────────────────────────────────────────────

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const styles: Record<ToastType, string> = {
  success: "bg-green-50 border-green-200 text-green-800",
  error: "bg-red-50 border-red-200 text-red-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
};

const iconStyles: Record<ToastType, string> = {
  success: "text-green-500",
  error: "text-red-500",
  info: "text-blue-500",
  warning: "text-amber-500",
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const Icon = icons[toast.type];

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 200);
    }, toast.duration);
    return () => clearTimeout(timerRef.current);
  }, [toast.id, toast.duration, onDismiss]);

  const handleDismiss = () => {
    clearTimeout(timerRef.current);
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 200);
  };

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-sm transition-all duration-200 ${
        styles[toast.type]
      } ${exiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}`}
      style={{ animation: exiting ? undefined : "slideIn 0.2s ease-out" }}
    >
      <Icon size={18} className={`mt-0.5 shrink-0 ${iconStyles[toast.type]}`} />
      <p className="text-sm flex-1">{toast.message}</p>
      <button
        onClick={handleDismiss}
        className="shrink-0 p-0.5 rounded hover:bg-black/5"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ── Provider ─────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, duration = 4000) => {
      const id = `toast-${++counterRef.current}`;
      setToasts((prev) => [...prev.slice(-4), { id, type, message, duration }]);
    },
    []
  );

  const value: ToastContextValue = {
    toast: addToast,
    success: useCallback((msg, dur) => addToast("success", msg, dur), [addToast]),
    error: useCallback((msg, dur) => addToast("error", msg, dur), [addToast]),
    info: useCallback((msg, dur) => addToast("info", msg, dur), [addToast]),
    warning: useCallback((msg, dur) => addToast("warning", msg, dur), [addToast]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container — fixed top-right */}
      {toasts.length > 0 && (
        <div
          className="fixed top-4 right-4 z-[100] flex flex-col gap-2"
          aria-live="polite"
        >
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
