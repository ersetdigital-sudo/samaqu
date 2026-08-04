"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, Upload, Image as ImageIcon, Video, Loader2, Trash2, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { colorMap } from "@/lib/katalog-data";
import AdminShell from "@/components/AdminShell";
import JenisKainForm from "@/components/JenisKainForm";
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
  productId: string; // existing product ID (for update) or "" for new
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

function EditSeriesBlock({ sn, block, errors, updateSeriesBlock, addSizeToSeriesBlock, removeSizeFromSeriesBlock, updateSeriesBlockSizeField, handleSeriesFileSelect, removeSeriesMedia }: {
  sn: string;
  block: SeriesBlock;
  errors: Record<string, string>;
  updateSeriesBlock: (s: string, p: Partial<SeriesBlock>) => void;
  addSizeToSeriesBlock: (s: string) => void;
  removeSizeFromSeriesBlock: (s: string, i: number) => void;
  updateSeriesBlockSizeField: (s: string, i: number, f: string, v: string | number) => void;
  handleSeriesFileSelect: (e: React.ChangeEvent<HTMLInputElement>, s: string) => void;
  removeSeriesMedia: (s: string, id: string) => void;
}) {
  const v0 = block.variants[0];
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--espresso)" }}><span style={{ color: "var(--gold)" }}>{sn}</span> — Harga</p>
        <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,.6)", border: "1px solid rgba(64,50,37,.06)" }}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Harga Dasar (Rp) <span style={{ color: "var(--gold)" }}>*</span></label>
              <input type="text" inputMode="numeric" value={formatRupiah(block.price)} onChange={(e) => updateSeriesBlock(sn, { price: parseRupiah(e.target.value) })} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: `1px solid ${errors[`series_${sn}_price`] ? "#e74c3c" : "rgba(64,50,37,.15)"}`, background: "white", color: "var(--espresso)" }} placeholder="389.000" />
              {errors[`series_${sn}_price`] && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors[`series_${sn}_price`]}</p>}
            </div>
          </div>
          <div className="mt-4 p-4 rounded-xl" style={{ background: block.cypEnabled ? "rgba(181,140,74,.06)" : "rgba(64,50,37,.02)", border: `1px solid ${block.cypEnabled ? "rgba(181,140,74,.3)" : "rgba(64,50,37,.1)"}` }}>
            <div className="flex items-center justify-between mb-3">
              <div><p className="text-sm font-medium" style={{ color: "var(--espresso)" }}>Create Your Price</p></div>
              <button type="button" onClick={() => updateSeriesBlock(sn, { cypEnabled: !block.cypEnabled })} className="relative w-11 h-6 rounded-full transition-colors duration-200" style={{ background: block.cypEnabled ? "var(--gold)" : "rgba(64,50,37,.2)" }}>
                <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200" style={{ transform: block.cypEnabled ? "translateX(20px)" : "translateX(0)" }} />
              </button>
            </div>
            {block.cypEnabled && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Harga Minimum (Rp) <span style={{ color: "var(--gold)" }}>*</span></label>
                  <input type="text" inputMode="numeric" value={formatRupiah(block.minimumPrice)} onChange={(e) => updateSeriesBlock(sn, { minimumPrice: parseRupiah(e.target.value) })} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: `1px solid ${errors[`series_${sn}_min`] ? "#e74c3c" : "rgba(64,50,37,.15)"}`, background: "white", color: "var(--espresso)" }} placeholder="350.000" />
                  {errors[`series_${sn}_min`] && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors[`series_${sn}_min`]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Harga Rekomendasi (Rp)</label>
                  <input type="text" inputMode="numeric" value={formatRupiah(block.recommendedPrice)} onChange={(e) => updateSeriesBlock(sn, { recommendedPrice: parseRupiah(e.target.value) })} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="—" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--espresso)" }}><span style={{ color: "var(--gold)" }}>{sn}</span> — Foto & Video</p>
        {errors[`series_${sn}_media`] && <p className="text-[11px] mb-2" style={{ color: "#e74c3c" }}>{errors[`series_${sn}_media`]}</p>}
        <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,.6)", border: "1px solid rgba(64,50,37,.06)" }}>
          <label className="block rounded-xl p-5 text-center cursor-pointer transition-all hover:border-[var(--gold)]" style={{ border: "2px dashed rgba(201,183,156,.3)", background: "rgba(255,255,255,.5)" }}>
            <Upload size={20} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--espresso)" }}>Upload untuk {sn}</p>
            <input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(e) => handleSeriesFileSelect(e, sn)} className="hidden" />
          </label>
          {block.media.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
              {block.media.map((m, idx) => (
                <div key={m.id} className="relative aspect-square rounded-lg overflow-hidden group" style={{ background: "#e8dfd1" }}>
                  {m.uploading ? <div className="absolute inset-0 flex items-center justify-center"><Loader2 size={16} className="animate-spin" style={{ color: "var(--gold)" }} /></div>
                  : m.error ? <div className="absolute inset-0 flex items-center justify-center p-1"><p className="text-[9px] text-center" style={{ color: "#e74c3c" }}>{m.error}</p></div>
                  : m.isVideo ? <video src={m.url || m.preview} className="w-full h-full object-cover" muted />
                  : <img src={m.url || m.preview} alt="" className="w-full h-full object-cover" />}
                  {idx === 0 && !m.uploading && !m.error && <span className="absolute bottom-1 left-1 rounded px-1 py-0.5 text-[8px] font-medium text-white" style={{ background: "rgba(0,0,0,.65)" }}>Utama</span>}
                  <button onClick={() => removeSeriesMedia(sn, m.id)} className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,.6)", color: "white" }}><X size={10} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--espresso)" }}><span style={{ color: "var(--gold)" }}>{sn}</span> — Stok Ukuran</p>
        {errors[`series_${sn}_stock`] && <p className="text-[11px] mb-2" style={{ color: "#e74c3c" }}>{errors[`series_${sn}_stock`]}</p>}
        <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,.6)", border: "1px solid rgba(64,50,37,.06)" }}>
          <div className="grid grid-cols-[72px_80px_112px_112px_36px] gap-2 text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>
            <span>Ukuran</span><span>Stok</span><span>Harga Khusus</span><span>SKU</span><span></span>
          </div>
          {v0.sizes.map((s, i) => (
            <div key={i} className="grid grid-cols-[72px_80px_112px_112px_36px] gap-2 items-center mb-1.5">
              <input value={s.size} onChange={(e) => updateSeriesBlockSizeField(sn, i, "size", e.target.value.toUpperCase())} onFocus={(e) => e.target.select()} list="size-suggestions" className="rounded-lg px-2.5 py-2 text-sm outline-none text-center" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="—" />
              <input type="number" value={s.stock || ""} onChange={(e) => updateSeriesBlockSizeField(sn, i, "stock", parseInt(e.target.value) || 0)} placeholder="0" className="rounded-lg px-2.5 py-2 text-sm outline-none text-center" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
              <input type="text" inputMode="numeric" value={formatRupiah(s.priceOverride)} onChange={(e) => updateSeriesBlockSizeField(sn, i, "priceOverride", parseRupiah(e.target.value))} placeholder="—" className="rounded-lg px-2.5 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
              <input value={s.sku} onChange={(e) => updateSeriesBlockSizeField(sn, i, "sku", e.target.value)} placeholder="—" className="rounded-lg px-2.5 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
              {v0.sizes.length > 1 && <button onClick={() => removeSizeFromSeriesBlock(sn, i)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" style={{ color: "#e74c3c" }}><Trash2 size={14} /></button>}
            </div>
          ))}
          <datalist id="size-suggestions">{SIZES.map((sz) => <option key={sz} value={sz} />)}</datalist>
          <button onClick={() => addSizeToSeriesBlock(sn)} className="flex items-center gap-1.5 text-sm font-medium mt-2" style={{ color: "var(--gold)" }}><Plus size={14} /> Tambah Ukuran</button>
        </div>
      </div>
    </div>
  );
}

export default function EditProdukPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const storeSettings = useStoreSettings();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [originalName, setOriginalName] = useState("");
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
  const [useCustomCypMicrocopy, setUseCustomCypMicrocopy] = useState(false);
  const [cypMicrocopyOverride, setCypMicrocopyOverride] = useState("");

  const [variants, setVariants] = useState<Variant[]>([]);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Thobe multi-series
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const [seriesBlocks, setSeriesBlocks] = useState<Record<string, SeriesBlock>>({});
  const [activeSeriesTab, setActiveSeriesTab] = useState<string | null>(null);
  // Series duplikat (2+ row dgn nama series sama) yang terdeteksi saat load — informatif saja
  const [duplicateSeriesWarning, setDuplicateSeriesWarning] = useState<string[]>([]);

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
        setOriginalName(product.name);
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
        setCypMicrocopyOverride(product.cyp_microcopy_override || "");
        setUseCustomCypMicrocopy(!!product.cyp_microcopy_override);

        // Thobe multi-series: load siblings (same name + category).
        // PENTING: selalu muat mode multi-series untuk Thobe, meskipun cuma 1 row —
        // kalau tidak, checklist series tidak ter-restore dan save akan membuat row baru.
        if (product.category === "Thobe" && product.name) {
          const { data: siblings } = await supabase
            .from("products")
            .select("id, name, series, price, minimum_price, recommended_price, create_your_price_enabled, cyp_microcopy_override, image, images, created_at")
            .eq("category", "Thobe")
            .eq("name", product.name)
            .order("created_at", { ascending: true });

          if (siblings && siblings.length > 0) {
            // Multiple series products exist for this name
            const blocks: Record<string, SeriesBlock> = {};
            const seriesNames: string[] = [];
            const seenSeries = new Set<string>();
            const duplicateSeries: string[] = [];

            for (const sib of siblings) {
              if (!sib.series) continue;
              // Dedupe: kalau ada 2+ row dgn series sama (duplikat data), pakai row
              // yang paling lama (created_at pertama) & catat sebagai peringatan —
              // jangan hapus otomatis, biar admin putuskan via laporan audit.
              const seriesKey = sib.series.toLowerCase();
              if (seenSeries.has(seriesKey)) {
                if (!duplicateSeries.includes(sib.series)) duplicateSeries.push(sib.series);
                continue;
              }
              seenSeries.add(seriesKey);
              seriesNames.push(sib.series);

              // Fetch variants for this sibling
              const { data: sibVariants } = await supabase.from("product_variants").select("*").eq("product_id", sib.id);
              const colorGroups: Record<string, Variant> = {};
              if (sibVariants) {
                sibVariants.forEach((v: { color: string; hex: string | null; size: string; stock: number; price_override: number | null; sku: string | null }) => {
                  if (!colorGroups[v.color]) colorGroups[v.color] = { color: v.color, hex: v.hex || "#141414", sizes: [] };
                  colorGroups[v.color].sizes.push({ size: v.size, stock: v.stock, priceOverride: v.price_override ? String(v.price_override) : "", sku: v.sku || "" });
                });
              }

              // Fetch images for this sibling
              const { data: sibImages } = await supabase.from("product_images").select("*").eq("product_id", sib.id).order("display_order");
              const sibMedia: MediaFile[] = sibImages ? sibImages.map((img: { id: string; url: string; is_video: boolean; color: string }) => ({
                id: img.id, url: img.url, isVideo: img.is_video, color: img.color, preview: img.url, uploading: false,
              })) : [];

              const varList = Object.values(colorGroups);
              blocks[sib.series] = {
                productId: sib.id,
                price: String(sib.price || ""),
                cypEnabled: sib.create_your_price_enabled || false,
                minimumPrice: sib.minimum_price ? String(sib.minimum_price) : "",
                recommendedPrice: sib.recommended_price ? String(sib.recommended_price) : "",
                useCustomCypMicrocopy: !!sib.cyp_microcopy_override,
                cypMicrocopyOverride: sib.cyp_microcopy_override || "",
                media: sibMedia,
                variants: varList.length > 0 ? varList : [{ color: "default", hex: "#141414", sizes: [{ size: "M", stock: 0, priceOverride: "", sku: "" }] }],
                activeColor: varList[0]?.color || "default",
              };
            }

            setSelectedSeries(seriesNames);
            setSeriesBlocks(blocks);
            setDuplicateSeriesWarning(duplicateSeries);
            // Set active tab to the current product's series
            if (product.series && blocks[product.series]) {
              setActiveSeriesTab(product.series);
            } else {
              setActiveSeriesTab(seriesNames[0] || null);
            }

            // Don't load into global states for Thobe
            setVariants([]);
            setMedia([]);
            setLoading(false);
            return;
          }
        }

        // Non-Thobe or single Thobe: load into global states (existing logic)
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

  // Tambah series baru → simpan ke Supabase (defined in Thobe multi-series helpers below)

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

  // ── Thobe multi-series helpers ──
  function toggleSeries(seriesName: string) {
    setSelectedSeries((prev) => {
      const next = prev.includes(seriesName)
        ? prev.filter((s) => s !== seriesName)
        : [...prev, seriesName];
      if (!prev.includes(seriesName)) {
        setSeriesBlocks((blocks) => ({
          ...blocks,
          [seriesName]: blocks[seriesName] || {
            productId: "",
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
    setSeriesBlocks((prev) => ({ ...prev, [seriesName]: { ...prev[seriesName], ...patch } }));
  }

  function addSizeToSeriesBlock(seriesName: string) {
    setSeriesBlocks((prev) => {
      const block = prev[seriesName];
      if (!block) return prev;
      const v = block.variants[0];
      const usedSizes = v?.sizes.map((s) => s.size) || [];
      const nextSize = SIZES.find((s) => !usedSizes.includes(s)) || "M";
      return { ...prev, [seriesName]: { ...block, variants: [{ ...v, sizes: [...v.sizes, { size: nextSize, stock: 0, priceOverride: "", sku: "" }] }] } };
    });
  }

  function removeSizeFromSeriesBlock(seriesName: string, sizeIdx: number) {
    setSeriesBlocks((prev) => {
      const block = prev[seriesName];
      if (!block) return prev;
      const v = block.variants[0];
      return { ...prev, [seriesName]: { ...block, variants: [{ ...v, sizes: v.sizes.filter((_, i) => i !== sizeIdx) }] } };
    });
  }

  function updateSeriesBlockSizeField(seriesName: string, sizeIdx: number, field: string, value: string | number) {
    setSeriesBlocks((prev) => {
      const block = prev[seriesName];
      if (!block) return prev;
      const v = block.variants[0];
      const sizes = [...v.sizes];
      sizes[sizeIdx] = { ...sizes[sizeIdx], [field]: value };
      return { ...prev, [seriesName]: { ...block, variants: [{ ...v, sizes }] } };
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
      if (file.size > maxSize) { alert(`${file.name} terlalu besar`); continue; }
      const validTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"];
      if (!validTypes.includes(file.type)) { alert(`${file.name} format tidak didukung`); continue; }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      newMedia.push({ id, file, url: "", isVideo, color: "default", preview: URL.createObjectURL(file), uploading: true });
    }
    updateSeriesBlock(seriesName, { media: [...block.media, ...newMedia] });
    for (const item of newMedia) {
      try {
        const url = await uploadToCloudinary(item.file!);
        setSeriesBlocks((prev) => ({ ...prev, [seriesName]: { ...prev[seriesName], media: prev[seriesName].media.map((m) => m.id === item.id ? { ...m, url, uploading: false } : m) } }));
      } catch {
        setSeriesBlocks((prev) => ({ ...prev, [seriesName]: { ...prev[seriesName], media: prev[seriesName].media.map((m) => m.id === item.id ? { ...m, uploading: false, error: "Upload gagal" } : m) } }));
      }
    }
    e.target.value = "";
  }

  function removeSeriesMedia(seriesName: string, mediaId: string) {
    setSeriesBlocks((prev) => {
      const block = prev[seriesName];
      if (!block) return prev;
      const item = block.media.find((m) => m.id === mediaId);
      if (item?.preview && item.preview !== item.url) URL.revokeObjectURL(item.preview);
      return { ...prev, [seriesName]: { ...block, media: block.media.filter((m) => m.id !== mediaId) } };
    });
  }

  async function addNewSeries() {
    const nama = newSeriesName.trim();
    if (!nama) return;
    if (!seriesList.find((s) => s.toLowerCase() === nama.toLowerCase())) {
      await supabase.from("product_series").upsert({ name: nama }, { onConflict: "name" });
      setSeriesList((prev) => [...prev, nama].sort());
    }
    if (category === "Thobe" && !selectedSeries.includes(nama)) {
      toggleSeries(nama);
    } else {
      setSeries(nama);
    }
    setShowNewSeries(false);
    setNewSeriesName("");
  }
  // ── End Thobe multi-series helpers ──

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nama produk wajib diisi";
    if (!category) e.category = "Kategori wajib dipilih";
    if ((category === "Thobe" || category === "Kandora") && !selectedJenisKainId) e.jenisKain = "Jenis Kain wajib dipilih";

    if (category === "Thobe") {
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
      if (!cypEnabled && (!basePrice || parseInt(basePrice) <= 0)) e.basePrice = "Harga wajib diisi";
      if (cypEnabled && (!minimumPrice || parseInt(minimumPrice) <= 0)) e.minimumPrice = "Harga Minimum wajib diisi jika Create Your Price aktif";
      if (cypEnabled && minimumPrice && basePrice && parseInt(minimumPrice) > parseInt(basePrice)) e.minimumPrice = "Harga Minimum tidak boleh lebih besar dari Harga Dasar";
      if (cypEnabled && recommendedPrice && minimumPrice && parseInt(recommendedPrice) < parseInt(minimumPrice)) e.recommendedPrice = "Harga Rekomendasi tidak boleh kurang dari Harga Minimum";
      if (variants.length === 0) e.variants = "Minimal 1 varian warna";
      const hasSize = variants.some((v) => v.sizes.some((s) => s.stock > 0));
      if (!hasSize) e.variants = "Minimal 1 ukuran dengan stok > 0";
      const uploadedMedia = media.filter((m) => m.url && !m.uploading);
      if (uploadedMedia.length === 0) e.media = "Minimal 1 media";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    try {
      if (category === "Thobe" && selectedSeries.length > 0) {
        // ── Thobe multi-series: update/create product rows per series ──
        for (const seriesName of selectedSeries) {
          const block = seriesBlocks[seriesName];
          if (!block) continue;
          const seriesNameSlug = seriesName.toLowerCase().replace(/\s+/g, "-");
          // ID stabil: row yang sudah ada di-update pakai ID-nya, sehingga URL &
          // semua data (checklist, harga, foto, stok) tetap terjaga. Row baru
          // dibuat dari base ID nama produk — BUKAN dari ID row saat ini —
          // supaya ID tidak menumpuk (mis. ...-bayati-bayati-bayati) tiap save.
          const seriesSlug = block.productId || `${generateSlug(name) || slug}-${seriesNameSlug}`;
          const blockPrice = block.cypEnabled
            ? (parseInt(block.price) || parseInt(block.minimumPrice) || 0)
            : parseInt(block.price);

          await supabase.from("products").upsert({
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
          }, { onConflict: "id" });

          // Delete old + re-insert variants
          await supabase.from("product_variants").delete().eq("product_id", seriesSlug);
          const variantRows = block.variants.flatMap((v, vi) => v.sizes.map((s, si) => ({
            product_id: seriesSlug, color: v.color, hex: v.hex || null, size: s.size, stock: s.stock,
            price_override: s.priceOverride ? parseInt(s.priceOverride) : null, sku: s.sku || null,
            display_order: vi * 100 + si,
          })));
          if (variantRows.length > 0) await supabase.from("product_variants").upsert(variantRows, { onConflict: "product_id,color,size" });

          // Delete old + re-insert images
          await supabase.from("product_images").delete().eq("product_id", seriesSlug);
          const imageRows = block.media.filter((m) => m.url).map((m, i) => ({
            product_id: seriesSlug, color: m.color, url: m.url, is_video: m.isVideo, display_order: i,
          }));
          if (imageRows.length > 0) await supabase.from("product_images").insert(imageRows);
        }

        // Hapus row produk Thobe senama (nama sekarang + nama asli untuk kasus
        // rename) yang series-nya TIDAK dicentang lagi. Duplikat (series sama,
        // ID berbeda) tidak dihapus otomatis — keputusan ada di laporan audit.
        const namesToCheck = Array.from(new Set([name, originalName].filter(Boolean)));
        const { data: oldSiblings } = await supabase.from("products").select("id, series").eq("category", "Thobe").in("name", namesToCheck);
        if (oldSiblings) {
          for (const old of oldSiblings) {
            if (!old.series || !selectedSeries.includes(old.series)) {
              await supabase.from("product_variants").delete().eq("product_id", old.id);
              await supabase.from("product_images").delete().eq("product_id", old.id);
              await supabase.from("products").delete().eq("id", old.id);
            }
          }
        }
      } else {
        // ── Non-Thobe: existing single-product logic ──
        await supabase.from("products").upsert({
          id: slug, name, category, description: description || null, price: cypEnabled ? (parseInt(basePrice) || parseInt(minimumPrice) || 0) : parseInt(basePrice),
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
        }, { onConflict: "id" });

        await supabase.from("product_variants").delete().eq("product_id", slug);
        const variantRows = variants.flatMap((v, vi) => v.sizes.map((s, si) => ({
          product_id: slug, color: v.color, hex: v.hex || null, size: s.size, stock: s.stock,
          price_override: s.priceOverride ? parseInt(s.priceOverride) : null, sku: s.sku || null,
          display_order: vi * 100 + si,
        })));
        if (variantRows.length > 0) await supabase.from("product_variants").upsert(variantRows, { onConflict: "product_id,color,size" });

        await supabase.from("product_images").delete().eq("product_id", slug);
        const imageRows = media.filter((m) => m.url).map((m, i) => ({
          product_id: slug, color: m.color, url: m.url, is_video: m.isVideo, display_order: i,
        }));
        if (imageRows.length > 0) await supabase.from("product_images").insert(imageRows);
      }

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
  const activeMedia = category === "Thobe" && activeSeriesTab && seriesBlocks[activeSeriesTab]
    ? seriesBlocks[activeSeriesTab].media
    : category === "Thobe" ? media : media.filter((m) => m.color === activeColor);

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
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Nama Produk</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: `1px solid ${errors.name ? "#e74c3c" : "rgba(64,50,37,.15)"}`, background: "white", color: "var(--espresso)" }} />
                    {errors.name && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Kategori</label>
                    <div className="relative">
                      <select value={category} onChange={(e) => { const val = e.target.value; setCategory(val); if (val !== "Thobe") { setSeries(""); setSelectedSeries([]); setSeriesBlocks({}); } if (val !== "Thobe" && val !== "Kandora") setSelectedJenisKainId(""); }} className="w-full rounded-xl px-4 py-3 text-sm outline-none appearance-none" style={{ border: `1px solid ${errors.category ? "#e74c3c" : "rgba(64,50,37,.15)"}`, background: "white", color: "var(--espresso)" }}>
                        <option value="">Pilih kategori</option>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                    </div>
                    {errors.category && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.category}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Slug</label>
                  <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                  <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>URL: /katalog/{slug || "..."}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Deskripsi</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="Deskripsi produk..." />
                </div>
                {category !== "Thobe" && (
                <div className={cypEnabled ? "" : "grid sm:grid-cols-2 gap-4"}>
                  {!cypEnabled && (<div><label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Harga Dasar (Rp)</label><input type="text" inputMode="numeric" value={formatRupiah(basePrice)} onChange={(e) => setBasePrice(parseRupiah(e.target.value))} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: `1px solid ${errors.basePrice ? "#e74c3c" : "rgba(64,50,37,.15)"}`, background: "white", color: "var(--espresso)" }} placeholder="389.000" />{errors.basePrice && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.basePrice}</p>}</div>)}
                  <div><label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Berat (gram)</label><input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="800" /></div>
                </div>
                )}
                {category === "Thobe" && (<div><label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Berat (gram)</label><input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="800" /></div>)}
                {category !== "Thobe" && (
                <div className="p-4 rounded-xl" style={{ background: cypEnabled ? "rgba(181,140,74,.06)" : "rgba(64,50,37,.02)", border: `1px solid ${cypEnabled ? "rgba(181,140,74,.3)" : "rgba(64,50,37,.1)"}` }}>
                  <div className="flex items-center justify-between mb-3"><div><p className="text-sm font-medium" style={{ color: "var(--espresso)" }}>Create Your Price</p></div>
                    <button type="button" onClick={toggleCyp} className="relative w-11 h-6 rounded-full transition-colors duration-200" style={{ background: cypEnabled ? "var(--gold)" : "rgba(64,50,37,.2)" }}><span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200" style={{ transform: cypEnabled ? "translateX(20px)" : "translateX(0)" }} /></button>
                  </div>
                  {cypEnabled && (<div className="space-y-3">
                    <div><label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Harga Minimum (Rp)</label><input type="text" inputMode="numeric" value={formatRupiah(minimumPrice)} onChange={(e) => setMinimumPrice(parseRupiah(e.target.value))} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: `1px solid ${errors.minimumPrice ? "#e74c3c" : "rgba(64,50,37,.15)"}`, background: "white", color: "var(--espresso)" }} placeholder="350.000" />{errors.minimumPrice && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.minimumPrice}</p>}</div>
                    <div><label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Harga Rekomendasi (Rp)</label><input type="text" inputMode="numeric" value={formatRupiah(recommendedPrice)} onChange={(e) => setRecommendedPrice(parseRupiah(e.target.value))} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="—" /></div>
                  </div>)}
                </div>
                )}
                {(category === "Thobe" || category === "Kandora") && (
                <div><label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Jenis Kain</label>
                  <div className="flex gap-2"><div className="relative flex-1"><select value={selectedJenisKainId} onChange={(e) => setSelectedJenisKainId(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none appearance-none" style={{ border: `1px solid ${errors.jenisKain ? "#e74c3c" : "rgba(64,50,37,.15)"}`, background: "white", color: "var(--espresso)" }}><option value="">Pilih Jenis Kain</option>{jenisKainList.map((jk) => <option key={jk.id} value={jk.id}>{jk.name}</option>)}</select></div>
                    <button type="button" onClick={() => setShowNewKainForm(!showNewKainForm)} className="px-3 py-2 rounded-xl text-xs font-medium shrink-0" style={{ border: "1px dashed rgba(181,140,74,.4)", color: "var(--gold)" }}>+ Baru</button></div>
                  {errors.jenisKain && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.jenisKain}</p>}
                  {showNewKainForm && (<div className="mt-3"><JenisKainForm onSave={(newKain) => { setJenisKainList((prev) => [...prev, { id: newKain.id, name: newKain.name }]); setSelectedJenisKainId(newKain.id); setShowNewKainForm(false); }} onCancel={() => setShowNewKainForm(false)} /></div>)}
                </div>
                )}
                {category === "Thobe" && (
                <div><label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Series</label>
                  {errors.series && <p className="text-[11px] mb-2" style={{ color: "#e74c3c" }}>{errors.series}</p>}
                  {duplicateSeriesWarning.length > 0 && (
                    <p className="text-[11px] mb-2 rounded-lg px-3 py-2" style={{ background: "rgba(231,76,60,.08)", border: "1px solid rgba(231,76,60,.2)", color: "#c0392b" }}>
                      Peringatan: ada {duplicateSeriesWarning.length} series yang datanya duplikat di database ({duplicateSeriesWarning.join(", ")}). Yang tampil di sini adalah entri terlama. Harap bersihkan lewat laporan audit sebelum disimpan agar tidak tersimpan data ganda.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {seriesList.map((s) => (<button key={s} type="button" onClick={() => toggleSeries(s)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all" style={{ background: selectedSeries.includes(s) ? "var(--espresso)" : "transparent", color: selectedSeries.includes(s) ? "var(--cream)" : "var(--coffee)", border: `1px solid ${selectedSeries.includes(s) ? "var(--espresso)" : "rgba(201,183,156,.3)"}` }}>{selectedSeries.includes(s) && <span className="text-[10px]">✓</span>}{s}</button>))}
                    <button type="button" onClick={() => setShowNewSeries(!showNewSeries)} className="px-3 py-1.5 rounded-full text-xs font-medium shrink-0" style={{ border: "1px dashed rgba(181,140,74,.4)", color: "var(--gold)" }}>+ Baru</button>
                  </div>
                  {showNewSeries && (<div className="mb-3 flex gap-2"><input value={newSeriesName} onChange={(e) => setNewSeriesName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNewSeries(); } }} placeholder="Nama series baru…" autoFocus className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} /><button type="button" onClick={addNewSeries} className="px-4 py-2 rounded-xl text-xs font-semibold text-white shrink-0" style={{ background: "var(--gold)" }}>Tambah</button></div>)}
                </div>
                )}
              </div>
            </div>

            {category === "Thobe" && selectedSeries.length > 0 ? (
              <div className="card p-5">
                <h2 className="font-serif italic text-xl mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Series & Harga</h2>
                <div className="flex flex-wrap gap-2 mb-5">
                  {selectedSeries.map((sn) => {
                    const hasError = seriesBlocks[sn] && (errors[`series_${sn}_price`] || errors[`series_${sn}_media`] || errors[`series_${sn}_stock`]);
                    return (<button key={sn} type="button" onClick={() => setActiveSeriesTab(sn)} className="px-4 py-2 rounded-xl text-xs font-semibold transition-all" style={{ background: activeSeriesTab === sn ? "var(--espresso)" : "transparent", color: activeSeriesTab === sn ? "var(--cream)" : "var(--coffee)", border: `1px solid ${activeSeriesTab === sn ? "var(--espresso)" : "rgba(201,183,156,.3)"}` }}>{sn}{hasError && <span className="ml-1.5 w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#e74c3c" }} />}</button>);
                  })}
                </div>
                {activeSeriesTab && seriesBlocks[activeSeriesTab] && (
                  <EditSeriesBlock sn={activeSeriesTab} block={seriesBlocks[activeSeriesTab]} errors={errors} updateSeriesBlock={updateSeriesBlock} addSizeToSeriesBlock={addSizeToSeriesBlock} removeSizeFromSeriesBlock={removeSizeFromSeriesBlock} updateSeriesBlockSizeField={updateSeriesBlockSizeField} handleSeriesFileSelect={handleSeriesFileSelect} removeSeriesMedia={removeSeriesMedia} />
                )}
              </div>
            ) : (
              <>
              <div className="card p-5">
                <h2 className="font-serif italic text-xl mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Varian & Stok</h2>
                {errors.variants && <p className="text-[12px] mb-3" style={{ color: "#e74c3c" }}>{errors.variants}</p>}
                <div className="flex flex-wrap gap-2 mb-4">
                  {variants.map((v) => (<button key={v.color} onClick={() => { setActiveColor(v.color); setPreviewIndex(0); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all" style={{ background: activeColor === v.color ? "var(--espresso)" : "transparent", color: activeColor === v.color ? "var(--cream)" : "var(--coffee)", border: `1px solid ${activeColor === v.color ? "var(--espresso)" : "rgba(201,183,156,.3)"}` }}><span className="w-3 h-3 rounded-full" style={{ background: v.hex || colorMap[v.color] || "#ccc", border: "1px solid rgba(42,33,27,.1)" }} />{v.color}<button onClick={(e) => { e.stopPropagation(); removeColor(v.color); }} className="ml-1 hover:opacity-60"><X size={12} /></button></button>))}
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-xs" style={{ border: "1px dashed rgba(201,183,156,.4)", color: "var(--gold)" }}><input type="color" value={customHex} onChange={(e) => setCustomHex(e.target.value)} className="w-6 h-6 rounded-full border-0 cursor-pointer p-0 bg-transparent" /><input value={customColorName} onChange={(e) => setCustomColorName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomColor(); } }} placeholder="Nama warna…" className="w-[110px] bg-transparent outline-none text-xs" style={{ color: "var(--espresso)" }} /><button type="button" onClick={addCustomColor} className="font-semibold hover:opacity-70">+</button></div>
                </div>
                {activeVariant && (<div className="space-y-3"><p className="text-sm font-medium" style={{ color: "var(--espresso)" }}>Ukuran untuk <span style={{ color: "var(--gold)" }}>{activeColor}</span></p>
                  <div className="grid grid-cols-[72px_80px_112px_112px_36px] gap-2 text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}><span>Ukuran</span><span>Stok</span><span>Harga Khusus</span><span>SKU</span><span></span></div>
                  {activeVariant.sizes.map((s, i) => (<div key={i} className="grid grid-cols-[72px_80px_112px_112px_36px] gap-2 items-center">
                    <input value={s.size} onChange={(e) => updateSizeField(activeColor!, i, "size", e.target.value.toUpperCase())} onFocus={(e) => e.target.select()} list="size-suggestions" className="rounded-lg px-2.5 py-2 text-sm outline-none text-center" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="—" />
                    <input type="number" value={s.stock || ""} onChange={(e) => updateSizeField(activeColor!, i, "stock", parseInt(e.target.value) || 0)} placeholder="0" className="rounded-lg px-2.5 py-2 text-sm outline-none text-center" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                    <input type="text" inputMode="numeric" value={formatRupiah(s.priceOverride)} onChange={(e) => updateSizeField(activeColor!, i, "priceOverride", parseRupiah(e.target.value))} placeholder="—" className="rounded-lg px-2.5 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                    <input value={s.sku} onChange={(e) => updateSizeField(activeColor!, i, "sku", e.target.value)} placeholder="—" className="rounded-lg px-2.5 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                    {activeVariant.sizes.length > 1 && <button onClick={() => removeSize(activeColor!, i)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" style={{ color: "#e74c3c" }}><Trash2 size={14} /></button>}
                  </div>))}
                  <datalist id="size-suggestions">{SIZES.map((sz) => <option key={sz} value={sz} />)}</datalist>
                  <button onClick={() => addSize(activeColor!)} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--gold)" }}><Plus size={14} /> Tambah Ukuran</button>
                </div>)}
              </div>
              <div className="card p-5">
                <h2 className="font-serif italic text-xl mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Media</h2>
                {errors.media && <p className="text-[12px] mb-3" style={{ color: "#e74c3c" }}>{errors.media}</p>}
                {!activeColor ? <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>Pilih warna terlebih dahulu</p> : (
                  <div>
                    <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>Upload untuk: <span className="font-medium" style={{ color: "var(--gold)" }}>{activeColor}</span></p>
                    <label className="block rounded-xl p-6 text-center cursor-pointer transition-all hover:border-[var(--gold)]" style={{ border: "2px dashed rgba(201,183,156,.3)", background: "rgba(255,255,255,.5)" }}>
                      <Upload size={24} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} /><p className="text-sm font-medium" style={{ color: "var(--espresso)" }}>Klik atau seret file</p>
                      <input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(e) => handleFileSelect(e, activeColor || "default")} className="hidden" />
                    </label>
                    <div className="flex gap-2 mt-2.5"><input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMediaByUrl(); } }} placeholder="atau tempel URL gambar / video…" className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} /><button type="button" onClick={addMediaByUrl} className="px-4 py-2 rounded-xl text-xs font-semibold text-white shrink-0" style={{ background: "var(--gold)" }}>Tambah</button></div>
                    {activeMedia.length > 0 && (<div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">{activeMedia.map((m, idx) => (<div key={m.id} className="relative aspect-square rounded-lg overflow-hidden group" style={{ background: "#e8dfd1" }} onClick={() => { if (!m.uploading && !m.error) { setPreviewIndex(idx); } }}>
                      {m.uploading ? <div className="absolute inset-0 flex items-center justify-center"><Loader2 size={20} className="animate-spin" style={{ color: "var(--gold)" }} /></div> : m.isVideo ? <video src={m.url || m.preview} className="w-full h-full object-cover" muted /> : <img src={m.url || m.preview} alt="" className="w-full h-full object-cover" />}
                      <button onClick={(e) => { e.stopPropagation(); removeMedia(m.id); }} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,.6)", color: "white" }}><X size={12} /></button>
                    </div>))}</div>)}
                  </div>
                )}
              </div>
              </>
            )}
          </div>

          <div className="hidden lg:block sticky top-24">
            <div className="card p-5">
              <h3 className="font-serif italic text-lg mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Preview Produk</h3>
              <div className="aspect-[4/5] rounded-xl overflow-hidden mb-3" style={{ background: "#e8dfd1" }}>
                {activeMedia.length > 0 ? (() => { const item = activeMedia[Math.min(previewIndex, activeMedia.length - 1)]; return item.isVideo ? <video src={item.url || item.preview} className="w-full h-full object-cover" muted loop /> : <img src={item.url || item.preview} alt="" className="w-full h-full object-cover" />; })() : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={32} style={{ color: "var(--text-muted)" }} /></div>}
              </div>
              {activeMedia.length > 1 && (<div className="flex gap-1.5 overflow-x-auto mb-3 pb-1">{activeMedia.map((m, i) => (<button key={m.id} onClick={() => setPreviewIndex(i)} className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 transition-all" style={{ border: i === Math.min(previewIndex, activeMedia.length - 1) ? "2px solid var(--gold)" : "1px solid rgba(64,50,37,.1)" }}>{m.isVideo ? <video src={m.url || m.preview} className="w-full h-full object-cover" muted /> : <img src={m.url || m.preview} alt="" className="w-full h-full object-cover" />}</button>))}</div>)}
              <p className="text-sm font-medium" style={{ color: "var(--espresso)" }}>{name}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{category}{activeSeriesTab && category === "Thobe" ? ` · ${activeSeriesTab}` : ""}</p>
              <p className="text-lg font-serif italic mt-1.5" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--gold)" }}>
                {category === "Thobe" && activeSeriesTab && seriesBlocks[activeSeriesTab] ? (() => { const b = seriesBlocks[activeSeriesTab]; return b.cypEnabled ? `Rp ${formatRupiah(b.minimumPrice || "0")}` : `Rp ${formatRupiah(b.price || "0")}`; })() : cypEnabled ? `Rp ${formatRupiah(minimumPrice || "0")}` : `Rp ${formatRupiah(basePrice || "0")}`}
              </p>
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
