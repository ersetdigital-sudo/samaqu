"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Plus, X, Upload, Image as ImageIcon, Video, GripVertical,
  ChevronDown, Check, Loader2, Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import AdminShell from "@/components/AdminShell";
import { colorMap } from "@/lib/katalog-data";

const CATEGORIES = ["Thobe", "Kandora", "Koko", "Vest", "Kabak", "Cover & Hanger"] as const;
const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
const COLORS = Object.keys(colorMap);

const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD || "dgtixuop0";
const CLOUDINARY_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || "samaqu_unsigned";

interface Variant {
  color: string;
  sizes: { size: string; stock: number; priceOverride: string; sku: string }[];
}

interface MediaFile {
  id: string;
  file?: File;
  url: string;
  isVideo: boolean;
  color: string;
  preview: string;
  uploading: boolean;
  error?: string;
}

export default function TambahProdukPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Basic fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");

  // Variants
  const [variants, setVariants] = useState<Variant[]>([]);
  const [activeColor, setActiveColor] = useState<string | null>(null);

  // Media
  const [media, setMedia] = useState<MediaFile[]>([]);

  // Auto-generate slug from name
  function handleNameChange(val: string) {
    setName(val);
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(val));
    }
  }

  function generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // Add color variant
  function addColor(color: string) {
    if (variants.find((v) => v.color === color)) return;
    setVariants([...variants, { color, sizes: [{ size: "M", stock: 0, priceOverride: "", sku: "" }] }]);
    setActiveColor(color);
  }

  // Remove color variant
  function removeColor(color: string) {
    setVariants(variants.filter((v) => v.color !== color));
    setMedia(media.filter((m) => m.color !== color));
    if (activeColor === color) setActiveColor(variants[0]?.color || null);
  }

  // Add size to variant
  function addSize(color: string) {
    setVariants(variants.map((v) => {
      if (v.color !== color) return v;
      const usedSizes = v.sizes.map((s) => s.size);
      const nextSize = SIZES.find((s) => !usedSizes.includes(s)) || "M";
      return { ...v, sizes: [...v.sizes, { size: nextSize, stock: 0, priceOverride: "", sku: "" }] };
    }));
  }

  // Remove size from variant
  function removeSize(color: string, sizeIdx: number) {
    setVariants(variants.map((v) => {
      if (v.color !== color) return v;
      return { ...v, sizes: v.sizes.filter((_, i) => i !== sizeIdx) };
    }));
  }

  // Update size field
  function updateSizeField(color: string, sizeIdx: number, field: string, value: string | number) {
    setVariants(variants.map((v) => {
      if (v.color !== color) return v;
      const sizes = [...v.sizes];
      sizes[sizeIdx] = { ...sizes[sizeIdx], [field]: value };
      return { ...v, sizes };
    }));
  }

  // Upload to Cloudinary
  async function uploadToCloudinary(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_PRESET);
    const isVideo = file.type.startsWith("video/");
    const endpoint = isVideo ? "video" : "image";
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${endpoint}/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Upload gagal");
    const data = await res.json();
    return data.secure_url;
  }

  // Handle file select
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, color: string) {
    const files = e.target.files;
    if (!files || !activeColor) return;

    const newMedia: MediaFile[] = [];
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`${file.name} terlalu besar. Maks: ${isVideo ? "50MB" : "10MB"}`);
        continue;
      }
      const validTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"];
      if (!validTypes.includes(file.type)) {
        alert(`${file.name} format tidak didukung`);
        continue;
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const preview = URL.createObjectURL(file);
      newMedia.push({ id, file, url: "", isVideo, color, preview, uploading: true });
    }

    setMedia((prev) => [...prev, ...newMedia]);

    // Upload each file
    for (const item of newMedia) {
      try {
        const url = await uploadToCloudinary(item.file!);
        setMedia((prev) => prev.map((m) => m.id === item.id ? { ...m, url, uploading: false } : m));
      } catch {
        setMedia((prev) => prev.map((m) => m.id === item.id ? { ...m, uploading: false, error: "Upload gagal" } : m));
      }
    }
    e.target.value = "";
  }

  // Remove media
  function removeMedia(id: string) {
    setMedia((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((m) => m.id !== id);
    });
  }

  // Validate
  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nama produk wajib diisi";
    if (!category) e.category = "Kategori wajib dipilih";
    if (!basePrice || parseInt(basePrice) <= 0) e.basePrice = "Harga wajib diisi";
    if (variants.length === 0) e.variants = "Minimal 1 varian warna";
    const hasSize = variants.some((v) => v.sizes.some((s) => s.stock > 0));
    if (!hasSize) e.variants = "Minimal 1 ukuran dengan stok > 0";
    const uploadedMedia = media.filter((m) => m.url && !m.uploading);
    if (uploadedMedia.length === 0) e.media = "Minimal 1 media (gambar/video)";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // Submit
  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);

    try {
      // Insert product
      const { error: productError } = await supabase.from("products").upsert({
        id: slug,
        name,
        category,
        description: description || null,
        price: parseInt(basePrice),
        image: media.find((m) => m.url)?.url || "",
        images: media.filter((m) => m.url).map((m) => m.url),
        colors: variants.map((v) => v.color),
      }, { onConflict: "id" });

      if (productError) throw productError;

      // Insert variants
      const variantRows = variants.flatMap((v) =>
        v.sizes.map((s) => ({
          product_id: slug,
          color: v.color,
          size: s.size,
          stock: s.stock,
          price_override: s.priceOverride ? parseInt(s.priceOverride) : null,
          sku: s.sku || null,
        }))
      );
      if (variantRows.length > 0) {
        await supabase.from("product_variants").upsert(variantRows, { onConflict: "product_id,color,size" });
      }

      // Insert images
      const imageRows = media.filter((m) => m.url).map((m, i) => ({
        product_id: slug,
        color: m.color,
        url: m.url,
        is_video: m.isVideo,
        display_order: i,
      }));
      if (imageRows.length > 0) {
        await supabase.from("product_images").insert(imageRows);
      }

      router.push("/admin");
    } catch (err) {
      console.error("Save error:", err);
      alert("Gagal menyimpan produk");
    } finally {
      setSaving(false);
    }
  }

  const activeVariant = variants.find((v) => v.color === activeColor);
  const activeMedia = media.filter((m) => m.color === activeColor);

  return (
    <AdminShell>
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur" style={{ background: "rgba(248,245,241,.8)", borderBottom: "1px solid rgba(64,50,37,.06)" }}>
        <div className="max-w-6xl mx-auto px-5 lg:px-8 py-4 flex items-center gap-4">
          <button onClick={() => router.push("/admin")} className="p-2 -ml-2 rounded-lg hover:bg-[var(--bg-tertiary)]" style={{ color: "var(--espresso)" }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl italic leading-none" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Tambah Produk</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Tambah koleksi baru ke katalog SAMAQU</p>
          </div>
          <div className="ml-auto flex gap-3">
            <button onClick={() => router.push("/admin")} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Batal</button>
            <button onClick={handleSubmit} disabled={saving} className="px-5 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>
              {saving ? <><Loader2 size={14} className="animate-spin inline mr-1" /> Menyimpan...</> : "Simpan Produk"}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-5 lg:px-8 py-6 pb-24 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8 items-start">

          {/* Left: Form */}
          <div className="space-y-6">
            {/* Info Dasar */}
            <div className="card p-5">
              <h2 className="font-serif italic text-xl mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Info Dasar</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Nama Produk <span style={{ color: "var(--gold)" }}>*</span></label>
                  <input value={name} onChange={(e) => handleNameChange(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: `1px solid ${errors.name ? "#e74c3c" : "rgba(64,50,37,.15)"}`, background: "white", color: "var(--espresso)" }} placeholder="Contoh: Thobe Jiharkah Premium" />
                  {errors.name && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Slug</label>
                  <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="thobe-jiharkah-premium" />
                  <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>URL: /katalog/{slug || "..."}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Kategori <span style={{ color: "var(--gold)" }}>*</span></label>
                  <div className="relative">
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none appearance-none" style={{ border: `1px solid ${errors.category ? "#e74c3c" : "rgba(64,50,37,.15)"}`, background: "white", color: "var(--espresso)" }}>
                      <option value="">Pilih kategori</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                  </div>
                  {errors.category && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.category}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Deskripsi</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="Deskripsi produk..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Harga Dasar (Rp) <span style={{ color: "var(--gold)" }}>*</span></label>
                  <input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: `1px solid ${errors.basePrice ? "#e74c3c" : "rgba(64,50,37,.15)"}`, background: "white", color: "var(--espresso)" }} placeholder="389000" />
                  {errors.basePrice && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.basePrice}</p>}
                </div>
              </div>
            </div>

            {/* Varian & Stok */}
            <div className="card p-5">
              <h2 className="font-serif italic text-xl mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Varian & Stok</h2>
              {errors.variants && <p className="text-[12px] mb-3" style={{ color: "#e74c3c" }}>{errors.variants}</p>}

              {/* Color chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {variants.map((v) => (
                  <button key={v.color} onClick={() => setActiveColor(v.color)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{ background: activeColor === v.color ? "var(--espresso)" : "transparent", color: activeColor === v.color ? "var(--cream)" : "var(--coffee)", border: `1px solid ${activeColor === v.color ? "var(--espresso)" : "rgba(201,183,156,.3)"}` }}>
                    <span className="w-3 h-3 rounded-full" style={{ background: colorMap[v.color] || "#ccc", border: "1px solid rgba(42,33,27,.1)" }} />
                    {v.color}
                    <button onClick={(e) => { e.stopPropagation(); removeColor(v.color); }} className="ml-1 hover:opacity-60"><X size={12} /></button>
                  </button>
                ))}
                <div className="relative">
                  <select onChange={(e) => { if (e.target.value) addColor(e.target.value); e.target.value = ""; }}
                    className="appearance-none px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer" style={{ border: "1px dashed rgba(201,183,156,.4)", color: "var(--gold)", background: "transparent" }}>
                    <option value="">+ Tambah Warna</option>
                    {COLORS.filter((c) => !variants.find((v) => v.color === c)).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Sizes for active color */}
              {activeVariant && (
                <div className="space-y-3">
                  <p className="text-sm font-medium" style={{ color: "var(--espresso)" }}>
                    Ukuran untuk <span style={{ color: "var(--gold)" }}>{activeColor}</span>
                  </p>
                  <div className="flex items-center gap-3 text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                    <span className="w-[60px]">Ukuran</span>
                    <span className="w-20">Stok</span>
                    <span className="w-28">Harga Khusus</span>
                    <span className="w-28">SKU</span>
                  </div>
                  {activeVariant.sizes.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 flex-wrap">
                      <select value={s.size} onChange={(e) => updateSizeField(activeColor!, i, "size", e.target.value)}
                        className="rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }}>
                        {SIZES.map((sz) => <option key={sz} value={sz}>{sz}</option>)}
                      </select>
                      <input type="number" value={s.stock || ""} onChange={(e) => updateSizeField(activeColor!, i, "stock", parseInt(e.target.value) || 0)}
                        placeholder="Stok" className="w-20 rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                      <input value={s.priceOverride} onChange={(e) => updateSizeField(activeColor!, i, "priceOverride", e.target.value)}
                        placeholder="Opsional" className="w-28 rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                      <input value={s.sku} onChange={(e) => updateSizeField(activeColor!, i, "sku", e.target.value)}
                        placeholder="SKU" className="w-28 rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                      {activeVariant.sizes.length > 1 && (
                        <button onClick={() => removeSize(activeColor!, i)} className="p-1.5 rounded-lg hover:bg-red-50" style={{ color: "#e74c3c" }}><Trash2 size={14} /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addSize(activeColor!)} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--gold)" }}>
                    <Plus size={14} /> Tambah Ukuran
                  </button>
                </div>
              )}
              {variants.length === 0 && (
                <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>Pilih warna terlebih dahulu untuk mengatur ukuran dan stok</p>
              )}
            </div>

            {/* Media Upload */}
            <div className="card p-5">
              <h2 className="font-serif italic text-xl mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Media</h2>
              {errors.media && <p className="text-[12px] mb-3" style={{ color: "#e74c3c" }}>{errors.media}</p>}

              {!activeColor ? (
                <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>Pilih warna terlebih dahulu untuk upload media</p>
              ) : (
                <div>
                  <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
                    Upload untuk warna: <span className="font-medium" style={{ color: "var(--gold)" }}>{activeColor}</span>
                  </p>

                  {/* Upload area */}
                  <label className="block rounded-xl p-6 text-center cursor-pointer transition-all hover:border-[var(--gold)]" style={{ border: "2px dashed rgba(201,183,156,.3)", background: "rgba(255,255,255,.5)" }}>
                    <Upload size={24} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
                    <p className="text-sm font-medium" style={{ color: "var(--espresso)" }}>Klik atau seret file ke sini</p>
                    <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>JPG, PNG, WebP (max 10MB) · MP4, WebM (max 50MB)</p>
                    <input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(e) => handleFileSelect(e, activeColor)} className="hidden" />
                  </label>

                  {/* Media preview grid */}
                  {activeMedia.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                      {activeMedia.map((m) => (
                        <div key={m.id} className="relative aspect-square rounded-lg overflow-hidden group" style={{ background: "#e8dfd1" }}>
                          {m.uploading ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Loader2 size={20} className="animate-spin" style={{ color: "var(--gold)" }} />
                            </div>
                          ) : m.error ? (
                            <div className="absolute inset-0 flex items-center justify-center p-2">
                              <p className="text-[10px] text-center" style={{ color: "#e74c3c" }}>{m.error}</p>
                            </div>
                          ) : m.isVideo ? (
                            <video src={m.url || m.preview} className="w-full h-full object-cover" muted loop playsInline onMouseEnter={(e) => (e.target as HTMLVideoElement).play()} onMouseLeave={(e) => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0; }} />
                          ) : (
                            <img src={m.url || m.preview} alt="" className="w-full h-full object-cover" />
                          )}
                          <button onClick={() => removeMedia(m.id)} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,.6)", color: "white" }}>
                            <X size={12} />
                          </button>
                          {m.isVideo && <div className="absolute bottom-1.5 left-1.5"><Video size={12} style={{ color: "white" }} /></div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Preview sidebar */}
          <div className="hidden lg:block sticky top-24">
            <div className="card p-5">
              <h3 className="font-serif italic text-lg mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Preview Produk</h3>

              {/* Main image / video */}
              <div className="aspect-[4/5] rounded-xl overflow-hidden mb-3" style={{ background: "#e8dfd1" }}>
                {activeMedia.length > 0 ? (
                  activeMedia[0].isVideo ? (
                    <video src={activeMedia[0].url || activeMedia[0].preview} className="w-full h-full object-cover" muted loop playsInline onMouseEnter={(e) => (e.target as HTMLVideoElement).play()} onMouseLeave={(e) => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0; }} />
                  ) : (
                    <img src={activeMedia[0].url || activeMedia[0].preview} alt="" className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={32} style={{ color: "var(--text-muted)" }} />
                  </div>
                )}
              </div>

              {/* Thumbnail strip */}
              {activeMedia.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto mb-3 pb-1">
                  {activeMedia.map((m, i) => (
                    <button key={m.id} className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ border: i === 0 ? "2px solid var(--gold)" : "1px solid rgba(64,50,37,.1)" }}>
                      {m.isVideo ? (
                        <div className="w-full h-full relative">
                          <video src={m.url || m.preview} className="w-full h-full object-cover" muted />
                          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,.3)" }}>
                            <Video size={12} color="white" />
                          </div>
                        </div>
                      ) : (
                        <img src={m.url || m.preview} alt="" className="w-full h-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Product info */}
              <p className="text-sm font-medium" style={{ color: "var(--espresso)" }}>{name || "Nama Produk"}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{category || "Kategori"}</p>
              <p className="text-lg font-serif italic mt-1.5" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--gold)" }}>
                {basePrice ? `Rp ${parseInt(basePrice).toLocaleString("id-ID")}` : "Rp 0"}
              </p>

              {/* Color swatches */}
              {variants.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {variants.map((v) => (
                    <button key={v.color} onClick={() => setActiveColor(v.color)} className="w-6 h-6 rounded-full transition-transform" style={{ background: colorMap[v.color] || "#ccc", border: activeColor === v.color ? "2px solid var(--gold)" : "1px solid rgba(42,33,27,.15)", transform: activeColor === v.color ? "scale(1.15)" : "scale(1)" }} title={v.color} />
                  ))}
                </div>
              )}

              {/* Active color label */}
              {activeColor && (
                <p className="text-[11px] mt-2 font-medium" style={{ color: "var(--text-muted)" }}>{activeColor}</p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile sticky save button */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-4 pb-4 pt-3" style={{ background: "linear-gradient(to top, var(--cream) 70%, transparent)" }}>
        <button onClick={handleSubmit} disabled={saving} className="w-full py-3.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)", boxShadow: "0 6px 20px -6px rgba(184,145,74,.4)" }}>
          {saving ? <><Loader2 size={14} className="animate-spin inline mr-1" /> Menyimpan...</> : "Simpan Produk"}
        </button>
      </div>

      <style jsx global>{`
        .card { background: #fffdfb; border: 1px solid rgba(64,50,37,.06); border-radius: 1rem; box-shadow: 0 1px 2px rgba(64,50,37,.03); }
      `}</style>
    </section>
    </AdminShell>
  );
}
