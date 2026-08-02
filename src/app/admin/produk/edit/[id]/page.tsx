"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, Upload, Image as ImageIcon, Video, Loader2, Trash2, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { colorMap } from "@/lib/katalog-data";
import AdminShell from "@/components/AdminShell";
import JenisKainForm from "@/components/JenisKainForm";
import { uploadToCloudinary } from "@/lib/cloudinary";

const CATEGORIES = ["Thobe", "Kandora", "Koko", "Vest", "Kabak", "Cover & Hanger"] as const;
const SIZES = ["S", "M", "L", "XL", "XXL"] as const;

function formatRupiah(val: string): string {
  const digits = val.replace(/\D/g, "");
  if (!digits) return "";
  return parseInt(digits).toLocaleString("id-ID");
}
function parseRupiah(formatted: string): string {
  return formatted.replace(/\D/g, "");
}

interface Variant {
  color: string;
  hex: string;
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

export default function EditProdukPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [weight, setWeight] = useState("");
  const [series, setSeries] = useState("");
  const [catatanHarga, setCatatanHarga] = useState("");
  const [selectedJenisKainId, setSelectedJenisKainId] = useState<string>("");
  const [showNewKainForm, setShowNewKainForm] = useState(false);
  const [jenisKainList, setJenisKainList] = useState<{ id: string; name: string }[]>([]);

  // Series list (dari produk yang sudah ada) + tambah baru
  const [seriesList, setSeriesList] = useState<string[]>([]);
  const [showNewSeries, setShowNewSeries] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState("");

  // Warna custom (hex picker bebas ala editor HTML)
  const [customHex, setCustomHex] = useState("#141414");
  const [customColorName, setCustomColorName] = useState("");

  // Create Your Price
  const [cypEnabled, setCypEnabled] = useState(false);
  const [minimumPrice, setMinimumPrice] = useState("");
  const [recommendedPrice, setRecommendedPrice] = useState("");

  const [variants, setVariants] = useState<Variant[]>([]);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Load existing product data
  useEffect(() => {
    async function loadProduct() {
      try {
        // Fetch jenis_kain list
        const { data: kainList } = await supabase.from("jenis_kain").select("id, name").order("display_order");
        if (kainList) setJenisKainList(kainList);

        // Fetch daftar series dari tabel product_series
        const { data: allSeries } = await supabase.from("product_series").select("name").order("name");
        if (allSeries && allSeries.length > 0) {
          setSeriesList(allSeries.map((r) => r.name));
        } else {
          setSeriesList(["Jiharkah", "Imron", "Bayati", "Nahawand", "Karim", "Imalah"]);
        }

        // Fetch product
        const { data: product } = await supabase.from("products").select("*").eq("id", id).single();
        if (!product) { router.push("/admin"); return; }

        setName(product.name);
        setSlug(product.id);
        setCategory(product.category);
        setDescription(product.description || "");
        setBasePrice(String(product.price));
        setWeight(product.weight ? String(product.weight) : "");
        setSeries(product.series || "");
        setCatatanHarga(product.catatan_harga || "");
        setSelectedJenisKainId(product.jenis_kain_id || "");
        setCypEnabled(product.create_your_price_enabled || false);
        setMinimumPrice(product.minimum_price ? String(product.minimum_price) : "");
        setRecommendedPrice(product.recommended_price ? String(product.recommended_price) : "");

        // Fetch variants
        const { data: dbVariants } = await supabase.from("product_variants").select("*").eq("product_id", id);
        if (dbVariants && dbVariants.length > 0) {
          const colorGroups: Record<string, Variant> = {};
          dbVariants.forEach((v: { color: string; hex: string | null; size: string; stock: number; price_override: number | null; sku: string | null }) => {
            if (!colorGroups[v.color]) colorGroups[v.color] = { color: v.color, hex: v.hex || colorMap[v.color] || "#141414", sizes: [] };
            colorGroups[v.color].sizes.push({
              size: v.size,
              stock: v.stock,
              priceOverride: v.price_override ? String(v.price_override) : "",
              sku: v.sku || "",
            });
          });
          const varList = Object.values(colorGroups);
          setVariants(varList);
          setActiveColor(varList[0]?.color || null);
        }

        // Fetch images
        const { data: dbImages } = await supabase.from("product_images").select("*").eq("product_id", id).order("display_order");
        if (dbImages) {
          setMedia(dbImages.map((img: { id: string; url: string; is_video: boolean; color: string }) => ({
            id: img.id,
            url: img.url,
            isVideo: img.is_video,
            color: img.color,
            preview: img.url,
            uploading: false,
          })));
        }
      } catch (err) {
        console.error("Load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id, router]);

  function generateSlug(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }

  function addColor(color: string, hex?: string) {
    if (variants.find((v) => v.color === color)) return;
    setVariants([...variants, { color, hex: hex || colorMap[color] || "#141414", sizes: [{ size: "M", stock: 0, priceOverride: "", sku: "" }] }]);
    setActiveColor(color);
  }

  // Tambah warna custom (hex bebas)
  function addCustomColor() {
    const nama = customColorName.trim();
    if (!nama) { alert("Nama warna wajib diisi."); return; }
    if (variants.find((v) => v.color.toLowerCase() === nama.toLowerCase())) { alert(`Warna "${nama}" sudah ada.`); return; }
    addColor(nama, customHex);
    setCustomColorName("");
  }

  // Tambah series baru → simpan ke Supabase
  async function addNewSeries() {
    const nama = newSeriesName.trim();
    if (!nama) return;
    if (!seriesList.find((s) => s.toLowerCase() === nama.toLowerCase())) {
      await supabase.from("product_series").upsert({ name: nama }, { onConflict: "name" });
      setSeriesList((prev) => [...prev, nama].sort());
    }
    setSeries(nama);
    setShowNewSeries(false);
    setNewSeriesName("");
  }

  function removeColor(color: string) {
    setVariants(variants.filter((v) => v.color !== color));
    setMedia(media.filter((m) => m.color !== color));
    if (activeColor === color) setActiveColor(variants[0]?.color || null);
  }

  function addSize(color: string) {
    setVariants(variants.map((v) => {
      if (v.color !== color) return v;
      const usedSizes = v.sizes.map((s) => s.size);
      const nextSize = SIZES.find((s) => !usedSizes.includes(s)) || "M";
      return { ...v, sizes: [...v.sizes, { size: nextSize, stock: 0, priceOverride: "", sku: "" }] };
    }));
  }

  function removeSize(color: string, sizeIdx: number) {
    setVariants(variants.map((v) => {
      if (v.color !== color) return v;
      return { ...v, sizes: v.sizes.filter((_, i) => i !== sizeIdx) };
    }));
  }

  function updateSizeField(color: string, sizeIdx: number, field: string, value: string | number) {
    setVariants(variants.map((v) => {
      if (v.color !== color) return v;
      const sizes = [...v.sizes];
      sizes[sizeIdx] = { ...sizes[sizeIdx], [field]: value };
      return { ...v, sizes };
    }));
  }

  // Toggle CYP: rekomendasi otomatis Harga Dasar + Rp 30.000 kalau masih kosong (seperti HTML)
  function toggleCyp() {
    const next = !cypEnabled;
    if (next && !recommendedPrice && basePrice) setRecommendedPrice(String((parseInt(basePrice) || 0) + 30000));
    setCypEnabled(next);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, color: string) {
    const files = e.target.files;
    if (!files || !activeColor) return;
    const newMedia: MediaFile[] = [];
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) { alert(`${file.name} terlalu besar`); continue; }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      newMedia.push({ id, file, url: "", isVideo, color, preview: URL.createObjectURL(file), uploading: true });
    }
    setMedia((prev) => [...prev, ...newMedia]);
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

  function removeMedia(id: string) {
    setMedia((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item?.preview && item.preview !== item.url) URL.revokeObjectURL(item.preview);
      return prev.filter((m) => m.id !== id);
    });
  }

  // Tambah media via URL (tempel link gambar/video)
  const [mediaUrl, setMediaUrl] = useState("");
  function addMediaByUrl() {
    const u = mediaUrl.trim();
    if (!u) return;
    const isVideo = /\.(mp4|webm|ogg|m4v)(\?|#|$)/i.test(u);
    setMedia((prev) => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, url: u, isVideo, color: category === "Thobe" ? "default" : activeColor || "default", preview: u, uploading: false }]);
    setMediaUrl("");
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nama produk wajib diisi";
    if (!category) e.category = "Kategori wajib dipilih";
    if (!basePrice || parseInt(basePrice) <= 0) e.basePrice = "Harga wajib diisi";
    if (cypEnabled && (!minimumPrice || parseInt(minimumPrice) <= 0)) e.minimumPrice = "Harga Minimum wajib diisi jika Create Your Price aktif";
    if (cypEnabled && minimumPrice && basePrice && parseInt(minimumPrice) > parseInt(basePrice)) e.minimumPrice = "Harga Minimum tidak boleh lebih besar dari Harga Dasar";
    if (cypEnabled && recommendedPrice && minimumPrice && parseInt(recommendedPrice) < parseInt(minimumPrice)) e.recommendedPrice = "Harga Rekomendasi tidak boleh kurang dari Harga Minimum";
    if (variants.length === 0) e.variants = "Minimal 1 varian warna";
    const hasSize = variants.some((v) => v.sizes.some((s) => s.stock > 0));
    if (!hasSize) e.variants = "Minimal 1 ukuran dengan stok > 0";
    const uploadedMedia = media.filter((m) => m.url && !m.uploading);
    if (uploadedMedia.length === 0) e.media = "Minimal 1 media";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    try {
      await supabase.from("products").upsert({
        id: slug, name, category, description: description || null, price: parseInt(basePrice),
        minimum_price: cypEnabled ? parseInt(minimumPrice) : null,
        recommended_price: cypEnabled && recommendedPrice ? parseInt(recommendedPrice) : null,
        create_your_price_enabled: cypEnabled,
        weight: weight ? parseInt(weight) : null,
        image: media.find((m) => m.url)?.url || "",
        images: media.filter((m) => m.url).map((m) => m.url),
        colors: variants.map((v) => v.color),
        jenis_kain_id: selectedJenisKainId || null,
        series: series.trim() || null,
        catatan_harga: catatanHarga.trim() || null,
      }, { onConflict: "id" });

      // Delete old variants and re-insert
      await supabase.from("product_variants").delete().eq("product_id", slug);
      const variantRows = variants.flatMap((v) => v.sizes.map((s) => ({
        product_id: slug, color: v.color, hex: v.hex || null, size: s.size, stock: s.stock,
        price_override: s.priceOverride ? parseInt(s.priceOverride) : null, sku: s.sku || null,
      })));
      if (variantRows.length > 0) await supabase.from("product_variants").upsert(variantRows, { onConflict: "product_id,color,size" });

      // Delete old images and re-insert
      await supabase.from("product_images").delete().eq("product_id", slug);
      const imageRows = media.filter((m) => m.url).map((m, i) => ({
        product_id: slug, color: m.color, url: m.url, is_video: m.isVideo, display_order: i,
      }));
      if (imageRows.length > 0) await supabase.from("product_images").insert(imageRows);

      router.push("/admin");
    } catch (err) {
      console.error("Save error:", err);
      alert("Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <AdminShell><section className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}><Loader2 size={24} className="animate-spin" style={{ color: "var(--gold)" }} /></section></AdminShell>;
  }

  const activeVariant = variants.find((v) => v.color === activeColor);
  const activeMedia = category === "Thobe" ? media : media.filter((m) => m.color === activeColor);

  return (
    <AdminShell>
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      <div className="sticky top-0 z-20 backdrop-blur" style={{ background: "rgba(248,245,241,.8)", borderBottom: "1px solid rgba(64,50,37,.06)" }}>
        <div className="max-w-6xl mx-auto px-5 lg:px-8 py-4 flex items-center gap-4">
          <button onClick={() => router.push("/admin")} className="p-2 -ml-2 rounded-lg hover:bg-[var(--bg-tertiary)]" style={{ color: "var(--espresso)" }}><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-2xl italic leading-none" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Edit Produk</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{name}</p>
          </div>
          <div className="ml-auto flex gap-3">
            <button onClick={() => router.push("/admin")} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Batal</button>
            <button onClick={handleSubmit} disabled={saving} className="px-5 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>
              {saving ? <><Loader2 size={14} className="animate-spin inline mr-1" /> Menyimpan...</> : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-5 lg:px-8 py-6 pb-24 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8 items-start">
          <div className="space-y-6">
            <div className="card p-5">
              <h2 className="font-serif italic text-xl mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Info Dasar</h2>
              <div className="space-y-4">
                {/* Baris 1: Nama + Kategori (2 kolom) */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Nama Produk</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: `1px solid ${errors.name ? "#e74c3c" : "rgba(64,50,37,.15)"}`, background: "white", color: "var(--espresso)" }} />
                    {errors.name && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Kategori</label>
                    <div className="relative">
                      <select value={category} onChange={(e) => {
                        const val = e.target.value;
                        setCategory(val);
                        if (val !== "Thobe") setSeries("");
                      }} className="w-full rounded-xl px-4 py-3 text-sm outline-none appearance-none" style={{ border: `1px solid ${errors.category ? "#e74c3c" : "rgba(64,50,37,.15)"}`, background: "white", color: "var(--espresso)" }}>
                        <option value="">Pilih kategori</option>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                    </div>
                  </div>
                </div>
                {/* Baris 2: Slug */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Slug</label>
                  <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                </div>
                {/* Baris 3: Deskripsi */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Deskripsi</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                </div>
                {/* Baris 4: Harga Dasar + Berat (2 kolom) / Berat only saat CYP on */}
                <div className={cypEnabled ? "" : "grid sm:grid-cols-2 gap-4"}>
                  {!cypEnabled && (
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Harga Dasar (Rp)</label>
                      <input type="text" inputMode="numeric" value={formatRupiah(basePrice)} onChange={(e) => setBasePrice(parseRupiah(e.target.value))} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: `1px solid ${errors.basePrice ? "#e74c3c" : "rgba(64,50,37,.15)"}`, background: "white", color: "var(--espresso)" }} />
                      <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Harga terendah / yang tampil di katalog.</p>
                      {errors.basePrice && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.basePrice}</p>}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Berat (gram)</label>
                    <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="800" />
                    <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Untuk hitung ongkir. Kosongkan = default per kategori.</p>
                  </div>
                </div>
                {/* Create Your Price Toggle */}
                <div className="p-4 rounded-xl" style={{ background: cypEnabled ? "rgba(181,140,74,.06)" : "rgba(64,50,37,.02)", border: `1px solid ${cypEnabled ? "rgba(181,140,74,.3)" : "rgba(64,50,37,.1)"}` }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--espresso)" }}>Create Your Price</p>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Customer bisa tentukan harga sendiri (minimal = Harga Minimum)</p>
                    </div>
                    <button type="button" onClick={toggleCyp}
                      className="relative w-11 h-6 rounded-full transition-colors duration-200"
                      style={{ background: cypEnabled ? "var(--gold)" : "rgba(64,50,37,.2)" }}>
                      <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                        style={{ transform: cypEnabled ? "translateX(20px)" : "translateX(0)" }} />
                    </button>
                  </div>
                  {cypEnabled && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Harga Minimum (Rp) <span style={{ color: "var(--gold)" }}>*</span></label>
                        <input type="text" inputMode="numeric" value={formatRupiah(minimumPrice)} onChange={(e) => setMinimumPrice(parseRupiah(e.target.value))} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: `1px solid ${errors.minimumPrice ? "#e74c3c" : "rgba(64,50,37,.15)"}`, background: "white", color: "var(--espresso)" }} placeholder="350.000" />
                        {errors.minimumPrice && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.minimumPrice}</p>}
                        <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Harga terendah yang bisa dipilih customer.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Harga Rekomendasi (Rp)</label>
                        <input type="text" inputMode="numeric" value={formatRupiah(recommendedPrice)} onChange={(e) => setRecommendedPrice(parseRupiah(e.target.value))} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: `1px solid ${errors.recommendedPrice ? "#e74c3c" : "rgba(64,50,37,.15)"}`, background: "white", color: "var(--espresso)" }} placeholder={basePrice ? formatRupiah(String((parseInt(basePrice) || 0) + 30000)) : "379.000"} />
                        {errors.recommendedPrice && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.recommendedPrice}</p>}
                        <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Kosongkan = otomatis Harga Dasar + Rp 30.000 ({basePrice ? `Rp ${((parseInt(basePrice) || 0) + 30000).toLocaleString("id-ID")}` : "—"}).</p>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Jenis Kain</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select value={selectedJenisKainId} onChange={(e) => setSelectedJenisKainId(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none appearance-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }}>
                        <option value="">Pilih Jenis Kain</option>
                        {jenisKainList.map((jk) => <option key={jk.id} value={jk.id}>{jk.name}</option>)}
                      </select>
                    </div>
                    <button type="button" onClick={() => setShowNewKainForm(!showNewKainForm)} className="px-3 py-2 rounded-xl text-xs font-medium shrink-0" style={{ border: "1px dashed rgba(181,140,74,.4)", color: "var(--gold)" }}>
                      + Baru
                    </button>
                    {selectedJenisKainId && (
                      <button type="button" onClick={async () => {
                        const jk = jenisKainList.find((j) => j.id === selectedJenisKainId);
                        if (!confirm(`Hapus jenis kain "${jk?.name}" dari database?`)) return;
                        await supabase.from("jenis_kain").delete().eq("id", selectedJenisKainId);
                        setJenisKainList((prev) => prev.filter((j) => j.id !== selectedJenisKainId));
                        setSelectedJenisKainId("");
                      }} className="px-3 py-2 rounded-xl text-xs font-medium shrink-0" style={{ border: "1px solid rgba(231,76,60,.3)", color: "#e74c3c" }}>
                        Hapus
                      </button>
                    )}
                  </div>
                  {showNewKainForm && (
                    <div className="mt-3">
                      <JenisKainForm
                        onSave={(newKain) => {
                          setJenisKainList((prev) => [...prev, { id: newKain.id, name: newKain.name }]);
                          setSelectedJenisKainId(newKain.id);
                          setShowNewKainForm(false);
                        }}
                        onCancel={() => setShowNewKainForm(false)}
                      />
                    </div>
                  )}
                </div>
                {category === "Thobe" && (
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Jenis Series</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select value={series} onChange={(e) => setSeries(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none appearance-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }}>
                        <option value="">Semua series</option>
                        {seriesList.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                    </div>
                    <button type="button" onClick={() => setShowNewSeries(!showNewSeries)} className="px-3 py-2 rounded-xl text-xs font-medium shrink-0" style={{ border: "1px dashed rgba(181,140,74,.4)", color: "var(--gold)" }}>
                      + Baru
                    </button>
                    {series && (
                      <button type="button" onClick={async () => {
                        if (!confirm(`Hapus series "${series}" dari database?`)) return;
                        await supabase.from("product_series").delete().eq("name", series);
                        setSeriesList((prev) => prev.filter((s) => s !== series));
                        setSeries("");
                      }} className="px-3 py-2 rounded-xl text-xs font-medium shrink-0" style={{ border: "1px solid rgba(231,76,60,.3)", color: "#e74c3c" }}>
                        Hapus
                      </button>
                    )}
                  </div>
                  {showNewSeries && (
                    <div className="mt-2.5 flex gap-2">
                      <input
                        value={newSeriesName}
                        onChange={(e) => setNewSeriesName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNewSeries(); } }}
                        placeholder="Nama series baru…"
                        autoFocus
                        className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                        style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }}
                      />
                      <button type="button" onClick={addNewSeries} className="px-4 py-2 rounded-xl text-xs font-semibold text-white shrink-0" style={{ background: "var(--gold)" }}>Tambah</button>
                    </div>
                  )}
                  <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Pilih <b>Semua series</b> kalau produk ini tersedia di semua series. Series diatur di tab Series & Harga.</p>
                </div>
                )}
              </div>
            </div>

            <div className="card p-5">
              <h2 className="font-serif italic text-xl mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Varian & Stok</h2>
              {errors.variants && <p className="text-[12px] mb-3" style={{ color: "#e74c3c" }}>{errors.variants}</p>}
              {category === "Thobe" ? (
                /* Thobe: tidak pakai warna, langsung tampilkan ukuran */
                <div className="space-y-3">
                  <p className="text-sm font-medium" style={{ color: "var(--espresso)" }}>Ukuran</p>
                  <div className="grid grid-cols-[72px_80px_112px_112px_36px] gap-2 text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                    <span>Ukuran</span>
                    <span>Stok</span>
                    <span>Harga Khusus</span>
                    <span>SKU</span>
                  </div>
                  {variants.length > 0 && variants[0].sizes.map((s, i) => (
                    <div key={i} className="grid grid-cols-[72px_80px_112px_112px_36px] gap-2 items-center">
                      <input
                        value={s.size}
                        onChange={(e) => updateSizeField(variants[0].color, i, "size", e.target.value.toUpperCase())}
                        onFocus={(e) => e.target.select()}
                        list="size-suggestions"
                        className="rounded-lg px-2.5 py-2 text-sm outline-none text-center"
                        style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }}
                        placeholder="—"
                      />
                      <input type="number" value={s.stock || ""} onChange={(e) => updateSizeField(variants[0].color, i, "stock", parseInt(e.target.value) || 0)} placeholder="0" className="rounded-lg px-2.5 py-2 text-sm outline-none text-center" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                      <input value={s.priceOverride} onChange={(e) => updateSizeField(variants[0].color, i, "priceOverride", e.target.value)} placeholder="—" className="rounded-lg px-2.5 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                      <input value={s.sku} onChange={(e) => updateSizeField(variants[0].color, i, "sku", e.target.value)} placeholder="—" className="rounded-lg px-2.5 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                      {variants[0].sizes.length > 1 && <button onClick={() => removeSize(variants[0].color, i)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" style={{ color: "#e74c3c" }}><Trash2 size={14} /></button>}
                    </div>
                  ))}
                  <datalist id="size-suggestions">
                    {SIZES.map((sz) => <option key={sz} value={sz} />)}
                  </datalist>
                  <button onClick={() => { if (variants.length === 0) addColor("default"); else addSize(variants[0].color); }} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--gold)" }}><Plus size={14} /> Tambah Ukuran</button>
                </div>
              ) : (
                /* Kategori lain: tampilkan pemilihan warna + ukuran */
                <>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {variants.map((v) => (
                      <button key={v.color} onClick={() => { setActiveColor(v.color); setPreviewIndex(0); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all" style={{ background: activeColor === v.color ? "var(--espresso)" : "transparent", color: activeColor === v.color ? "var(--cream)" : "var(--coffee)", border: `1px solid ${activeColor === v.color ? "var(--espresso)" : "rgba(201,183,156,.3)"}` }}>
                        <span className="w-3 h-3 rounded-full" style={{ background: v.hex || colorMap[v.color] || "#ccc", border: "1px solid rgba(42,33,27,.1)" }} />
                        {v.color}
                        <button onClick={(e) => { e.stopPropagation(); removeColor(v.color); }} className="ml-1 hover:opacity-60"><X size={12} /></button>
                      </button>
                    ))}
                    {/* form warna custom: hex picker + nama */}
                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-xs" style={{ border: "1px dashed rgba(201,183,156,.4)", color: "var(--gold)" }}>
                      <input type="color" value={customHex} onChange={(e) => setCustomHex(e.target.value)} className="w-6 h-6 rounded-full border-0 cursor-pointer p-0 bg-transparent" title="Pilih warna" />
                      <input
                        value={customColorName}
                        onChange={(e) => setCustomColorName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomColor(); } }}
                        placeholder="Nama warna…"
                        className="w-[110px] bg-transparent outline-none text-xs"
                        style={{ color: "var(--espresso)" }}
                      />
                      <button type="button" onClick={addCustomColor} className="font-semibold hover:opacity-70">+</button>
                    </div>
                  </div>
                  {activeVariant && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium" style={{ color: "var(--espresso)" }}>Ukuran untuk <span style={{ color: "var(--gold)" }}>{activeColor}</span></p>
                      <div className="grid grid-cols-[72px_80px_112px_112px_36px] gap-2 text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                        <span>Ukuran</span>
                        <span>Stok</span>
                        <span>Harga Khusus</span>
                        <span>SKU</span>
                      </div>
                      {activeVariant.sizes.map((s, i) => (
                        <div key={i} className="grid grid-cols-[72px_80px_112px_112px_36px] gap-2 items-center">
                          <input
                            value={s.size}
                            onChange={(e) => updateSizeField(activeColor!, i, "size", e.target.value.toUpperCase())}
                            onFocus={(e) => e.target.select()}
                            list="size-suggestions"
                            className="rounded-lg px-2.5 py-2 text-sm outline-none text-center"
                            style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }}
                            placeholder="—"
                          />
                          <input type="number" value={s.stock || ""} onChange={(e) => updateSizeField(activeColor!, i, "stock", parseInt(e.target.value) || 0)} placeholder="0" className="rounded-lg px-2.5 py-2 text-sm outline-none text-center" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                          <input value={s.priceOverride} onChange={(e) => updateSizeField(activeColor!, i, "priceOverride", e.target.value)} placeholder="—" className="rounded-lg px-2.5 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                          <input value={s.sku} onChange={(e) => updateSizeField(activeColor!, i, "sku", e.target.value)} placeholder="—" className="rounded-lg px-2.5 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                          {activeVariant.sizes.length > 1 && <button onClick={() => removeSize(activeColor!, i)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" style={{ color: "#e74c3c" }}><Trash2 size={14} /></button>}
                        </div>
                      ))}
                      <datalist id="size-suggestions">
                        {SIZES.map((sz) => <option key={sz} value={sz} />)}
                      </datalist>
                      <button onClick={() => addSize(activeColor!)} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--gold)" }}><Plus size={14} /> Tambah Ukuran</button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="card p-5">
              <h2 className="font-serif italic text-xl mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Media</h2>
              {errors.media && <p className="text-[12px] mb-3" style={{ color: "#e74c3c" }}>{errors.media}</p>}
              {category !== "Thobe" && !activeColor ? <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>Pilih warna terlebih dahulu</p> : (
                <div>
                  <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{category === "Thobe" ? "Upload foto/video produk" : <>Upload untuk: <span className="font-medium" style={{ color: "var(--gold)" }}>{activeColor}</span></>}</p>
                  <label className="block rounded-xl p-6 text-center cursor-pointer transition-all hover:border-[var(--gold)]" style={{ border: "2px dashed rgba(201,183,156,.3)", background: "rgba(255,255,255,.5)" }}>
                    <Upload size={24} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
                    <p className="text-sm font-medium" style={{ color: "var(--espresso)" }}>Klik atau seret file</p>
                    <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>JPG, PNG, WebP (10MB) · MP4, WebM (50MB)</p>
                    <input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(e) => handleFileSelect(e, category === "Thobe" ? "default" : activeColor || "default")} className="hidden" />
                  </label>

                  {/* atau tempel URL */}
                  <div className="flex gap-2 mt-2.5">
                    <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMediaByUrl(); } }} placeholder="atau tempel URL gambar / video…" className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                    <button type="button" onClick={addMediaByUrl} className="px-4 py-2 rounded-xl text-xs font-semibold text-white shrink-0" style={{ background: "var(--gold)" }}>Tambah</button>
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Foto pertama = foto utama di katalog.</p>
                  {activeMedia.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                      {activeMedia.map((m, idx) => (
                        <div key={m.id} className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer" style={{ background: "#e8dfd1" }}
                          onClick={() => { if (!m.uploading && !m.error) { setPreviewIndex(idx); } }}>
                          {m.uploading ? <div className="absolute inset-0 flex items-center justify-center"><Loader2 size={20} className="animate-spin" style={{ color: "var(--gold)" }} /></div>
                            : m.isVideo ? <video src={m.url || m.preview} className="w-full h-full object-cover" muted loop playsInline />
                            : <img src={m.url || m.preview} alt="" className="w-full h-full object-cover" />}
                          {idx === 0 && !m.uploading && !m.error && (
                            <span className="absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-[9px] font-medium text-white" style={{ background: "rgba(0,0,0,.65)" }}>Utama</span>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); removeMedia(m.id); }} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,.6)", color: "white" }}><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="hidden lg:block sticky top-24">
            <div className="card p-5">
              <h3 className="font-serif italic text-lg mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Preview Produk</h3>

              {/* Main image / video */}
              <div className="aspect-[4/5] rounded-xl overflow-hidden mb-3" style={{ background: "#e8dfd1" }}>
                {activeMedia.length > 0 ? (
                  (() => {
                    const item = activeMedia[Math.min(previewIndex, activeMedia.length - 1)];
                    return item.isVideo ? (
                      <video src={item.url || item.preview} className="w-full h-full object-cover" muted loop playsInline onMouseEnter={(e) => (e.target as HTMLVideoElement).play()} onMouseLeave={(e) => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0; }} />
                    ) : (
                      <img src={item.url || item.preview} alt="" className="w-full h-full object-cover" />
                    );
                  })()
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
                    <button key={m.id} onClick={() => setPreviewIndex(i)} className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 transition-all" style={{ border: i === (Math.min(previewIndex, activeMedia.length - 1)) ? "2px solid var(--gold)" : "1px solid rgba(64,50,37,.1)", opacity: i === (Math.min(previewIndex, activeMedia.length - 1)) ? 1 : 0.6 }}>
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
                {cypEnabled
                  ? (minimumPrice ? `Rp ${parseInt(minimumPrice).toLocaleString("id-ID")}` : recommendedPrice ? `Rp ${parseInt(recommendedPrice).toLocaleString("id-ID")}` : "Rp 0")
                  : (basePrice ? `Rp ${parseInt(basePrice).toLocaleString("id-ID")}` : "Rp 0")
                }
              </p>

              {/* Color swatches — skip for Thobe */}
              {category !== "Thobe" && variants.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {variants.map((v) => (
                    <button key={v.color} onClick={() => { setActiveColor(v.color); setPreviewIndex(0); }} className="w-6 h-6 rounded-full transition-transform" style={{ background: v.hex || colorMap[v.color] || "#ccc", border: activeColor === v.color ? "2px solid var(--gold)" : "1px solid rgba(42,33,27,.15)", transform: activeColor === v.color ? "scale(1.15)" : "scale(1)" }} title={v.color} />
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

      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-4 pb-4 pt-3" style={{ background: "linear-gradient(to top, var(--cream) 70%, transparent)" }}>
        <button onClick={handleSubmit} disabled={saving} className="w-full py-3.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>
          {saving ? <><Loader2 size={14} className="animate-spin inline mr-1" /> Menyimpan...</> : "Simpan Perubahan"}
        </button>
      </div>

      <style jsx global>{`.card { background: #fffdfb; border: 1px solid rgba(64,50,37,.06); border-radius: 1rem; box-shadow: 0 1px 2px rgba(64,50,37,.03); }`}</style>
    </section>
    </AdminShell>
  );
}
