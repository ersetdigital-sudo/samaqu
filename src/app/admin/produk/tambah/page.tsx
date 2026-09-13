"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Plus, X, Upload, Image as ImageIcon, Video, GripVertical,
  ChevronDown, Check, Loader2, Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import AdminShell from "@/components/AdminShell";
import JenisKainForm from "@/components/JenisKainForm";
import PresetColorPicker from "@/components/PresetColorPicker";
import { colorMap } from "@/lib/katalog-data";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useStoreSettings } from "@/lib/store-settings";

const CATEGORIES = ["Thobe", "Kandora", "Koko", "Vest", "Kabak", "Cover & Hanger"] as const;
const SIZES = ["S", "M", "L", "XL", "XXL"] as const;

function formatRupiah(val: string): string {
  const digits = val.replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
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

interface SeriesBlock {
  price: string;
  cypEnabled: boolean;
  minimumPrice: string;
  recommendedPrice: string;
  useCustomCypMicrocopy: boolean;
  cypMicrocopyOverride: string;
  media: MediaFile[];
  variants: Variant[];
  activeColor: string | null;
}

export default function TambahProdukPage() {
  const router = useRouter();
  const storeSettings = useStoreSettings();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Basic fields
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
  const [badgeType, setBadgeType] = useState<string>("");

  // Series list (dari produk yang sudah ada) + tambah baru
  const [seriesList, setSeriesList] = useState<string[]>([]);
  const [showNewSeries, setShowNewSeries] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState("");

  // Warna custom dikelola di dalam PresetColorPicker (state lokal komponen)

  // Jenis Kain list
  const [jenisKainList, setJenisKainList] = useState<{ id: string; name: string }[]>([]);

  // Create Your Price
  const [cypEnabled, setCypEnabled] = useState(false);
  const [minimumPrice, setMinimumPrice] = useState("");
  const [recommendedPrice, setRecommendedPrice] = useState("");
  const [useCustomCypMicrocopy, setUseCustomCypMicrocopy] = useState(false);
  const [cypMicrocopyOverride, setCypMicrocopyOverride] = useState("");

  // Variants
  const [variants, setVariants] = useState<Variant[]>([]);
  const [activeColor, setActiveColor] = useState<string | null>(null);

  // Media
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Thobe multi-series
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const [seriesBlocks, setSeriesBlocks] = useState<Record<string, SeriesBlock>>({});
  const [activeSeriesTab, setActiveSeriesTab] = useState<string | null>(null);

  // Fetch jenis_kain list + daftar series dari tabel product_series
  useEffect(() => {
    supabase.from("jenis_kain").select("id, name").order("display_order").then(({ data }) => {
      if (data) setJenisKainList(data);
    });
    supabase.from("product_series").select("name").order("name").then(({ data }) => {
      if (data && data.length > 0) {
        setSeriesList(data.map((r) => r.name));
      } else {
        setSeriesList(["Jiharkah", "Imron", "Bayati", "Nahawand", "Karim", "Imalah"]);
      }
    });
  }, []);

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
  function addColor(color: string, hex?: string) {
    if (variants.find((v) => v.color === color)) return;
    setVariants([...variants, { color, hex: hex || colorMap[color] || "#141414", sizes: [{ size: "M", stock: 0, priceOverride: "", sku: "" }] }]);
    setActiveColor(color);
  }

  // Tambah series baru → simpan ke Supabase
  async function addNewSeries() {
    const nama = newSeriesName.trim();
    if (!nama) return;
    if (!seriesList.find((s) => s.toLowerCase() === nama.toLowerCase())) {
      await supabase.from("product_series").upsert({ name: nama }, { onConflict: "name" });
      setSeriesList((prev) => [...prev, nama].sort());
    }
    // Auto-select the new series for Thobe
    if (category === "Thobe" && !selectedSeries.includes(nama)) {
      toggleSeries(nama);
    } else {
      setSeries(nama);
    }
    setShowNewSeries(false);
    setNewSeriesName("");
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

  // Toggle CYP: rekomendasi otomatis Harga Dasar + Rp 30.000 kalau masih kosong (seperti HTML)
  function toggleCyp() {
    const next = !cypEnabled;
    if (next && !recommendedPrice && basePrice) setRecommendedPrice(String((parseInt(basePrice) || 0) + 30000));
    setCypEnabled(next);
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

  // Tambah media via URL (tempel link gambar/video)
  const [mediaUrl, setMediaUrl] = useState("");
  function addMediaByUrl() {
    const u = mediaUrl.trim();
    if (!u) return;
    const isVideo = /\.(mp4|webm|ogg|m4v)(\?|#|$)/i.test(u);
    setMedia((prev) => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, url: u, isVideo, color: category === "Thobe" ? "default" : activeColor || "default", preview: u, uploading: false }]);
    setMediaUrl("");
  }

  // ── Thobe multi-series helpers ──
  function toggleSeries(seriesName: string) {
    setSelectedSeries((prev) => {
      const next = prev.includes(seriesName)
        ? prev.filter((s) => s !== seriesName)
        : [...prev, seriesName];
      // Create default block for newly checked series
      if (!prev.includes(seriesName)) {
        setSeriesBlocks((blocks) => ({
          ...blocks,
          [seriesName]: blocks[seriesName] || {
            price: basePrice || "",
            cypEnabled: false,
            minimumPrice: "",
            recommendedPrice: "",
            useCustomCypMicrocopy: false,
            cypMicrocopyOverride: "",
            media: [],
            variants: [{ color: "default", hex: "#141414", sizes: [{ size: "M", stock: 0, priceOverride: "", sku: "" }] }],
            activeColor: "default",
          },
        }));
        setActiveSeriesTab(seriesName);
      }
      // Cleanup block when unchecked
      if (prev.includes(seriesName)) {
        setSeriesBlocks((blocks) => {
          const next = { ...blocks };
          delete next[seriesName];
          return next;
        });
        if (activeSeriesTab === seriesName) {
          const remaining = prev.filter((s) => s !== seriesName);
          setActiveSeriesTab(remaining[0] || null);
        }
      }
      return next;
    });
  }

  function updateSeriesBlock(seriesName: string, patch: Partial<SeriesBlock>) {
    setSeriesBlocks((prev) => ({
      ...prev,
      [seriesName]: { ...prev[seriesName], ...patch },
    }));
  }

  function addSizeToSeriesBlock(seriesName: string) {
    setSeriesBlocks((prev) => {
      const block = prev[seriesName];
      if (!block) return prev;
      const v = block.variants[0];
      const usedSizes = v?.sizes.map((s) => s.size) || [];
      const nextSize = SIZES.find((s) => !usedSizes.includes(s)) || "M";
      return {
        ...prev,
        [seriesName]: {
          ...block,
          variants: [{
            ...v,
            sizes: [...v.sizes, { size: nextSize, stock: 0, priceOverride: "", sku: "" }],
          }],
        },
      };
    });
  }

  function removeSizeFromSeriesBlock(seriesName: string, sizeIdx: number) {
    setSeriesBlocks((prev) => {
      const block = prev[seriesName];
      if (!block) return prev;
      const v = block.variants[0];
      return {
        ...prev,
        [seriesName]: {
          ...block,
          variants: [{
            ...v,
            sizes: v.sizes.filter((_, i) => i !== sizeIdx),
          }],
        },
      };
    });
  }

  function updateSeriesBlockSizeField(seriesName: string, sizeIdx: number, field: string, value: string | number) {
    setSeriesBlocks((prev) => {
      const block = prev[seriesName];
      if (!block) return prev;
      const v = block.variants[0];
      const sizes = [...v.sizes];
      sizes[sizeIdx] = { ...sizes[sizeIdx], [field]: value };
      return {
        ...prev,
        [seriesName]: {
          ...block,
          variants: [{ ...v, sizes }],
        },
      };
    });
  }

  async function handleSeriesFileSelect(e: React.ChangeEvent<HTMLInputElement>, seriesName: string) {
    const files = e.target.files;
    if (!files) return;
    const block = seriesBlocks[seriesName];
    if (!block) return;

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
      newMedia.push({ id, file, url: "", isVideo, color: "default", preview, uploading: true });
    }

    updateSeriesBlock(seriesName, { media: [...block.media, ...newMedia] });

    for (const item of newMedia) {
      try {
        const url = await uploadToCloudinary(item.file!);
        setSeriesBlocks((prev) => ({
          ...prev,
          [seriesName]: {
            ...prev[seriesName],
            media: prev[seriesName].media.map((m) => m.id === item.id ? { ...m, url, uploading: false } : m),
          },
        }));
      } catch {
        setSeriesBlocks((prev) => ({
          ...prev,
          [seriesName]: {
            ...prev[seriesName],
            media: prev[seriesName].media.map((m) => m.id === item.id ? { ...m, uploading: false, error: "Upload gagal" } : m),
          },
        }));
      }
    }
    e.target.value = "";
  }

  function removeSeriesMedia(seriesName: string, mediaId: string) {
    setSeriesBlocks((prev) => {
      const block = prev[seriesName];
      if (!block) return prev;
      const item = block.media.find((m) => m.id === mediaId);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return {
        ...prev,
        [seriesName]: {
          ...block,
          media: block.media.filter((m) => m.id !== mediaId),
        },
      };
    });
  }

  function addSeriesMediaByUrl(seriesName: string, urlStr: string) {
    const u = urlStr.trim();
    if (!u) return;
    const isVideo = /\.(mp4|webm|ogg|m4v)(\?|#|$)/i.test(u);
    setSeriesBlocks((prev) => {
      const block = prev[seriesName];
      if (!block) return prev;
      return {
        ...prev,
        [seriesName]: {
          ...block,
          media: [...block.media, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, url: u, isVideo, color: "default", preview: u, uploading: false }],
        },
      };
    });
  }

  // ── End Thobe multi-series helpers ──

  // Validate
  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nama produk wajib diisi";
    if (!category) e.category = "Kategori wajib dipilih";
    if ((category === "Thobe" || category === "Kandora") && !selectedJenisKainId) e.jenisKain = "Jenis Kain wajib dipilih";

    if (category === "Thobe") {
      // Multi-series validation
      if (selectedSeries.length === 0) e.series = "Minimal pilih 1 series";
      for (const sn of selectedSeries) {
        const block = seriesBlocks[sn];
        if (!block) continue;
        if (!block.price || parseInt(block.price) <= 0) e[`series_${sn}_price`] = `Harga ${sn} wajib diisi`;
        if (block.cypEnabled && (!block.minimumPrice || parseInt(block.minimumPrice) <= 0)) e[`series_${sn}_min`] = `Harga Minimum ${sn} wajib diisi`;
        const uploadedMedia = block.media.filter((m) => m.url && !m.uploading);
        if (uploadedMedia.length === 0) e[`series_${sn}_media`] = `Media ${sn} wajib diisi (min 1)`;
        const hasStock = block.variants.some((v) => v.sizes.some((s) => s.stock > 0));
        if (!hasStock) e[`series_${sn}_stock`] = `Stok ${sn} wajib ada minimal 1 ukuran`;
      }
    } else {
      // Non-Thobe: existing validation
      if (!cypEnabled && (!basePrice || parseInt(basePrice) <= 0)) e.basePrice = "Harga wajib diisi";
      if (cypEnabled && (!minimumPrice || parseInt(minimumPrice) <= 0)) e.minimumPrice = "Harga Minimum wajib diisi jika Create Your Price aktif";
      if (cypEnabled && minimumPrice && basePrice && parseInt(minimumPrice) > parseInt(basePrice)) e.minimumPrice = "Harga Minimum tidak boleh lebih besar dari Harga Dasar";
      if (cypEnabled && recommendedPrice && minimumPrice && parseInt(recommendedPrice) < parseInt(minimumPrice)) e.recommendedPrice = "Harga Rekomendasi tidak boleh kurang dari Harga Minimum";
      if (variants.length === 0) e.variants = "Minimal 1 varian warna";
      const hasSize = variants.some((v) => v.sizes.some((s) => s.stock > 0));
      if (!hasSize) e.variants = "Minimal 1 ukuran dengan stok > 0";
      const uploadedMedia = media.filter((m) => m.url && !m.uploading);
      if (uploadedMedia.length === 0) e.media = "Minimal 1 media (gambar/video)";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // Submit
  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);

    try {
      if (category === "Thobe" && selectedSeries.length > 0) {
        // ── Thobe multi-series: create 1 product row per series ──
        for (const seriesName of selectedSeries) {
          const block = seriesBlocks[seriesName];
          if (!block) continue;
          const seriesSlug = `${slug}-${seriesName.toLowerCase().replace(/\s+/g, "-")}`;
          const blockPrice = block.cypEnabled
            ? (parseInt(block.price) || parseInt(block.minimumPrice) || 0)
            : parseInt(block.price);

          const { error: productError } = await supabase.from("products").upsert({
            id: seriesSlug,
            name,
            category,
            description: description || null,
            price: blockPrice,
            minimum_price: block.cypEnabled ? parseInt(block.minimumPrice) : null,
            recommended_price: block.cypEnabled && block.recommendedPrice ? parseInt(block.recommendedPrice) : null,
            create_your_price_enabled: block.cypEnabled,
            cyp_microcopy_override: block.useCustomCypMicrocopy && block.cypMicrocopyOverride.trim() ? block.cypMicrocopyOverride.trim() : null,
            weight: weight ? parseInt(weight) : null,
            image: block.media.find((m) => m.url)?.url || "",
            images: block.media.filter((m) => m.url).map((m) => m.url),
            colors: block.variants.map((v) => v.color),
            jenis_kain_id: selectedJenisKainId || null,
            series: seriesName,
            catatan_harga: catatanHarga.trim() || null,
            badge_type: badgeType || null,
          }, { onConflict: "id" });
          if (productError) throw productError;

          // Insert variants
          const variantRows = block.variants.flatMap((v, vi) =>
            v.sizes.map((s, si) => ({
              product_id: seriesSlug,
              color: v.color,
              hex: v.hex || null,
              size: s.size,
              stock: s.stock,
              price_override: s.priceOverride ? parseInt(s.priceOverride) : null,
              sku: s.sku || null,
              display_order: vi * 100 + si,
            }))
          );
          if (variantRows.length > 0) {
            await supabase.from("product_variants").upsert(variantRows, { onConflict: "product_id,color,size" });
          }

          // Insert images
          const imageRows = block.media.filter((m) => m.url).map((m, i) => ({
            product_id: seriesSlug,
            color: m.color,
            url: m.url,
            is_video: m.isVideo,
            display_order: i,
          }));
          if (imageRows.length > 0) {
            await supabase.from("product_images").insert(imageRows);
          }
        }
      } else {
        // ── Non-Thobe: existing single-product logic ──
        const { error: productError } = await supabase.from("products").upsert({
          id: slug,
          name,
          category,
          description: description || null,
          price: cypEnabled ? (parseInt(basePrice) || parseInt(minimumPrice) || 0) : parseInt(basePrice),
          minimum_price: cypEnabled ? parseInt(minimumPrice) : null,
          recommended_price: cypEnabled && recommendedPrice ? parseInt(recommendedPrice) : null,
          create_your_price_enabled: cypEnabled,
          cyp_microcopy_override: useCustomCypMicrocopy && cypMicrocopyOverride.trim() ? cypMicrocopyOverride.trim() : null,
          weight: weight ? parseInt(weight) : null,
          image: media.find((m) => m.url)?.url || "",
          images: media.filter((m) => m.url).map((m) => m.url),
          colors: variants.map((v) => v.color),
          jenis_kain_id: selectedJenisKainId || null,
          series: series.trim() || null,
          catatan_harga: catatanHarga.trim() || null,
          badge_type: badgeType || null,
        }, { onConflict: "id" });
        if (productError) throw productError;

        // Insert variants
        const variantRows = variants.flatMap((v, vi) =>
          v.sizes.map((s, si) => ({
            product_id: slug,
            color: v.color,
            hex: v.hex || null,
            size: s.size,
            stock: s.stock,
            price_override: s.priceOverride ? parseInt(s.priceOverride) : null,
            sku: s.sku || null,
            display_order: vi * 100 + si,
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
  const activeMedia = category === "Thobe" && activeSeriesTab && seriesBlocks[activeSeriesTab]
    ? seriesBlocks[activeSeriesTab].media
    : category === "Thobe" ? media : media.filter((m) => m.color === activeColor);

  return (
    <AdminShell>
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur" style={{ background: "rgba(248,245,241,.82)", borderBottom: "1px solid rgba(64,50,37,.07)" }}>
        <div className="max-w-6xl mx-auto px-5 lg:px-8 py-4 flex items-center gap-4">
          <button onClick={() => router.push("/admin")} title="Kembali" className="p-2.5 -ml-2 rounded-xl bg-white transition-colors hover:bg-[var(--bg-secondary)]" style={{ border: "1px solid rgba(64,50,37,.08)", color: "var(--espresso)" }}>
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <p className="hidden sm:block text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>Produk</p>
            <h1 className="text-2xl italic leading-none truncate" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Tambah Produk</h1>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <button onClick={() => router.push("/admin")} className="pf-btn pf-btn-ghost">Batal</button>
            <button onClick={handleSubmit} disabled={saving} className="pf-btn pf-btn-primary">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</> : <><Check size={14} /> Simpan Produk</>}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-5 lg:px-8 py-6 lg:py-8 pb-28 lg:pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8 items-start">

          {/* Left: Form */}
          <div className="space-y-6">
            {/* Info Dasar */}
            <div className="pf-card p-5 lg:p-6">
              <div className="pf-head">
                <div className="pf-num">1</div>
                <div>
                  <h2 className="pf-title">Info Dasar</h2>
                  <p className="pf-sub">Nama, kategori, harga, dan atribut utama produk.</p>
                </div>
              </div>
              <div className="space-y-4">
                {/* Baris 1: Nama + Kategori (2 kolom) */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="pf-label">Nama Produk <span className="pf-req">*</span></label>
                    <input value={name} onChange={(e) => handleNameChange(e.target.value)} className={`pf-input${errors.name ? " invalid" : ""}`} placeholder="Contoh: Thobe Jiharkah Premium" />
                    {errors.name && <p className="pf-error">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="pf-label">Kategori <span className="pf-req">*</span></label>
                    <div className="pf-selectwrap">
                      <select value={category} onChange={(e) => {
                        const val = e.target.value;
                        setCategory(val);
                        if (val !== "Thobe") setSeries("");
                        if (val !== "Thobe" && val !== "Kandora") setSelectedJenisKainId("");
                      }} className={`pf-select${errors.category ? " invalid" : ""}`}>
                        <option value="">Pilih kategori</option>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown size={14} className="pf-selectico" />
                    </div>
                    {errors.category && <p className="pf-error">{errors.category}</p>}
                  </div>
                </div>
                {/* Baris 2: Slug */}
                <div>
                  <label className="pf-label">Slug</label>
                  <input value={slug} onChange={(e) => setSlug(e.target.value)} className="pf-input" placeholder="thobe-jiharkah-premium" />
                  <p className="pf-hint">URL: /katalog/{slug || "..."}</p>
                </div>
                {/* Baris 3: Deskripsi */}
                <div>
                  <label className="pf-label">Deskripsi</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="pf-textarea" placeholder="Deskripsi produk..." />
                </div>
                {/* Baris 4: Harga Dasar + Berat — hidden untuk Thobe (harga per-series) */}
                {category !== "Thobe" && (
                <div className={cypEnabled ? "" : "grid sm:grid-cols-2 gap-4"}>
                  {!cypEnabled && (
                    <div>
                      <label className="pf-label">Harga Dasar (Rp) <span className="pf-req">*</span></label>
                      <input type="text" inputMode="numeric" value={formatRupiah(basePrice)} onChange={(e) => setBasePrice(parseRupiah(e.target.value))} className={`pf-input${errors.basePrice ? " invalid" : ""}`} placeholder="389.000" />
                      <p className="pf-hint">Harga terendah / yang tampil di katalog. Angka saja, contoh 249000.</p>
                      {errors.basePrice && <p className="pf-error">{errors.basePrice}</p>}
                    </div>
                  )}
                  <div>
                    <label className="pf-label">Berat (gram)</label>
                    <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="pf-input" placeholder="800" />
                    <p className="pf-hint">Untuk hitung ongkir. Kosongkan = default per kategori.</p>
                  </div>
                </div>
                )}
                {/* Thobe: Berat only */}
                {category === "Thobe" && (
                <div>
                  <label className="pf-label">Berat (gram)</label>
                  <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="pf-input" placeholder="800" />
                  <p className="pf-hint">Untuk hitung ongkir. Kosongkan = default per kategori.</p>
                </div>
                )}
                {/* Badge Katalog */}
                <div>
                  <label className="pf-label">Badge Katalog (opsional)</label>
                  <div className="pf-selectwrap">
                    <select value={badgeType} onChange={(e) => setBadgeType(e.target.value)} className="pf-select">
                      <option value="">Tanpa Badge</option>
                      <option value="terlaris">Terlaris</option>
                      <option value="rekomendasi">Rekomendasi</option>
                      <option value="new">New</option>
                    </select>
                    <ChevronDown size={14} className="pf-selectico" />
                  </div>
                  <p className="pf-hint">Badge yang tampil di pojok kanan atas foto card katalog.</p>
                </div>
                {/* Create Your Price Toggle — hidden untuk Thobe (CYP per-series) */}
                {category !== "Thobe" && (
                <div className={`pf-panel${cypEnabled ? " accent" : " flat"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--espresso)" }}>Create Your Price</p>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Customer bisa tentukan harga sendiri (minimal = Harga Minimum)</p>
                    </div>
                    <button type="button" onClick={toggleCyp} className="pf-toggle" style={{ background: cypEnabled ? "var(--gold)" : "rgba(64,50,37,.2)" }}>
                      <span className="pf-toggle-knob" style={{ transform: cypEnabled ? "translateX(20px)" : "translateX(0)" }} />
                    </button>
                  </div>
                  {cypEnabled && (
                    <div className="space-y-3">
                      <div>
                        <label className="pf-label">Harga Minimum (Rp) <span className="pf-req">*</span></label>
                        <input type="text" inputMode="numeric" value={formatRupiah(minimumPrice)} onChange={(e) => setMinimumPrice(parseRupiah(e.target.value))} className={`pf-input${errors.minimumPrice ? " invalid" : ""}`} placeholder="350.000" />
                        {errors.minimumPrice && <p className="pf-error">{errors.minimumPrice}</p>}
                        <p className="pf-hint">Harga terendah yang bisa dipilih customer.</p>
                      </div>
                      <div>
                        <label className="pf-label">Harga Rekomendasi (Rp)</label>
                        <input type="text" inputMode="numeric" value={formatRupiah(recommendedPrice)} onChange={(e) => setRecommendedPrice(parseRupiah(e.target.value))} className={`pf-input${errors.recommendedPrice ? " invalid" : ""}`} placeholder={basePrice ? formatRupiah(String((parseInt(basePrice) || 0) + 30000)) : "379.000"} />
                        {errors.recommendedPrice && <p className="pf-error">{errors.recommendedPrice}</p>}
                        <p className="pf-hint">Kosongkan = otomatis Harga Dasar + Rp 30.000 ({basePrice ? `Rp ${formatRupiah(String((parseInt(basePrice) || 0) + 30000))}` : "—"}).</p>
                      </div>
                      <div className="pf-panel">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div>
                            <p className="text-sm font-medium" style={{ color: "var(--espresso)" }}>Microcopy CYP (khusus produk ini)</p>
                            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Teks kecil di bawah opsi harga pada halaman produk.</p>
                          </div>
                          <button type="button" onClick={() => setUseCustomCypMicrocopy((v) => !v)} className="pf-toggle" style={{ background: useCustomCypMicrocopy ? "var(--gold)" : "rgba(64,50,37,.2)" }}>
                            <span className="pf-toggle-knob" style={{ transform: useCustomCypMicrocopy ? "translateX(20px)" : "translateX(0)" }} />
                          </button>
                        </div>
                        {useCustomCypMicrocopy ? (
                          <>
                            <textarea value={cypMicrocopyOverride} onChange={(e) => setCypMicrocopyOverride(e.target.value.slice(0, 120))} rows={2} maxLength={120} placeholder="Tulis teks khusus produk ini..." className="pf-textarea" />
                            <p className="pf-hint text-right" style={{ color: cypMicrocopyOverride.length >= 120 ? "#e74c3c" : "var(--text-muted)" }}>{cypMicrocopyOverride.length}/120</p>
                          </>
                        ) : (
                          <p className="text-[12px] leading-relaxed px-3 py-2.5 rounded-xl" style={{ background: "rgba(64,50,37,.04)", color: "var(--text-muted)", fontStyle: "italic" }}>
                            {storeSettings.cyp_microcopy || "Harga Minimum boleh dipilih. Itulah alasan kami membuat Create Your Price."}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                )}
                {(category === "Thobe" || category === "Kandora") && (
                <div>
                  <label className="pf-label">Jenis Kain</label>
                  <div className="flex gap-2">
                    <div className="pf-selectwrap flex-1">
                      <select value={selectedJenisKainId} onChange={(e) => setSelectedJenisKainId(e.target.value)} className={`pf-select${errors.jenisKain ? " invalid" : ""}`}>
                        <option value="">Pilih Jenis Kain</option>
                        {jenisKainList.map((jk) => <option key={jk.id} value={jk.id}>{jk.name}</option>)}
                      </select>
                      <ChevronDown size={14} className="pf-selectico" />
                    </div>
                    <button type="button" onClick={() => setShowNewKainForm(!showNewKainForm)} className="pf-btn pf-btn-outline shrink-0">
                      <Plus size={13} /> Baru
                    </button>
                    {selectedJenisKainId && (
                      <button type="button" onClick={async () => {
                        const jk = jenisKainList.find((j) => j.id === selectedJenisKainId);
                        if (!confirm(`Hapus jenis kain "${jk?.name}" dari database?`)) return;
                        await supabase.from("jenis_kain").delete().eq("id", selectedJenisKainId);
                        setJenisKainList((prev) => prev.filter((j) => j.id !== selectedJenisKainId));
                        setSelectedJenisKainId("");
                      }} className="pf-btn pf-btn-danger shrink-0">
                        Hapus
                      </button>
                    )}
                  </div>
                  {errors.jenisKain && <p className="pf-error">{errors.jenisKain}</p>}
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
                )}
                {category === "Thobe" && (
                <div>
                  <label className="pf-label">Series <span className="pf-req">*</span></label>
                  {errors.series && <p className="pf-error mb-2">{errors.series}</p>}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {seriesList.map((s) => (
                      <button key={s} type="button" onClick={() => toggleSeries(s)} className={`pf-chip${selectedSeries.includes(s) ? " active" : ""}`}>
                        {selectedSeries.includes(s) && <Check size={12} />}
                        {s}
                      </button>
                    ))}
                    <button type="button" onClick={() => setShowNewSeries(!showNewSeries)} className="pf-chip shrink-0" style={{ borderStyle: "dashed", borderColor: "rgba(181,140,74,.5)", color: "var(--gold-deep)" }}>
                      <Plus size={13} /> Baru
                    </button>
                  </div>
                  {showNewSeries && (
                    <div className="mb-3 flex gap-2">
                      <input
                        value={newSeriesName}
                        onChange={(e) => setNewSeriesName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNewSeries(); } }}
                        placeholder="Nama series baru…"
                        autoFocus
                        className="pf-input flex-1"
                      />
                      <button type="button" onClick={addNewSeries} className="pf-btn pf-btn-primary shrink-0">Tambah</button>
                    </div>
                  )}
                  <p className="pf-hint">Centang series yang tersedia untuk produk ini. Setiap series akan jadi baris produk terpisah di database.</p>
                </div>
                )}
              </div>
            </div>

            {/* Varian & Stok + Media (Thobe multi-series) / Varian & Stok (non-Thobe) */}
            {category === "Thobe" && selectedSeries.length > 0 ? (
              <div className="pf-card p-5 lg:p-6">
                <div className="pf-head">
                  <div className="pf-num">2</div>
                  <div>
                    <h2 className="pf-title">Series &amp; Harga</h2>
                    <p className="pf-sub">Atur harga, media, dan stok untuk setiap series.</p>
                  </div>
                </div>

                {/* Series tabs */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {selectedSeries.map((sn) => (
                    <button key={sn} type="button" onClick={() => setActiveSeriesTab(sn)} className={`pf-tab${activeSeriesTab === sn ? " active" : ""}`}>
                      {sn}
                      {seriesBlocks[sn] && (() => {
                        const b = seriesBlocks[sn];
                        const hasError = errors[`series_${sn}_price`] || errors[`series_${sn}_media`] || errors[`series_${sn}_stock`];
                        return hasError ? <span className="pf-dot" /> : null;
                      })()}
                    </button>
                  ))}
                </div>

                {/* Active series block */}
                {activeSeriesTab && seriesBlocks[activeSeriesTab] && (() => {
                  const sn = activeSeriesTab;
                  const block = seriesBlocks[sn];
                  const v0 = block.variants[0];
                  return (
                    <div className="space-y-6">
                      {/* ── Harga & CYP ── */}
                      <div>
                        <p className="text-sm font-semibold mb-3" style={{ color: "var(--espresso)" }}>
                          <span style={{ color: "var(--gold)" }}>{sn}</span> — Harga
                        </p>
                        <div className="pf-panel">
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <label className="pf-label">Harga Dasar (Rp) <span className="pf-req">*</span></label>
                              <input type="text" inputMode="numeric" value={formatRupiah(block.price)}
                                onChange={(e) => updateSeriesBlock(sn, { price: parseRupiah(e.target.value) })}
                                className={`pf-input${errors[`series_${sn}_price`] ? " invalid" : ""}`}
                                placeholder="389.000" />
                              {errors[`series_${sn}_price`] && <p className="pf-error">{errors[`series_${sn}_price`]}</p>}
                            </div>
                          </div>

                          {/* CYP toggle */}
                          <div className={`mt-4 pf-panel${block.cypEnabled ? " accent" : " flat"}`}>
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="text-sm font-medium" style={{ color: "var(--espresso)" }}>Create Your Price</p>
                                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Customer bisa tentukan harga sendiri</p>
                              </div>
                              <button type="button" onClick={() => updateSeriesBlock(sn, { cypEnabled: !block.cypEnabled })} className="pf-toggle" style={{ background: block.cypEnabled ? "var(--gold)" : "rgba(64,50,37,.2)" }}>
                                <span className="pf-toggle-knob" style={{ transform: block.cypEnabled ? "translateX(20px)" : "translateX(0)" }} />
                              </button>
                            </div>
                            {block.cypEnabled && (
                              <div className="grid sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="pf-label">Harga Minimum (Rp) <span className="pf-req">*</span></label>
                                  <input type="text" inputMode="numeric" value={formatRupiah(block.minimumPrice)}
                                    onChange={(e) => updateSeriesBlock(sn, { minimumPrice: parseRupiah(e.target.value) })}
                                    className={`pf-input${errors[`series_${sn}_min`] ? " invalid" : ""}`}
                                    placeholder="350.000" />
                                  {errors[`series_${sn}_min`] && <p className="pf-error">{errors[`series_${sn}_min`]}</p>}
                                </div>
                                <div>
                                  <label className="pf-label">Harga Rekomendasi (Rp)</label>
                                  <input type="text" inputMode="numeric" value={formatRupiah(block.recommendedPrice)}
                                    onChange={(e) => updateSeriesBlock(sn, { recommendedPrice: parseRupiah(e.target.value) })}
                                    className="pf-input"
                                    placeholder={block.price ? formatRupiah(String((parseInt(block.price) || 0) + 30000)) : "—"} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ── Media ── */}
                      <div>
                        <p className="text-sm font-semibold mb-3" style={{ color: "var(--espresso)" }}>
                          <span style={{ color: "var(--gold)" }}>{sn}</span> — Foto &amp; Video
                        </p>
                        {errors[`series_${sn}_media`] && <p className="pf-error mb-2">{errors[`series_${sn}_media`]}</p>}
                        <div className="pf-panel">
                          <label className="pf-drop">
                            <span className="pf-drop-ico"><Upload size={18} /></span>
                            <p className="text-sm font-medium" style={{ color: "var(--espresso)" }}>Upload foto/video untuk {sn}</p>
                            <p className="pf-hint">JPG, PNG, WebP (max 10MB) · MP4, WebM (max 50MB)</p>
                            <input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                              onChange={(e) => handleSeriesFileSelect(e, sn)} className="hidden" />
                          </label>
                          {block.media.length > 0 && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mt-3">
                              {block.media.map((m, idx) => (
                                <div key={m.id} className="pf-thumb group">
                                  {m.uploading ? (
                                    <div className="absolute inset-0 flex items-center justify-center"><Loader2 size={16} className="animate-spin" style={{ color: "var(--gold)" }} /></div>
                                  ) : m.error ? (
                                    <div className="absolute inset-0 flex items-center justify-center p-1"><p className="text-[9px] text-center" style={{ color: "#e74c3c" }}>{m.error}</p></div>
                                  ) : m.isVideo ? (
                                    <video src={m.url || m.preview} className="w-full h-full object-cover" muted />
                                  ) : (
                                    <img src={m.url || m.preview} alt="" className="w-full h-full object-cover" />
                                  )}
                                  {idx === 0 && !m.uploading && !m.error && (
                                    <span className="pf-thumb-tag">Utama</span>
                                  )}
                                  <button onClick={() => removeSeriesMedia(sn, m.id)} className="pf-thumb-x">
                                    <X size={10} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── Stok per Ukuran ── */}
                      <div>
                        <p className="text-sm font-semibold mb-3" style={{ color: "var(--espresso)" }}>
                          <span style={{ color: "var(--gold)" }}>{sn}</span> — Stok Ukuran
                        </p>
                        {errors[`series_${sn}_stock`] && <p className="pf-error mb-2">{errors[`series_${sn}_stock`]}</p>}
                        <div className="pf-panel">
                          <div className="pf-grid-head">
                            <span>Ukuran</span><span>Stok</span><span>Harga Khusus</span><span>SKU</span><span></span>
                          </div>
                          {v0.sizes.map((s, i) => (
                            <div key={i} className="pf-grid-row">
                              <input value={s.size}
                                onChange={(e) => updateSeriesBlockSizeField(sn, i, "size", e.target.value.toUpperCase())}
                                onFocus={(e) => e.target.select()} list="size-suggestions"
                                className="pf-cell text-center" placeholder="—" />
                              <input type="number" value={s.stock || ""}
                                onChange={(e) => updateSeriesBlockSizeField(sn, i, "stock", parseInt(e.target.value) || 0)}
                                placeholder="0" className="pf-cell text-center" />
                              <input type="text" inputMode="numeric" value={formatRupiah(s.priceOverride)}
                                onChange={(e) => updateSeriesBlockSizeField(sn, i, "priceOverride", parseRupiah(e.target.value))}
                                placeholder="—" className="pf-cell" />
                              <input value={s.sku}
                                onChange={(e) => updateSeriesBlockSizeField(sn, i, "sku", e.target.value)}
                                placeholder="—" className="pf-cell" />
                              {v0.sizes.length > 1 && (
                                <button onClick={() => removeSizeFromSeriesBlock(sn, i)} className="pf-rowdel"><Trash2 size={14} /></button>
                              )}
                            </div>
                          ))}
                          <datalist id="size-suggestions">{SIZES.map((sz) => <option key={sz} value={sz} />)}</datalist>
                          <button onClick={() => addSizeToSeriesBlock(sn)} className="pf-add">
                            <Plus size={14} /> Tambah Ukuran
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {selectedSeries.length > 0 && !activeSeriesTab && (
                  <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>Pilih series di atas untuk mengatur harga, media, dan stok</p>
                )}
              </div>
            ) : (
              <>
              {/* Non-Thobe: Varian & Stok */}
              <div className="pf-card p-5 lg:p-6">
                <div className="pf-head">
                  <div className="pf-num">2</div>
                  <div>
                    <h2 className="pf-title">Varian &amp; Stok</h2>
                    <p className="pf-sub">Kelola warna, ukuran, harga khusus, dan stok.</p>
                  </div>
                </div>
                {errors.variants && <p className="pf-error mb-3">{errors.variants}</p>}
                {category === "Thobe" && selectedSeries.length === 0 ? (
                  <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>Pilih minimal 1 series terlebih dahulu</p>
                ) : (
                <>
                  {/* Color chips */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {variants.map((v) => (
                      <button key={v.color} onClick={() => { setActiveColor(v.color); setPreviewIndex(0); }} className={`pf-chip${activeColor === v.color ? " active" : ""}`}>
                        <span className="w-3 h-3 rounded-full" style={{ background: v.hex || colorMap[v.color] || "#ccc", border: "1px solid rgba(42,33,27,.1)" }} />
                        {v.color}
                        <button onClick={(e) => { e.stopPropagation(); removeColor(v.color); }} className="ml-1 hover:opacity-60"><X size={12} /></button>
                      </button>
                    ))}
                    <PresetColorPicker existing={variants.map((v) => v.color)} onAdd={addColor} />
                  </div>
                  {activeVariant && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium" style={{ color: "var(--espresso)" }}>Ukuran untuk <span style={{ color: "var(--gold)" }}>{activeColor}</span></p>
                      <div className="pf-grid-head">
                        <span>Ukuran</span><span>Stok</span><span>Harga Khusus</span><span>SKU</span><span></span>
                      </div>
                      {activeVariant.sizes.map((s, i) => (
                        <div key={i} className="pf-grid-row">
                          <input value={s.size} onChange={(e) => updateSizeField(activeColor!, i, "size", e.target.value.toUpperCase())} onFocus={(e) => e.target.select()} list="size-suggestions" className="pf-cell text-center" placeholder="—" />
                          <input type="number" value={s.stock || ""} onChange={(e) => updateSizeField(activeColor!, i, "stock", parseInt(e.target.value) || 0)} placeholder="0" className="pf-cell text-center" />
                          <input type="text" inputMode="numeric" value={formatRupiah(s.priceOverride)} onChange={(e) => updateSizeField(activeColor!, i, "priceOverride", parseRupiah(e.target.value))} placeholder="—" className="pf-cell" />
                          <input value={s.sku} onChange={(e) => updateSizeField(activeColor!, i, "sku", e.target.value)} placeholder="—" className="pf-cell" />
                          {activeVariant.sizes.length > 1 && (
                            <button onClick={() => removeSize(activeColor!, i)} className="pf-rowdel"><Trash2 size={14} /></button>
                          )}
                        </div>
                      ))}
                      <datalist id="size-suggestions">{SIZES.map((sz) => <option key={sz} value={sz} />)}</datalist>
                      <button onClick={() => addSize(activeColor!)} className="pf-add"><Plus size={14} /> Tambah Ukuran</button>
                    </div>
                  )}
                  {variants.length === 0 && (
                    <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>Pilih warna terlebih dahulu untuk mengatur ukuran dan stok</p>
                  )}
                </>
                )}
              </div>

              {/* Non-Thobe: Media */}
              <div className="pf-card p-5 lg:p-6">
                <div className="pf-head">
                  <div className="pf-num">3</div>
                  <div>
                    <h2 className="pf-title">Media</h2>
                    <p className="pf-sub">Foto &amp; video produk per warna.</p>
                  </div>
                </div>
                {errors.media && <p className="pf-error mb-3">{errors.media}</p>}
                {!activeColor ? (
                  <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>Pilih warna terlebih dahulu untuk upload media</p>
                ) : (
                  <div>
                    <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>Upload untuk warna: <span className="font-medium" style={{ color: "var(--gold)" }}>{activeColor}</span></p>
                    <label className="pf-drop">
                      <span className="pf-drop-ico"><Upload size={20} /></span>
                      <p className="text-sm font-medium" style={{ color: "var(--espresso)" }}>Klik atau seret file ke sini</p>
                      <p className="pf-hint">JPG, PNG, WebP (max 10MB) · MP4, WebM (max 50MB)</p>
                      <input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(e) => handleFileSelect(e, activeColor || "default")} className="hidden" />
                    </label>
                    <div className="flex gap-2 mt-2.5">
                      <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMediaByUrl(); } }} placeholder="atau tempel URL gambar / video…" className="pf-input flex-1" />
                      <button type="button" onClick={addMediaByUrl} className="pf-btn pf-btn-primary shrink-0">Tambah</button>
                    </div>
                    <p className="pf-hint">Foto pertama = foto utama di katalog.</p>
                    {activeMedia.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                        {activeMedia.map((m, idx) => (
                          <div key={m.id} className="pf-thumb group cursor-pointer"
                            onClick={() => { if (!m.uploading && !m.error) { setPreviewIndex(idx); } }}>
                            {m.uploading ? (
                              <div className="absolute inset-0 flex items-center justify-center"><Loader2 size={20} className="animate-spin" style={{ color: "var(--gold)" }} /></div>
                            ) : m.error ? (
                              <div className="absolute inset-0 flex items-center justify-center p-2"><p className="text-[10px] text-center" style={{ color: "#e74c3c" }}>{m.error}</p></div>
                            ) : m.isVideo ? (
                              <video src={m.url || m.preview} className="w-full h-full object-cover" muted loop playsInline onMouseEnter={(e) => (e.target as HTMLVideoElement).play()} onMouseLeave={(e) => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0; }} />
                            ) : (
                              <img src={m.url || m.preview} alt="" className="w-full h-full object-cover" />
                            )}
                            {idx === 0 && !m.uploading && !m.error && (
                              <span className="pf-thumb-tag">Utama</span>
                            )}
                            {m.isVideo && <div className="absolute top-1.5 left-1.5"><Video size={12} style={{ color: "white" }} /></div>}
                            <button onClick={(e) => { e.stopPropagation(); removeMedia(m.id); }} className="pf-thumb-x">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              </>
            )}
          </div>

          {/* Right: Preview sidebar */}
          <div className="hidden lg:block sticky top-24">
            <div className="pf-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif italic text-lg" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Preview Produk</h3>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: "rgba(181,140,74,.1)", color: "var(--gold-deep)", border: "1px solid rgba(181,140,74,.25)" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--gold)" }} /> Live
                </span>
              </div>

              {/* Main image / video */}
              <div className="aspect-[4/5] rounded-2xl overflow-hidden mb-3" style={{ background: "#e8dfd1", border: "1px solid rgba(64,50,37,.08)" }}>
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
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{category || "Kategori"}{activeSeriesTab && category === "Thobe" ? ` · ${activeSeriesTab}` : ""}</p>
              <p className="text-xl font-serif italic mt-1.5" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--gold)" }}>
                {category === "Thobe" && activeSeriesTab && seriesBlocks[activeSeriesTab] ? (
                  (() => {
                    const b = seriesBlocks[activeSeriesTab];
                    return b.cypEnabled
                      ? (b.minimumPrice ? `Rp ${formatRupiah(b.minimumPrice)}` : "Rp 0")
                      : (b.price ? `Rp ${formatRupiah(b.price)}` : "Rp 0");
                  })()
                ) : cypEnabled
                  ? (minimumPrice ? `Rp ${formatRupiah(minimumPrice)}` : recommendedPrice ? `Rp ${formatRupiah(recommendedPrice)}` : "Rp 0")
                  : (basePrice ? `Rp ${formatRupiah(basePrice)}` : "Rp 0")
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

      {/* Mobile sticky save button */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-4 pb-4 pt-3" style={{ background: "linear-gradient(to top, var(--cream) 70%, transparent)" }}>
        <button onClick={handleSubmit} disabled={saving} className="pf-btn pf-btn-primary w-full" style={{ paddingTop: ".85rem", paddingBottom: ".85rem", fontSize: ".9rem" }}>
          {saving ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</> : <><Check size={14} /> Simpan Produk</>}
        </button>
      </div>

      <style jsx global>{`
        .card { background: #fffdfb; border: 1px solid rgba(64,50,37,.06); border-radius: 1rem; box-shadow: 0 1px 2px rgba(64,50,37,.03); }

        .pf-card {
          background: #fffdfb;
          border: 1px solid rgba(64,50,37,.07);
          border-radius: 1.25rem;
          box-shadow: 0 1px 2px rgba(64,50,37,.03), 0 18px 40px -32px rgba(45,33,27,.35);
        }
        .pf-head {
          display: flex; align-items: flex-start; gap: .85rem;
          padding-bottom: 1rem; margin-bottom: 1.25rem;
          border-bottom: 1px solid rgba(64,50,37,.07);
        }
        .pf-num {
          flex: none; width: 2.3rem; height: 2.3rem; border-radius: .8rem;
          display: flex; align-items: center; justify-content: center;
          font-size: .8rem; font-weight: 700; color: var(--gold-deep);
          background: linear-gradient(135deg, rgba(181,140,74,.16), rgba(181,140,74,.05));
          border: 1px solid rgba(181,140,74,.25);
        }
        .pf-title {
          font-family: var(--font-cormorant), Georgia, serif; font-style: italic;
          font-size: 1.35rem; line-height: 1.1; color: var(--espresso);
        }
        .pf-sub { font-size: .74rem; color: var(--text-muted); margin-top: .18rem; line-height: 1.4; }
        .pf-label {
          display: block; font-size: .78rem; font-weight: 600;
          color: var(--text-secondary); margin-bottom: .4rem;
        }
        .pf-req { color: var(--gold); }
        .pf-input, .pf-select, .pf-textarea {
          width: 100%; border-radius: .8rem; border: 1px solid rgba(64,50,37,.14);
          background: #fff; color: var(--espresso); font-size: .875rem;
          padding: .7rem .9rem; outline: none;
          transition: border-color .18s ease, box-shadow .18s ease;
        }
        .pf-textarea { resize: none; line-height: 1.55; }
        .pf-select { appearance: none; padding-right: 2.2rem; }
        .pf-input::placeholder, .pf-textarea::placeholder { color: var(--text-muted); }
        .pf-input:focus, .pf-select:focus, .pf-textarea:focus {
          border-color: var(--gold); box-shadow: 0 0 0 3px rgba(181,140,74,.14);
        }
        .pf-input.invalid, .pf-select.invalid, .pf-textarea.invalid { border-color: #e74c3c; }
        .pf-hint { font-size: .7rem; color: var(--text-muted); margin-top: .35rem; }
        .pf-error { font-size: .72rem; color: #e74c3c; margin-top: .35rem; }
        .pf-selectwrap { position: relative; }
        .pf-selectico {
          position: absolute; right: .85rem; top: 50%; transform: translateY(-50%);
          pointer-events: none; color: var(--text-muted);
        }
        .pf-panel {
          border-radius: 1rem; border: 1px solid rgba(64,50,37,.08);
          background: rgba(255,255,255,.65); padding: 1rem;
        }
        .pf-panel.accent { background: rgba(181,140,74,.06); border-color: rgba(181,140,74,.28); }
        .pf-panel.flat { background: rgba(64,50,37,.03); border-color: rgba(64,50,37,.09); }
        .pf-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: .45rem;
          border-radius: .8rem; font-size: .8rem; font-weight: 600;
          padding: .6rem .95rem; border: 1px solid transparent;
          transition: filter .18s ease, background .18s ease, border-color .18s ease;
        }
        .pf-btn-primary {
          background: linear-gradient(135deg, var(--gold), var(--gold-deep));
          color: #fff; box-shadow: 0 10px 22px -12px rgba(150,116,47,.75);
        }
        .pf-btn-primary:hover { filter: brightness(1.05); }
        .pf-btn-primary:disabled { opacity: .6; }
        .pf-btn-ghost { background: #fff; border-color: rgba(64,50,37,.14); color: var(--espresso); }
        .pf-btn-ghost:hover { background: var(--bg-secondary); }
        .pf-btn-outline {
          background: transparent; border-color: rgba(181,140,74,.5);
          border-style: dashed; color: var(--gold-deep);
        }
        .pf-btn-outline:hover { background: rgba(181,140,74,.08); }
        .pf-btn-danger { background: transparent; border-color: rgba(231,76,60,.3); color: #e74c3c; }
        .pf-btn-danger:hover { background: rgba(231,76,60,.07); }
        .pf-toggle {
          position: relative; width: 2.6rem; height: 1.45rem; border-radius: 999px;
          flex: none; transition: background .2s ease;
        }
        .pf-toggle-knob {
          position: absolute; top: .15rem; left: .15rem; width: 1.15rem; height: 1.15rem;
          border-radius: 999px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.25);
          transition: transform .2s ease;
        }
        .pf-chip {
          display: inline-flex; align-items: center; gap: .4rem;
          padding: .4rem .85rem; border-radius: 999px; font-size: .75rem; font-weight: 600;
          color: var(--coffee); background: transparent;
          border: 1px solid rgba(201,183,156,.45);
          transition: all .18s ease;
        }
        .pf-chip:hover { border-color: var(--gold); color: var(--espresso); background: rgba(181,140,74,.06); }
        .pf-chip.active { background: var(--espresso); color: var(--cream); border-color: var(--espresso); }
        .pf-tab {
          display: inline-flex; align-items: center; gap: .4rem;
          padding: .55rem 1.05rem; border-radius: .8rem; font-size: .78rem; font-weight: 600;
          color: var(--coffee); background: transparent; border: 1px solid rgba(201,183,156,.45);
          transition: all .18s ease;
        }
        .pf-tab:hover { border-color: var(--gold); background: rgba(181,140,74,.06); }
        .pf-tab.active { background: var(--espresso); color: var(--cream); border-color: var(--espresso); }
        .pf-dot { width: .4rem; height: .4rem; border-radius: 999px; background: #e74c3c; display: inline-block; margin-left: .4rem; }
        .pf-drop {
          display: block; border-radius: 1rem; text-align: center; cursor: pointer;
          padding: 1.5rem 1.25rem; border: 2px dashed rgba(201,183,156,.5);
          background: rgba(255,255,255,.55); transition: border-color .2s ease, background .2s ease;
        }
        .pf-drop:hover { border-color: var(--gold); background: rgba(181,140,74,.05); }
        .pf-drop-ico {
          width: 2.75rem; height: 2.75rem; border-radius: 999px; margin: 0 auto .6rem;
          display: flex; align-items: center; justify-content: center;
          background: rgba(181,140,74,.1); color: var(--gold-deep);
        }
        .pf-thumb {
          position: relative; aspect-ratio: 1 / 1; border-radius: .85rem; overflow: hidden;
          background: #e8dfd1;
        }
        .pf-thumb-x {
          position: absolute; top: .35rem; right: .35rem; width: 1.5rem; height: 1.5rem;
          border-radius: 999px; display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,.62); color: #fff; opacity: 0; transition: opacity .18s ease;
        }
        .pf-thumb:hover .pf-thumb-x { opacity: 1; }
        .pf-thumb-tag {
          position: absolute; bottom: .35rem; left: .35rem; border-radius: .35rem;
          padding: .1rem .35rem; font-size: .55rem; font-weight: 600; letter-spacing: .02em;
          color: #fff; background: rgba(0,0,0,.65);
        }
        .pf-grid-head {
          display: grid; grid-template-columns: 72px 80px 112px 112px 36px;
          gap: .5rem; font-size: .68rem; font-weight: 600; letter-spacing: .02em;
          color: var(--text-muted); margin-bottom: .35rem;
        }
        .pf-grid-row {
          display: grid; grid-template-columns: 72px 80px 112px 112px 36px;
          gap: .5rem; align-items: center; margin-bottom: .4rem;
        }
        .pf-cell {
          border-radius: .6rem; border: 1px solid rgba(64,50,37,.14);
          background: #fff; color: var(--espresso); font-size: .85rem;
          padding: .5rem .65rem; outline: none; width: 100%;
          transition: border-color .18s ease, box-shadow .18s ease;
        }
        .pf-cell:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(181,140,74,.14); }
        .pf-rowdel {
          padding: .4rem; border-radius: .6rem; color: #e74c3c;
          display: flex; align-items: center; justify-content: center;
        }
        .pf-rowdel:hover { background: rgba(231,76,60,.08); }
        .pf-add {
          display: inline-flex; align-items: center; gap: .4rem;
          font-size: .8rem; font-weight: 600; color: var(--gold-deep); margin-top: .35rem;
        }
        .pf-add:hover { color: var(--gold); }
      `}</style>
    </section>
    </AdminShell>
  );
}
