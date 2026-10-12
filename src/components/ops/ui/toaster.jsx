import { AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ops/ui/use-toast";
import { Toast } from "@/components/ops/ui/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onClose={dismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}