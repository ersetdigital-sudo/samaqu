"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  Upload,
  Trash2,
  ImageIcon,
  Ruler,
  Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/AdminToast";
import AdminShell from "@/components/AdminShell";

interface SizeGuideImage {
  id: string;
  category: string;
  image_url: string;
  updated_at: string;
}

const CATEGORIES = [
  "Thobe",
  "Kandora",
  "Koko",
  "Vest",
  "Kabak",
  "Rekomendasi Size",
];

const CLOUDINARY_CLOUD =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD || "dgtixuop0";
const CLOUDINARY_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || "samaqu_unsigned";

export default function UkuranProdukPage() {
  const [guides, setGuides] = useState<SizeGuideImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    loadGuides();
  }, []);

  async function loadGuides() {
    setLoading(true);
    const { data } = await supabase
      .from("size_guide_images")
      .select("*")
      .order("category");
    if (data) setGuides(data);
    setLoading(false);
  }

  async function handleUpload(category: string, file: File) {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (!allowed.includes(file.type)) {
      toast.showToast(
        "error",
        "Format file tidak didukung (JPG/PNG/WebP)"
      );
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.showToast("error", "Ukuran file maksimal 5MB");
      return;
    }

    setUploadingId(category);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", CLOUDINARY_PRESET);

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
        { method: "POST", body: fd }
      );
      const data = await res.json();
      if (data.secure_url) {
        // Update state
        setGuides((prev) =>
          prev.map((g) =>
            g.category === category
              ? { ...g, image_url: data.secure_url }
              : g
          )
        );
        toast.showToast("success", `Gambar ${category} berhasil diupload`);
      } else {
        toast.showToast("error", "Upload gagal");
      }
    } catch {
      toast.showToast("error", "Gagal upload gambar");
    }
    setUploadingId(null);
  }

  function handleRemoveImage(category: string) {
    setGuides((prev) =>
      prev.map((g) =>
        g.category === category ? { ...g, image_url: "" } : g
      )
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      for (const guide of guides) {
        await supabase
          .from("size_guide_images")
          .upsert(
            {
              category: guide.category,
              image_url: guide.image_url,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "category" }
          );
      }
      toast.showToast("success", "Panduan ukuran berhasil disimpan");
      await loadGuides();
    } catch {
      toast.showToast("error", "Gagal menyimpan");
    }
    setSaving(false);
  }

  if (loading)
    return (
      <AdminShell>
        <section
          className="min-h-screen flex items-center justify-center"
          style={{ background: "var(--cream)" }}
        >
          <Loader2
            size={24}
            className="animate-spin"
            style={{ color: "var(--gold)" }}
          />
        </section>
      </AdminShell>
    );

  return (
    <AdminShell>
      <section className="min-h-screen" style={{ background: "var(--cream)" }}>
        <div className="max-w-4xl mx-auto px-5 lg:px-8 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1
                className="text-2xl italic"
                style={{
                  fontFamily: "var(--font-cormorant), Georgia, serif",
                  color: "var(--espresso)",
                }}
              >
                Panduan Ukuran
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                Kelola foto panduan ukuran yang tampil di halaman publik
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
              style={{
                background: "var(--gold)",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              Simpan
            </button>
          </div>

          {/* Info */}
          <div
            className="text-xs mb-6 px-4 py-3 rounded-lg space-y-1"
            style={{ background: "#f0e7d8", color: "#8a6f42" }}
          >
            <p className="font-semibold mb-1">
              Panduan upload foto ukuran:
            </p>
            <p>
              Upload foto/panduan ukuran untuk setiap kategori produk.
              Foto akan tampil di halaman publik pada bagian Panduan
              Ukuran.
            </p>
            <p className="mt-1 opacity-75">
              Format JPG/PNG/WebP, max 5MB. Disarankan resolusi tinggi
              agar teks pada foto tetap jelas.
            </p>
          </div>

          {/* Category Cards */}
          <div className="space-y-4">
            {CATEGORIES.map((category) => {
              const guide = guides.find((g) => g.category === category);
              const imageUrl = guide?.image_url || "";
              const isUploading = uploadingId === category;

              return (
                <div
                  key={category}
                  className="rounded-2xl p-5 flex flex-col sm:flex-row gap-4"
                  style={{
                    background: "white",
                    border: "1px solid rgba(64,50,37,.06)",
                    boxShadow: "0 1px 2px rgba(64,50,37,.03)",
                  }}
                >
                  {/* Preview */}
                  <div
                    className="w-full sm:w-40 h-32 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                    style={{ background: "#e8dfd1" }}
                  >
                    {isUploading ? (
                      <Loader2
                        size={24}
                        className="animate-spin"
                        style={{ color: "var(--gold)" }}
                      />
                    ) : imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={category}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <ImageIcon
                          size={24}
                          className="mx-auto mb-1"
                          style={{ color: "var(--text-muted)" }}
                        />
                        <p
                          className="text-[10px]"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Belum ada foto
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Info + Actions */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Ruler
                          size={16}
                          strokeWidth={1.8}
                          style={{ color: "var(--gold)" }}
                        />
                        <h3
                          className="font-semibold"
                          style={{ color: "var(--espresso)" }}
                        >
                          {category}
                        </h3>
                        {imageUrl && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: "#e7ecdf",
                              color: "#5b6b45",
                            }}
                          >
                            Aktif
                          </span>
                        )}
                      </div>
                      <p
                        className="text-sm"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {category === "Rekomendasi Size"
                          ? "Foto panduan rekomendasi ukuran berdasarkan tinggi dan berat badan"
                          : `Foto panduan ukuran untuk produk ${category}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <label
                        className="flex items-center gap-2 text-xs cursor-pointer px-4 py-2 rounded-lg transition-colors hover:bg-[rgba(64,50,37,.05)]"
                        style={{
                          border: "1px dashed rgba(64,50,37,.2)",
                          color: "var(--gold)",
                        }}
                      >
                        <Upload size={14} />
                        {imageUrl ? "Ganti Foto" : "Upload Foto"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(category, file);
                          }}
                        />
                      </label>
                      {imageUrl && (
                        <button
                          onClick={() => handleRemoveImage(category)}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors hover:bg-red-50"
                          style={{
                            border: "1px solid rgba(231,76,60,.2)",
                            color: "#e74c3c",
                          }}
                        >
                          <Trash2 size={12} />
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
