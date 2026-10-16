import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export default function ConfirmDeleteModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Yakin ingin menghapus transaksi ini?",
  itemName,
  /** Keterangan tambahan (opsional) — mis. peringatan bahwa resi J&T ikut dibatalkan. */
  message,
  /** Label tombol konfirmasi; default tetap "Oke" supaya pemanggil lama tidak berubah. */
  confirmLabel = "Oke",
  /** Teks saat proses berjalan; default sama seperti sebelumnya. */
  busyLabel = "Menghapus...",
  isDeleting = false
}) {
  // ESC key handler
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[9998]"
        onClick={onClose}
      />

      {/* Modal - COMPACT & SIMPLE */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-[380px] p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon & Title */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mb-3">
              <AlertTriangle size={28} className="text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {title}
            </h3>
            {itemName && (
              <p className="text-sm text-gray-600 mt-2">
                {itemName}
              </p>
            )}
            {message ? (
              <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-3 text-left">
                {message}
              </p>
            ) : null}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isDeleting ? busyLabel : confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}