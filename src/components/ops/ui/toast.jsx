import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Trash2 } from "lucide-react";

export function Toast({ toast, onClose }) {
  const variants = {
    success: {
      bg: "bg-green-50 border-green-200",
      icon: <CheckCircle size={20} className="text-green-600" />,
      titleColor: "text-green-900",
      descColor: "text-green-700"
    },
    destructive: {
      bg: "bg-red-50 border-red-200",
      icon: <Trash2 size={20} className="text-red-600" />,
      titleColor: "text-red-900",
      descColor: "text-red-700"
    },
    default: {
      bg: "bg-white border-gray-200",
      icon: <AlertCircle size={20} className="text-blue-600" />,
      titleColor: "text-gray-900",
      descColor: "text-gray-700"
    }
  };

  const variant = variants[toast.variant || 'default'];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={`${variant.bg} border-2 rounded-xl shadow-lg p-4 flex items-start gap-3 min-w-[320px] max-w-[420px]`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {variant.icon}
      </div>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className={`font-bold text-sm ${variant.titleColor} mb-1`}>
            {toast.title}
          </p>
        )}
        {toast.description && (
          <p className={`text-sm ${variant.descColor}`}>
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 p-1 hover:bg-black/5 rounded-lg transition-colors"
      >
        <X size={16} className="text-gray-400" />
      </button>
    </motion.div>
  );
}