import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/ops-api";
import { motion } from "framer-motion";
import { X, Save } from "lucide-react";
import { useToast } from "@/components/ops/ui/use-toast";

const SUMBER_OPTIONS = ["Website", "IG", "WA", "Meta ads"];

const formatRupiah = (value) => {
  if (!value) return '';
  const number = parseInt(value.toString().replace(/\D/g, ''));
  if (isNaN(number)) return '';
  return number.toLocaleString('id-ID');
};

const parseRupiah = (value) => parseInt(value.replace(/\D/g, '')) || 0;

export default function LeadFormModal({ isOpen, onClose, initialData = null, defaultDate }) {
  const isEdit = !!initialData;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ tanggal: '', jam: '', kontak: '', sumber: 'Website', status: 'belum_closing', nominal: 0, catatan: '' });
  const [displayNominal, setDisplayNominal] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          tanggal: initialData.tanggal || '',
          jam: initialData.jam || '',
          kontak: initialData.kontak || '',
          sumber: initialData.sumber || 'Website',
          status: initialData.status || 'belum_closing',
          nominal: initialData.nominal || 0,
          catatan: initialData.catatan || '',
        });
        setDisplayNominal(initialData.nominal ? formatRupiah(initialData.nominal) : '');
      } else {
        setForm({ tanggal: defaultDate || '', jam: '', kontak: '', sumber: 'Website', status: 'belum_closing', nominal: 0, catatan: '' });
        setDisplayNominal('');
      }
    }
  }, [isOpen, initialData, defaultDate]);

  const saveMutation = useMutation({
    mutationFn: (data) => isEdit
      ? base44.entities.Lead.update(initialData.id, data)
      : base44.entities.Lead.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      toast({
        title: isEdit ? "â Lead berhasil diupdate" : "â Lead berhasil ditambahkan",
        variant: "success",
      });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.tanggal || !form.kontak.trim()) return;
    saveMutation.mutate({
      tanggal: form.tanggal,
      jam: form.jam.trim(),
      kontak: form.kontak.trim(),
      sumber: form.sumber,
      status: form.status,
      nominal: form.status === 'closing' ? (form.nominal || 0) : 0,
      catatan: form.catatan.trim(),
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white dark:bg-[#1a1d28] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">
              {isEdit ? 'Edit Lead' : 'Tambah Lead Baru'}
            </h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Tutup">
              <X size={18} className="text-slate-500 dark:text-slate-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">Tanggal <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  value={form.tanggal}
                  onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">Jam</label>
                <input
                  type="text"
                  value={form.jam}
                  onChange={(e) => setForm({ ...form, jam: e.target.value })}
                  placeholder="10.00"
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">No HP / Username IG <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={form.kontak}
                onChange={(e) => setForm({ ...form, kontak: e.target.value })}
                placeholder="Contoh: 85892344482 atau @username"
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 text-sm font-semibold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">Sumber</label>
              <select
                value={form.sumber}
                onChange={(e) => setForm({ ...form, sumber: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 text-sm font-semibold text-slate-900 dark:text-white"
              >
                {SUMBER_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">Status</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, status: 'belum_closing' })}
                  className={`flex-1 px-4 py-2.5 rounded-lg border-2 text-sm font-bold transition-all ${
                    form.status === 'belum_closing'
                      ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-400 text-amber-700 dark:text-amber-300'
                      : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Belum Closing
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, status: 'closing' })}
                  className={`flex-1 px-4 py-2.5 rounded-lg border-2 text-sm font-bold transition-all ${
                    form.status === 'closing'
                      ? 'bg-green-50 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300'
                      : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Closing
                </button>
              </div>
            </div>

            {form.status === 'closing' && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">Nominal Transaksi</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-semibold text-sm">Rp</span>
                  <input
                    type="text"
                    value={displayNominal}
                    onChange={(e) => {
                      const numeric = parseRupiah(e.target.value);
                      setForm({ ...form, nominal: numeric });
                      setDisplayNominal(formatRupiah(numeric));
                    }}
                    placeholder="0"
                    className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900/30 text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">Catatan</label>
              <textarea
                value={form.catatan}
                onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                rows={2}
                placeholder="Catatan tambahan (opsional)"
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 text-sm font-medium text-slate-900 dark:text-white resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-5 py-2.5 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                <Save size={16} />
                {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </>
  );
}