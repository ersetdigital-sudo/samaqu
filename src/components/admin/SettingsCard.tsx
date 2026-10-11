"use client";

import { ReactNode } from "react";
import { Edit, Loader2 } from "lucide-react";

/**
 * Kartu pengaturan admin dengan pola "lihat dulu, klik Edit untuk mengubah".
 *
 * - `editing = false` (default): anak-anaknya menampilkan nilainya sebagai teks
 *   read-only dan footer hanya berisi tombol **Edit** — tampilan yang lebih rapi
 *   daripada deretan input yang selalu bisa diketik.
 * - `editing = true`: footer berubah jadi **Simpan + Batal**; pemanggil yang
 *   mengembalikan nilai awal lewat `onCancel` (biasanya `setForm({ ...original })`).
 *
 * Kartu ini hanya mengurus tampilan & tombol; state form dan simpan tetap milik
 * komponen section-nya (lihat `SettingsSections.tsx`).
 */
export function SettingsCard({
  title,
  description,
  headerRight,
  children,
  editing,
  onEdit,
  onCancel,
  onSave,
  saving = false,
  canSave = true,
  saveLabel = "Simpan Perubahan",
}: {
  title: string;
  description?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  canSave?: boolean;
  saveLabel?: string;
}) {
  return (
    <div className="card p-6 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold" style={{ color: "var(--espresso)" }}>{title}</h3>
          {description && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{description}</p>}
        </div>
        {headerRight}
      </div>

      <div className="mt-5 space-y-4">{children}</div>

      <div className="flex flex-wrap items-center gap-3 mt-5">
        {editing ? (
          <>
            <button
              onClick={onSave}
              disabled={saving || !canSave}
              className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white disabled:opacity-40"
              style={{ background: "#18181b" }}
            >
              {saving ? <Loader2 size={14} className="animate-spin inline mr-1.5" /> : null}
              {saveLabel}
            </button>
            <button
              onClick={onCancel}
              disabled={saving}
              className="text-sm font-semibold px-5 py-2.5 rounded-xl disabled:opacity-50"
              style={{ border: "1px solid #d4d4d8", color: "var(--text-secondary)" }}
            >
              Batal
            </button>
          </>
        ) : (
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            style={{ border: "1px solid #d4d4d8", color: "var(--espresso)" }}
          >
            <Edit size={14} strokeWidth={2} />
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Satu baris field di dalam `SettingsCard`: label + nilai. Saat `editing` false
 * nilainya tampil sebagai teks biasa (read-only); saat true jadi input/textarea.
 */
export function Field({
  label,
  value,
  editing,
  onChange,
  placeholder,
  hint,
  multiline = false,
  mono = false,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange?: (value: string) => void;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold" style={{ color: "var(--espresso)" }}>{label}</label>
      {editing ? (
        multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            rows={2}
            placeholder={placeholder}
            className="mt-1.5 w-full rounded-xl px-4 py-2.5 bg-white text-sm outline-none resize-none"
            style={{ border: "1px solid #e4e4e7" }}
          />
        ) : (
          <input
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            className={`mt-1.5 w-full rounded-xl px-4 py-2.5 bg-white text-sm outline-none${mono ? " font-mono" : ""}`}
            style={{ border: "1px solid #e4e4e7" }}
          />
        )
      ) : (
        <p
          className={`mt-1 text-sm font-medium whitespace-pre-wrap break-words${mono ? " font-mono" : ""}`}
          style={{ color: value ? "var(--fg)" : "var(--fg3)" }}
        >
          {value || "Belum diisi"}
        </p>
      )}
      {editing && hint && <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>{hint}</p>}
    </div>
  );
}
