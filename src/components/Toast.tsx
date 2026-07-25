"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

interface ToastCtx {
  show: (msg: string) => void;
}

const ToastContext = createContext<ToastCtx>({ show: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState("");
  const [visible, setVisible] = useState(false);

  const show = useCallback((text: string) => {
    setMsg(text);
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none md:bottom-auto md:top-24">
        <AnimatePresence>
          {visible && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg pointer-events-auto"
              style={{ background: "var(--espresso)", color: "white", boxShadow: "0 8px 30px -8px rgba(42,33,27,.35)" }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--gold)" }}>
                <Check size={12} strokeWidth={3} color="white" />
              </div>
              <span className="text-[12px] font-ui font-medium whitespace-nowrap">{msg}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
