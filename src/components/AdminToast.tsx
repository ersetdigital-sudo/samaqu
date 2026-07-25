"use client";

import { useState, useCallback, createContext, useContext, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, X } from "lucide-react";

interface Toast {
  id: string;
  type: "success" | "error";
  message: string;
}

interface ToastContextValue {
  showToast: (type: "success" | "error", message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container - top right */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: "380px" }}>
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg"
              style={{
                background: toast.type === "success" ? "#f0faf0" : "#fef2f2",
                border: `1px solid ${toast.type === "success" ? "rgba(34,197,94,.2)" : "rgba(239,68,68,.2)"}`,
              }}
            >
              {toast.type === "success" ? (
                <CheckCircle size={18} className="shrink-0 mt-0.5" style={{ color: "#22c55e" }} />
              ) : (
                <XCircle size={18} className="shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
              )}
              <p className="flex-1 text-sm font-medium" style={{ color: toast.type === "success" ? "#166534" : "#991b1b" }}>
                {toast.message}
              </p>
              <button onClick={() => removeToast(toast.id)} className="shrink-0 p-0.5 rounded hover:opacity-60 transition-opacity">
                <X size={14} style={{ color: toast.type === "success" ? "#166534" : "#991b1b" }} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
