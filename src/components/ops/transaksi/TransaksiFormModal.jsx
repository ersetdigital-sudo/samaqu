"use client";

/**
 * Form transaksi manual (Tambah / Ubah) — drawer dari sisi kanan.
 *
 * Bentuknya sengaja seperti panel samping: header & footer menempel (footer tidak ikut
 * ter-scroll), hanya isi tengahnya yang bisa di-scroll, dan latar digelapkan tipis.
 * Kalau sudah ada isian lalu drawer ditutup, muncul konfirmasi singkat supaya isian
 * tidak hilang karena salah klik.
 *
 * Pemilihan produk memakai pemilih cepat: cari produk → tombol Series (harga + sisa stok) →
 * tombol Ukuran (sisa stok per ukuran) → Qty. Grup produk (nama + jenis kain) diambil dari
 * data yang sama dengan Laporan Stok (`/api/ops/product-variants`), urutan series memakai
 * `seriesRank` dari `src/lib/ops-order.ts`, dan stok yang ditampilkan SELALU `stock_efektif`
 * (hasil `resolveStock`) — bukan kolom `stock` mentah, karena baris series pengikut
 * (Bayati/Imron ikut Jiharkah, Karim/Imalah ikut Nahawand) menyimpan stok 0 di database.
 *
 * Langkah Warna hanya muncul kalau produk itu memang punya lebih dari satu warna asli;
 * varian Thobe menyimpan warna `default` (warna sebenarnya ada di nama produk), jadi langkah
 * itu dilewati. Nilai `color` yang dikirim ke server tetap nilai asli di `product_variants`.
 *
 * Catatan: harga & stok di sini hanya untuk tampilan/peringatan. Saat Simpan, server tetap
 * membaca ulang harga dari database dan memotong stok lewat RPC yang sama dengan checkout.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { base44 } from "@/lib/ops-api";
import { MANUAL_SOURCE_KEYS, SOURCE_LABEL } from "@/lib/transaksi";
import { OPS_STOCK_SIZES } from "@/lib/ops-stock";
import { categoryRank, seriesRank, variantSortKey } from "@/lib/ops-order";
import { formatRupiah, isoToWibInput, wibNow, wibToIso } from "@/components/ops/transaksi/transaksi-format";
import WilayahSelect from "@/components/ops/transaksi/WilayahSelect";
import { useToast } from "@/components/ops/ui/use-toast";

const inputClass =
  "w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 text-sm font-semibold text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed";
const labelClass = "text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1";
const sectionClass = "text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500";
const cmpId = (a, b) => String(a).localeCompare(String(b), "id", { sensitivity: "base" });

const digits = (value) => String(value ?? "").replace(/\D/g, "");

/** Nomor HP tanpa peduli 08… / 628… / 8… — untuk mendeteksi pelanggan yang sudah terdaftar. */
const phoneKey = (value) => digits(value).replace(/^0+/, "").replace(/^62/, "");

const ADDRESS_FIELDS = ["address", "province", "city", "kecamatan", "postal_code"];

/** Satu baris item yang masih kosong (produk belum dipilih). */
const emptyRow = () => ({
  product: "",
  category: "",
  kain: "",
  warna: "",
  series: null,
  variant: "",
  quantity: 1,
  editing: true,
});

/** Batasi qty: minimal 1, tidak lebih dari stok efektif varian yang dipilih. */
const clampQty = (value, max) => {
  const top = Number(max) > 0 ? Number(max) : 99;
  return Math.max(1, Math.min(top, Number(value) || 1));
};

const sizeRank = (size) => {
  const index = OPS_STOCK_SIZES.indexOf(String(size || "").toUpperCase());
  return index === -1 ? OPS_STOCK_SIZES.length : index;
};

export default function TransaksiFormModal({ isOpen, onClose, initialData = null, onSaved }) {
  const isEdit = !!initialData;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(null);
  const [items, setItems] = useState([emptyRow()]);
  const [saveError, setSaveError] = useState("");
  const [touched, setTouched] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  /** Langkah drawer: 0 Pelanggan, 1 Produk, 2 Pembayaran. */
  const [step, setStep] = useState(0);
  /** Alamat diketik baru (bukan dari daftar tersimpan) → ikut masuk buku alamat pelanggan. */
  const [newAddressForCustomer, setNewAddressForCustomer] = useState(false);
  const prefilledFor = useRef(null);
  /** Penanda pelanggan yang alamatnya sudah diisi otomatis (sekali per pelanggan). */
  const prefilledAddressFor = useRef(null);
  /** Nomor pesanan sumber alamat yang sedang terisi otomatis (ditampilkan sebagai keterangan). */
  const [addressPrefilledFrom, setAddressPrefilledFrom] = useState("");
  /** Pemilih produk cepat: kata kunci + chip kategori (dipakai pada baris item yang terbuka). */
  const [search, setSearch] = useState("");
  const [catChip, setCatChip] = useState("all");
  const searchRef = useRef(null);

  const { data: variants = [] } = useQuery({
    queryKey: ["transaksi", "variants"],
    queryFn: () => base44.entities.ProductVariant.list(),
    enabled: isOpen,
    staleTime: 30_000,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["transaksi", "customers"],
    queryFn: () => base44.entities.Customer.list(),
    enabled: isOpen,
    staleTime: 60_000,
  });

  // Alamat pelanggan: daftar alamat tersimpan + alamat pesanan terakhirnya (untuk auto-isi).
  const selectedCustomerId = form?.customer_mode === "existing" ? form?.customer_id || "" : "";
  const selectedCustomerName = form?.customer_mode === "existing" ? form?.customer_name || "" : "";
  const selectedCustomerPhone = form?.customer_mode === "existing" ? form?.customer_whatsapp || "" : "";
  const { data: addressData, isSuccess: addressesLoaded } = useQuery({
    queryKey: ["transaksi", "alamat", selectedCustomerId, selectedCustomerPhone, selectedCustomerName],
    queryFn: () =>
      base44.entities.Transaction.addresses({
        customer_id: selectedCustomerId,
        whatsapp: selectedCustomerPhone,
        name: selectedCustomerName,
      }),
    enabled: isOpen && Boolean(selectedCustomerId || selectedCustomerName),
    staleTime: 30_000,
  });
  const savedAddresses = addressData?.addresses || [];
  const lastCustomerAddress = addressData?.last || null;
  const { data: provinces = [] } = useQuery({
    queryKey: ["transaksi", "wilayah", "provinsi"],
    queryFn: () => base44.entities.Wilayah.provinces(),
    enabled: isOpen,
    staleTime: 24 * 60 * 60 * 1000,
  });
  const { data: cities = [] } = useQuery({
    queryKey: ["transaksi", "wilayah", "kota", form?.province || ""],
    queryFn: () => base44.entities.Wilayah.cities(form.province),
    enabled: isOpen && Boolean(form?.province),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const { data: districts = [] } = useQuery({
    queryKey: ["transaksi", "wilayah", "kecamatan", form?.city || ""],
    queryFn: () => base44.entities.Wilayah.districts(form.city),
    enabled: isOpen && Boolean(form?.city),
    staleTime: 24 * 60 * 60 * 1000,
  });

  /**
   * Satu baris data per (produk + warna). Urutan & "warna" memakai aturan bersama
   * `variantSortKey` — sama dengan Daftar Produk & Laporan Stok (varian Thobe menyimpan
   * warna `default`, jadi warnanya diambil dari nama produk).
   */
  const dataset = useMemo(
    () =>
      (variants || []).map((variant) => ({
        product_id: variant.product_id,
        product_name: variant.product_name,
        category: variant.category || "",
        kain: variant.jenis_kain_name || "",
        warna: variantSortKey(variant).warna,
        series: variant.series_name || "",
        color: String(variant.color || "").trim() || "default",
        price: Number(variant.price) || 0,
        sizes: variant.stock_efektif || variant.stock || {},
        linkedTo: variant.base_series_name || variant.base_product_name || null,
      })),
    [variants],
  );

  /* ── Nilai awal: transaksi baru (waktu sekarang) atau yang sedang diubah ── */
  useEffect(() => {
    if (!isOpen) {
      prefilledFor.current = null;
      prefilledAddressFor.current = null;
      setConfirmClose(false);
      return;
    }
    setSaveError("");
    setTouched(false);
    setSaveAttempted(false);
    setNewAddressForCustomer(false);
    setAddressPrefilledFrom("");
    setStep(0);
    if (initialData) {
      const parts = isoToWibInput(initialData.created_at);
      const kecamatan = String(initialData.shipping_kecamatan || "").trim()
        || String(initialData.shipping_city || "").split(",")[0].trim();
      setForm({
        customer_mode: initialData.customer_id ? "existing" : "new",
        customer_id: initialData.customer_id || "",
        customer_name: initialData.customer_name || "",
        customer_whatsapp: initialData.customer_whatsapp || "",
        source: initialData.source || "whatsapp",
        date: parts.date,
        time: parts.time,
        shipping_cost: String(initialData.shipping_cost || ""),
        discount: String(initialData.discount || ""),
        notes: initialData.notes || "",
        // Alamat transaksi ini sudah tersimpan di pesanan, jadi isiannya langsung terisi.
        address_mode: "new",
        saved_address_id: "",
        address: initialData.shipping_address || "",
        province: initialData.shipping_province || "",
        city: initialData.kota || "",
        kecamatan,
        postal_code: initialData.shipping_postal_code || "",
      });
    } else {
      const now = wibNow();
      setForm({
        customer_mode: "existing",
        customer_id: "",
        customer_name: "",
        customer_whatsapp: "",
        source: "whatsapp",
        date: now.date,
        time: now.time,
        shipping_cost: "",
        discount: "",
        notes: "",
        address_mode: "saved",
        saved_address_id: "",
        address: "",
        province: "",
        city: "",
        kecamatan: "",
        postal_code: "",
      });
      setItems([emptyRow()]);
      prefilledFor.current = null;
    }
  }, [isOpen, initialData]);

  /* ── Pelanggan terdaftar: alamat utama langsung terpilih ── */
  useEffect(() => {
    if (!isOpen || form?.customer_mode !== "existing" || form?.address_mode !== "saved") return;
    if (form?.saved_address_id || savedAddresses.length === 0) return;
    applySavedAddress(savedAddresses.find((address) => address.is_default) || savedAddresses[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, form?.customer_mode, form?.address_mode, form?.saved_address_id, savedAddresses]);

  /**
   * Pelanggan dipilih tapi belum punya alamat tersimpan → isi otomatis dari alamat PESANAN
   * TERAKHIRNYA supaya admin tidak mengetik ulang. Sekali per pelanggan (kalau kolomnya
   * dikosongkan sendiri oleh admin, tidak diisi ulang).
   */
  useEffect(() => {
    if (!isOpen || !form || !lastCustomerAddress) return;
    if (form.customer_mode !== "existing") return;
    // Pelanggan yang sudah punya alamat tersimpan tetap memakai alamat tersimpannya.
    if (savedAddresses.length > 0) return;
    if (form.address) return;
    const key = selectedCustomerId || selectedCustomerName;
    if (!key || prefilledAddressFor.current === key) return;
    prefilledAddressFor.current = key;

    setForm((current) =>
      current
        ? {
            ...current,
            address_mode: "new",
            saved_address_id: "",
            address: lastCustomerAddress.address || "",
            province: lastCustomerAddress.province || "",
            city: lastCustomerAddress.city || "",
            kecamatan: lastCustomerAddress.kecamatan || "",
            postal_code: lastCustomerAddress.postal_code || "",
          }
        : current,
    );
    setAddressPrefilledFrom(lastCustomerAddress.order_number || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, form?.customer_mode, form?.address, lastCustomerAddress, selectedCustomerId, selectedCustomerName, savedAddresses.length]);

  /* ── Pelanggan terdaftar tanpa alamat tersimpan: isian alamat langsung tampil & ikut disimpan ── */
  useEffect(() => {
    if (!isOpen || isEdit) return;
    if (form?.customer_mode !== "existing" || !form?.customer_id) return;
    if (!addressesLoaded || savedAddresses.length > 0) return;
    setNewAddressForCustomer(true);
  }, [isOpen, isEdit, form?.customer_mode, form?.customer_id, addressesLoaded, savedAddresses.length]);

  /* ── Baris item diubah → telusuri balik jadi langkah bertahapnya ── */
  useEffect(() => {
    if (!isOpen || dataset.length === 0) return;
    const marker = initialData?.order_number || "__new__";
    if (prefilledFor.current === marker) return;
    prefilledFor.current = marker;
    if (!initialData) return;

    const rows = (initialData.items || []).map((item) => {
      const groups = dataset.filter((entry) => entry.product_id === item.product_id);
      const group = groups.find((entry) => entry.color === (item.color || "default")) || groups[0];
      if (!group) {
        return { ...emptyRow(), variant: `${item.color || "default"}||${String(item.size).toUpperCase()}`, quantity: item.quantity };
      }
      return {
        product: group.product_name,
        category: group.category,
        kain: group.kain,
        warna: group.warna,
        series: group.series || "",
        variant: `${group.color}||${String(item.size).toUpperCase()}`,
        quantity: item.quantity,
        editing: false,
      };
    });
    setItems(rows.length > 0 ? rows : [emptyRow()]);
  }, [isOpen, initialData, dataset]);

  /* ── Opsi bertahap: tiap langkah hanya berisi opsi yang valid dari langkah sebelumnya ── */
  const categoryOptions = useMemo(
    () => [...new Set(dataset.map((row) => row.category))].sort((a, b) => categoryRank(a) - categoryRank(b)),
    [dataset],
  );

  const rowsFor = (category, kain, warna) =>
    dataset.filter((row) => row.category === category && row.kain === kain && row.warna === warna);

  /**
   * Grup produk = nama produk + jenis kain (berisi semua series & warnanya).
   * Grup inilah yang muncul di hasil pencarian, contoh "Thobe Superblack · Kain B-01".
   */
  const productGroups = useMemo(() => {
    const map = new Map();
    for (const entry of dataset) {
      const key = `${entry.category}|${entry.kain}|${entry.product_name}`;
      let group = map.get(key);
      if (!group) {
        group = { key, name: entry.product_name, category: entry.category, kain: entry.kain, warnas: [], series: [], stockTotal: 0 };
        map.set(key, group);
      }
      if (!group.warnas.includes(entry.warna)) group.warnas.push(entry.warna);
      if (entry.series && !group.series.includes(entry.series)) group.series.push(entry.series);
      // Stok grup dihitung HANYA dari baris pemilik stok (tanpa `linkedTo`). Baris pengikut
      // memakai stok induknya, jadi kalau ikut dijumlah hasilnya dobel.
      if (!entry.linkedTo) {
        group.stockTotal += Object.values(entry.sizes || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
      }
    }
    return [...map.values()];
  }, [dataset]);

  /** Grup yang sedang dipilih pada satu baris item (dibaca dari isian barisnya sendiri). */
  const groupOf = (row) =>
    row.product
      ? productGroups.find((group) => group.name === row.product && group.kain === row.kain && group.category === row.category) || null
      : null;

  /** Hasil pencarian: difilter kata kunci + chip kategori, diurutkan seperti Daftar Produk. */
  const visibleGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return productGroups
      .filter((group) => catChip === "all" || group.category === catChip)
      .filter((group) => {
        if (!query) return true;
        return `${group.name} ${group.kain} ${group.category} ${group.warnas.join(" ")}`.toLowerCase().includes(query);
      })
      .sort(
        (a, b) =>
          categoryRank(a.category) - categoryRank(b.category) || cmpId(a.kain, b.kain) || cmpId(a.name, b.name),
      );
  }, [productGroups, search, catChip]);

  /**
   * Tombol series untuk satu baris item: satu tombol per series, urut seperti Laporan Stok
   * (`seriesRank`), harga = harga produk pada baris series itu (sama dengan yang dipakai server
   * saat menyimpan), stok = jumlah `stock_efektif` seluruh ukuran di series tersebut.
   */
  const seriesChoices = (row) => {
    if (!row.product || !row.kain || !row.warna) return [];
    const rows = rowsFor(row.category, row.kain, row.warna).filter((entry) => entry.product_name === row.product);
    const bySeries = new Map();
    for (const entry of rows) {
      const key = entry.series || "";
      const current = bySeries.get(key) || { series: entry.series || "", price: entry.price, stock: 0 };
      current.stock += Object.values(entry.sizes || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
      bySeries.set(key, current);
    }
    return [...bySeries.values()].sort((a, b) => seriesRank(a.series) - seriesRank(b.series));
  };

  /** Series hanya jadi langkah kalau produk di kombinasi itu memang punya series. */
  const seriesStep = (category, kain, warna) => {
    if (!category || !kain || !warna) return { show: false, options: [] };
    const rows = rowsFor(category, kain, warna);
    const options = [...new Set(rows.map((row) => row.series))].sort((a, b) => seriesRank(a) - seriesRank(b));
    return { show: options.some(Boolean), options };
  };

  /** Produk yang cocok dengan seluruh langkah yang sudah dipilih. */
  const resolveProduct = (row) => {
    if (!row.category || !row.kain || !row.warna) return null;
    const step = seriesStep(row.category, row.kain, row.warna);
    if (step.show && row.series === null) return null;
    const series = step.show ? row.series : "";
    const rows = rowsFor(row.category, row.kain, row.warna).filter((entry) => (entry.series || "") === series);
    return rows.length === 1 ? rows[0] : rows[0] || null;
  };

  /** Pilihan ukuran + stok tersedia; turunan memakai stok induknya (bawaan /api/ops). */
  const sizeOptions = (product) => {
    if (!product) return [];
    const groups = dataset.filter((entry) => entry.product_id === product.product_id);
    const multiColor = new Set(groups.map((entry) => entry.color)).size > 1;
    return groups
      .flatMap((entry) =>
        Object.keys(entry.sizes || {}).map((size) => ({
          value: `${entry.color}||${size}`,
          size,
          color: entry.color,
          showColor: multiColor,
          stock: Number(entry.sizes?.[size]) || 0,
          price: entry.price,
          linkedTo: entry.linkedTo,
        })),
      )
      .sort((a, b) => sizeRank(a.size) - sizeRank(b.size) || cmpId(a.color, b.color));
  };

  const rowComplete = (row) => Boolean(resolveProduct(row) && row.variant && Number(row.quantity) >= 1);

  /** Total permintaan per varian; baris kembar ikut dihitung supaya peringatan jujur. */
  const requested = useMemo(() => {
    const map = {};
    for (const row of items) {
      const product = resolveProduct(row);
      if (!product || !row.variant) continue;
      const option = sizeOptions(product).find((entry) => entry.value === row.variant);
      if (!option) continue;
      const key = `${product.product_id}||${row.variant}`;
      const entry = map[key] || { option, total: 0 };
      entry.total += Number(row.quantity) || 0;
      map[key] = entry;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, dataset]);

  const rowInfo = items.map((row) => {
    const product = resolveProduct(row);
    const options = sizeOptions(product);
    const chosen = options.find((entry) => entry.value === row.variant) || null;
    const quantity = Number(row.quantity) || 0;
    let issue = null;
    if (!product) issue = "Pilih produk dulu (cari produk → series → ukuran)";
    else if (!row.variant) issue = "Ukuran belum dipilih";
    else if (quantity < 1) issue = "Jumlah minimal 1";
    else {
      const entry = requested[`${product.product_id}||${row.variant}`];
      if (entry && entry.total > entry.option.stock) {
        issue = `Stok ${entry.option.size} tinggal ${entry.option.stock}, diminta ${entry.total}`;
      }
    }
    return { product, options, chosen, quantity, issue, subtotal: (chosen?.price || 0) * quantity };
  });

  const stockIssues = rowInfo.filter((info) => info.issue && info.product && info.chosen).map((info) => info.issue);
  const incomplete = rowInfo.some((info) => info.issue);

  const subtotal = rowInfo.reduce((sum, info) => sum + info.subtotal, 0);
  const discountValue = Number(digits(form?.discount)) || 0;
  const shippingValue = Number(digits(form?.shipping_cost)) || 0;
  const total = Math.max(0, subtotal - Math.min(discountValue, subtotal)) + shippingValue;

  /**
   * Pilihan pelanggan = SEMUA pelanggan (termasuk yang hanya punya pesanan batal dan yang
   * belum punya alamat) supaya admin dari tab mana pun tetap bisa memilih. Yang alamatnya
   * sudah siap ditaruh di atas supaya input transaksi tetap cepat, dan sisanya ditandai.
   */
  const customerOptions = useMemo(() => {
    const sorted = [...customers].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "id-ID"));
    return [...sorted.filter((customer) => customer.hasAddress !== false), ...sorted.filter((customer) => customer.hasAddress === false)];
  }, [customers]);

  const semuaPelanggan = useMemo(
    () => [...customers].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "id-ID")),
    [customers],
  );

  /* ── Alamat pengiriman (sama seperti checkout website) ── */
  const addressErrors = {
    address: String(form?.address || "").trim() ? "" : "Alamat lengkap wajib diisi",
    province: String(form?.province || "").trim() ? "" : "Provinsi wajib dipilih",
    city: String(form?.city || "").trim() ? "" : "Kota/Kabupaten wajib dipilih",
    kecamatan: String(form?.kecamatan || "").trim() ? "" : "Kecamatan wajib diisi",
    postal_code: String(form?.postal_code || "").trim() ? "" : "Kode pos wajib diisi",
  };
  const addressIncomplete = ADDRESS_FIELDS.some((field) => addressErrors[field]);
  const addressErrorText = (field) => (saveAttempted ? addressErrors[field] : "");

  /** Pelanggan terdaftar: pilih dari alamat tersimpan; kalau belum ada, isian langsung tampil. */
  const pickingSavedAddress = form?.customer_mode === "existing" && form?.address_mode === "saved" && savedAddresses.length > 0;
  const showAddressForm = !pickingSavedAddress;

  /** Nomor HP yang sudah terdaftar → tawarkan pakai pelanggan itu daripada bikin ganda. */
  const duplicateCustomer = useMemo(() => {
    if (form?.customer_mode !== "new") return null;
    const key = phoneKey(form?.customer_whatsapp || "");
    if (key.length < 8) return null;
    return semuaPelanggan.find((customer) => phoneKey(customer.whatsapp) === key) || null;
  }, [form?.customer_mode, form?.customer_whatsapp, semuaPelanggan]);

  const applySavedAddress = (address) => {
    setForm((current) => ({
      ...current,
      saved_address_id: address?.id || "",
      address: address?.address || "",
      province: address?.province || "",
      city: address?.city || "",
      kecamatan: address?.kecamatan || "",
      postal_code: address?.postal_code || "",
    }));
  };

  const useExistingCustomer = (customer) => {
    setTouched(true);
    setNewAddressForCustomer(false);
    setForm((current) => ({
      ...current,
      customer_mode: "existing",
      customer_id: customer.id || "",
      customer_name: customer.name || "",
      customer_whatsapp: customer.whatsapp || "",
      address_mode: "saved",
      saved_address_id: "",
    }));
  };

  const startNewAddress = () => {
    setTouched(true);
    setNewAddressForCustomer(true);
    setForm((current) => ({ ...current, address_mode: "new", saved_address_id: "" }));
  };

  /* ── Alur bertahap: tiap langkah harus beres dulu sebelum bisa lanjut ── */
  const step1Ready = Boolean(form?.customer_name?.trim()) && Boolean(form?.customer_whatsapp?.trim()) && !addressIncomplete;
  const stepReady = [step1Ready, !incomplete, true];
  const stepLabels = ["Pelanggan", "Produk", "Pembayaran"];

  const goNext = () => {
    setSaveAttempted(true);
    setSaveError("");
    if (!stepReady[step]) return;
    setStep((current) => Math.min(2, current + 1));
  };

  const goBack = () => {
    setSaveError("");
    setStep((current) => Math.max(0, current - 1));
  };

  /** Hanya satu baris produk yang dibiarkan terbuka; baris lengkap diringkas jadi satu baris. */
  const openRow = (index) => {
    setTouched(true);
    setSearch("");
    setCatChip("all");
    setItems((rows) => rows.map((row, i) => (row.editing === (i === index) ? row : { ...row, editing: i === index })));
  };

  const addRow = () => {
    setTouched(true);
    setSearch("");
    setCatChip("all");
    setItems((rows) => [...rows.map((row) => ({ ...row, editing: false })), emptyRow()]);
  };

  /* ── Aksi ── */
  const updateForm = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
    setTouched(true);
  };

  const updateRow = (index, patch) => {
    setTouched(true);
    setItems((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index) => {
    setTouched(true);
    setItems((rows) => rows.filter((_, i) => i !== index));
  };

  /** Baris item yang sedang terbuka (hanya satu) — dipakai untuk fokus kotak cari. */
  const openIndex = items.findIndex((row) => row.editing);

  /** Pilih grup produk pada satu baris; `null` = kosongkan pilihan lagi ("Ganti"). */
  const chooseGroup = (index, nextGroup) => {
    if (!nextGroup) {
      updateRow(index, { product: "", category: "", kain: "", warna: "", series: null, variant: "" });
      return;
    }
    // Produk dengan satu warna asli langsung terisi; yang multi-warna menunggu langkah Warna.
    updateRow(index, {
      product: nextGroup.name,
      category: nextGroup.category,
      kain: nextGroup.kain,
      warna: nextGroup.warnas.length === 1 ? nextGroup.warnas[0] : "",
      series: null,
      variant: "",
    });
  };

  /* Kata kunci & chip direset saat pindah baris supaya ketikan tidak "menempel" ke item lain,
     dan kotak cari langsung difokuskan supaya input produk bisa dimulai tanpa klik. */
  useEffect(() => {
    setSearch("");
    setCatChip("all");
  }, [openIndex]);

  useEffect(() => {
    if (!isOpen || step !== 1 || openIndex === -1) return undefined;
    const timer = setTimeout(() => searchRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, [isOpen, step, openIndex]);

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit
        ? base44.entities.Transaction.updateManual({ order_number: initialData.order_number, ...data })
        : base44.entities.Transaction.createManual(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["transaksi"] });
      toast({
        title: isEdit ? "✅ Transaksi diperbarui" : "✅ Transaksi tercatat",
        description: `No. Order ${result?.order_number ?? ""}`,
        variant: "success",
      });
      onSaved?.();
      setTouched(false);
      onClose();
    },
    onError: (error) =>
      setSaveError(error instanceof Error ? error.message : "Gagal menyimpan transaksi. Coba lagi."),
  });

  const save = () => {
    if (!form) return;
    setSaveAttempted(true);
    setSaveError("");
    if (incomplete) {
      setSaveError("Lengkapi dulu produknya (dan periksa baris yang stoknya tidak cukup).");
      return;
    }
    if (!form.customer_name.trim()) return setSaveError("Nama pelanggan wajib diisi.");
    if (!form.customer_whatsapp.trim()) return setSaveError("Nomor HP pelanggan wajib diisi.");
    if (addressIncomplete) return setSaveError("Alamat pengiriman wajib diisi lengkap.");
    const createdAt = wibToIso(form.date, form.time);
    if (!createdAt) return setSaveError("Tanggal/jam transaksi tidak valid.");

    mutation.mutate({
      customer_id: form.customer_mode === "existing" ? form.customer_id || null : null,
      customer_name: form.customer_name.trim(),
      customer_whatsapp: form.customer_whatsapp.trim(),
      source: form.source,
      created_at: createdAt,
      shipping_cost: shippingValue,
      discount: Math.min(discountValue, subtotal),
      notes: form.notes.trim(),
      // Alamat yang dipakai transaksi ini tersimpan di pesanan (dan di buku alamat kalau baru).
      shipping: {
        address: form.address.trim(),
        province: form.province.trim(),
        city: form.city.trim(),
        kecamatan: form.kecamatan.trim(),
        postal_code: form.postal_code.trim(),
      },
      save_address: newAddressForCustomer && form.customer_mode === "existing" && Boolean(form.customer_id),
      items: items.map((row) => {
        const product = resolveProduct(row);
        const [color, size] = String(row.variant).split("||");
        return {
          product_id: product?.product_id || "",
          color: color || "default",
          size,
          quantity: Number(row.quantity) || 0,
        };
      }),
    });
  };

  const requestClose = () => {
    if (mutation.isPending) return;
    if (touched) setConfirmClose(true);
    else onClose();
  };

  // Escape = tombol X (ikut minta konfirmasi kalau ada isian).
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (confirmClose) setConfirmClose(false);
      else requestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, confirmClose, touched, mutation.isPending]);

  /**
   * Selama drawer terbuka, scroll halaman dikunci. Kalau tidak, scrollbar halaman tampak
   * menimpa tepi kanan drawer (dan latar belakang ikut bergeser waktu di-scroll).
   * Lebar scrollbar yang hilang diganti padding supaya isi halaman tidak "melompat".
   */
  useEffect(() => {
    if (!isOpen) return undefined;
    const { body, documentElement } = document;
    const gap = window.innerWidth - documentElement.clientWidth;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && form && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
            onClick={requestClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.24, ease: "easeOut" }}
            className="fixed inset-y-0 right-0 z-[9999] w-full sm:w-[680px] bg-white dark:bg-[#1a1d28] shadow-2xl flex flex-col overflow-hidden"
            role="dialog"
            aria-label={isEdit ? "Ubah transaksi" : "Tambah transaksi"}
          >
            {/* Header menempel: judul + indikator langkah */}
            <div className="shrink-0 px-5 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">
                    {isEdit ? "Ubah Transaksi" : "Tambah Transaksi"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isEdit ? `No. Order ${initialData?.order_number}` : "Transaksi manual langsung berstatus Lunas"}
                  </p>
                </div>
                <button
                  onClick={requestClose}
                  className="p-2 -mr-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Tutup"
                >
                  <X size={18} className="text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              {/* Stepper: langkah selesai boleh diklik untuk kembali */}
              <ol className="flex items-center gap-1.5 mt-3">
                {stepLabels.map((label, index) => {
                  const done = index < step;
                  const active = index === step;
                  return (
                    <li key={label} className="flex items-center gap-1.5 min-w-0">
                      <button
                        type="button"
                        disabled={!done}
                        onClick={() => done && setStep(index)}
                        aria-current={active ? "step" : undefined}
                        className={`flex items-center gap-1.5 min-w-0 ${done ? "cursor-pointer" : "cursor-default"}`}
                      >
                        <span
                          className={`w-5 h-5 shrink-0 rounded-full grid place-items-center text-[10px] font-black ${
                            done || active
                              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                              : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                          }`}
                        >
                          {done ? <Check size={11} /> : index + 1}
                        </span>
                        <span
                          className={`text-xs font-bold truncate ${
                            done || active ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {label}
                        </span>
                      </button>
                      {index < stepLabels.length - 1 && <span className="w-3 sm:w-5 h-px bg-slate-200 dark:bg-slate-700 shrink-0" />}
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Body: di layar desktop tidak ter-scroll (scrollbar disembunyikan) */}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (step < 2) goNext();
                else save();
              }}
              className="transaksi-body flex-1 min-h-0 overflow-y-auto [@media(min-height:640px)_and_(min-width:640px)]:overflow-hidden px-5 sm:px-6 py-3 space-y-3.5"
              style={{ scrollbarWidth: "none" }}
            >
              {/* ── Langkah 1: Pelanggan (termasuk alamat & sumber/waktu) ── */}
              {step === 0 && (
                <>
              <section className="space-y-2">
                <h4 className={sectionClass}>Pelanggan</h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewAddressForCustomer(false);
                      updateForm({
                        customer_mode: "existing",
                        customer_id: "",
                        customer_name: "",
                        customer_whatsapp: "",
                        address_mode: "saved",
                        saved_address_id: "",
                        address: "",
                        province: "",
                        city: "",
                        kecamatan: "",
                        postal_code: "",
                      });
                    }}
                    className={`flex-1 px-4 py-1.5 rounded-lg border-2 text-sm font-bold transition-all ${
                      form.customer_mode === "existing"
                        ? "bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-500 text-slate-900 dark:text-white"
                        : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    Pelanggan terdaftar
                  </button>
                  <button
                    type="button"
                    onClick={() => updateForm({ customer_mode: "new", customer_id: "" })}
                    className={`flex-1 px-4 py-1.5 rounded-lg border-2 text-sm font-bold transition-all ${
                      form.customer_mode === "new"
                        ? "bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-500 text-slate-900 dark:text-white"
                        : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    Pelanggan baru
                  </button>
                </div>

                {form.customer_mode === "existing" ? (
                  <select
                    value={form.customer_id}
                    onChange={(event) => {
                      const picked = customerOptions.find((entry) => (entry.id || entry.key) === event.target.value);
                      setNewAddressForCustomer(false);
                      // Ganti pelanggan → alamat ikut diganti (alamat utama terpilih otomatis).
                      updateForm({
                        customer_id: picked?.id || "",
                        customer_name: picked?.name || "",
                        customer_whatsapp: picked?.whatsapp || "",
                        address_mode: "saved",
                        saved_address_id: "",
                        address: "",
                        province: "",
                        city: "",
                        kecamatan: "",
                        postal_code: "",
                      });
                    }}
                    className={inputClass}
                  >
                    <option value="">— Pilih pelanggan —</option>
                    {customerOptions.map((customer) => (
                      <option key={customer.id || customer.key} value={customer.id || customer.key}>
                        {customer.name}
                        {customer.whatsapp ? ` · ${customer.whatsapp}` : ""}
                        {customer.registered ? "" : " (belum daftar)"}
                        {customer.hasAddress === false ? " — belum ada alamat" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={form.customer_name}
                      onChange={(event) => updateForm({ customer_name: event.target.value })}
                      placeholder="Nama pelanggan"
                      className={inputClass}
                    />
                    <input
                      type="text"
                      value={form.customer_whatsapp}
                      onChange={(event) => updateForm({ customer_whatsapp: event.target.value })}
                      placeholder="Nomor HP (08…)"
                      className={inputClass}
                    />
                  </div>
                )}

                {/* Nomor HP yang sudah terdaftar → tawarkan pakai pelanggan itu supaya tidak ganda */}
                {duplicateCustomer && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-amber-200 bg-amber-50 px-3.5 py-2.5">
                    <AlertCircle size={15} className="shrink-0 text-amber-600" />
                    <p className="text-sm font-semibold text-amber-800">
                      Nomor ini sudah terdaftar{duplicateCustomer.name ? `: ${duplicateCustomer.name}` : ""}.
                    </p>
                    <button
                      type="button"
                      onClick={() => useExistingCustomer(duplicateCustomer)}
                      className="ml-auto text-xs font-bold px-2.5 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                    >
                      Pakai pelanggan ini
                    </button>
                  </div>
                )}

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {form.customer_mode === "existing"
                    ? form.customer_name
                      ? `Terpilih: ${form.customer_name} · ${form.customer_whatsapp || "nomor belum ada"}`
                      : "Pilih salah satu pelanggan, atau ganti ke Pelanggan baru."
                    : "Pelanggan baru dan alamatnya otomatis tersimpan di menu Pelanggan."}
                </p>

                {/* Alamat Pengiriman */}
                <div className="pt-3 mt-1 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className={sectionClass}>Alamat Pengiriman</h5>
                    {form.customer_mode === "existing" && form.address_mode === "new" && savedAddresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, address_mode: "saved", saved_address_id: "" }))}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Pilih dari alamat tersimpan
                      </button>
                    )}
                  </div>

                  {pickingSavedAddress && (
                    <div className="space-y-2">
                      {savedAddresses.map((address) => (
                        <button
                          key={address.id}
                          type="button"
                          onClick={() => applySavedAddress(address)}
                          className={`w-full text-left rounded-xl border-2 px-3.5 py-3 transition-colors ${
                            form.saved_address_id === address.id
                              ? "border-slate-400 dark:border-slate-500 bg-slate-50 dark:bg-slate-800"
                              : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {address.label || "Alamat"}
                            </span>
                            {address.is_default && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                                Utama
                              </span>
                            )}
                            {form.saved_address_id === address.id && <Check size={14} className="ml-auto shrink-0 text-blue-600" />}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{address.address}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {[address.kecamatan, address.city, address.province, address.postal_code].filter(Boolean).join(", ")}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {address.recipient_name} · {address.phone}
                          </p>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={startNewAddress}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                      >
                        <Plus size={13} /> Tambah alamat baru
                      </button>
                    </div>
                  )}

                  {showAddressForm && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <WilayahSelect
                          label="Provinsi"
                          value={form.province}
                          options={provinces}
                          onChange={(value) => updateForm({ province: value, city: "", kecamatan: "" })}
                          error={addressErrorText("province")}
                        />
                        <WilayahSelect
                          label="Kota / Kabupaten"
                          value={form.city}
                          options={cities}
                          disabled={!form.province}
                          onChange={(value) => updateForm({ city: value, kecamatan: "" })}
                          error={addressErrorText("city")}
                        />
                        <WilayahSelect
                          label="Kecamatan"
                          value={form.kecamatan}
                          options={districts}
                          disabled={!form.city}
                          onChange={(value) => updateForm({ kecamatan: value })}
                          error={addressErrorText("kecamatan")}
                          hint={
                            addressPrefilledFrom && !form.kecamatan
                              ? "Kecamatan belum ada di data pesanan ini — isi manual ya."
                              : ""
                          }
                        />
                        <div>
                          <label className={labelClass}>
                            Kode Pos <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={form.postal_code}
                            onChange={(event) => updateForm({ postal_code: digits(event.target.value) })}
                            placeholder="55581"
                            className={`${inputClass} ${saveAttempted && addressErrors.postal_code ? "border-red-300 dark:border-red-900/60" : ""}`}
                          />
                          {addressErrorText("postal_code") ? (
                            <p className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1">{addressErrorText("postal_code")}</p>
                          ) : null}
                        </div>
                      </div>

                      {/* Alamat lengkap di bawah, tinggi kecil supaya tetap muat tanpa scroll */}
                      <div>
                        <label className={labelClass}>
                          Alamat Lengkap <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          value={form.address}
                          onChange={(event) => {
                            setAddressPrefilledFrom("");
                            updateForm({ address: event.target.value });
                          }}
                          placeholder="Nama jalan, nomor rumah, RT/RW, patokan"
                          className={`${inputClass} ${saveAttempted && addressErrors.address ? "border-red-300 dark:border-red-900/60" : ""}`}
                        />
                        {addressErrorText("address") ? (
                          <p className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1">{addressErrorText("address")}</p>
                        ) : null}
                        {addressPrefilledFrom ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Terisi otomatis dari pesanan terakhir {addressPrefilledFrom} — bisa diubah.
                          </p>
                        ) : null}
                      </div>

                      {newAddressForCustomer && form.customer_mode === "existing" && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Alamat ini akan ditambahkan ke daftar alamat pelanggan.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Sumber & waktu */}
              <section className="space-y-2">
                <h4 className={sectionClass}>Sumber &amp; Waktu</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className={labelClass}>
                      Sumber <span className="text-red-500">*</span>
                    </label>
                    <select value={form.source} onChange={(event) => updateForm({ source: event.target.value })} className={inputClass}>
                      {MANUAL_SOURCE_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {SOURCE_LABEL[key]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>
                      Tanggal <span className="text-red-500">*</span>
                    </label>
                    <input type="date" value={form.date} onChange={(event) => updateForm({ date: event.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Jam (WIB)</label>
                    <input type="time" value={form.time} onChange={(event) => updateForm({ time: event.target.value })} className={inputClass} />
                  </div>
                </div>
              </section>
                </>
              )}

              {/* ── Langkah 2: Produk ── */}
              {step === 1 && (
                <>
              {/* Pemilih produk cepat: cari produk → series → ukuran → qty */}
              <section className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={sectionClass}>Produk</h4>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    Cari produk → Series → Ukuran → Qty
                  </span>
                </div>

                {/* Daftar item punya area sendiri; kalau itemnya banyak hanya area ini yang scroll */}
                <div className="space-y-2 max-h-[46vh] min-h-[168px] overflow-y-auto no-scrollbar pr-0.5">
                  {items.map((row, index) => {
                    const info = rowInfo[index];
                    const step = seriesStep(row.category, row.kain, row.warna);

                    if (!row.editing && rowComplete(row) && info.chosen) {
                      const group = groupOf(row);
                      // Satu baris ringkas: "Thobe Superblack · Kain B-01 · Jiharkah · XL × 2"
                      const summary = [
                        group?.name || row.product,
                        row.kain ? `Kain ${row.kain}` : "",
                        step.show ? row.series : "",
                        `${info.chosen.size} × ${info.quantity}`,
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate" title={summary}>
                              {summary}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Rp {formatRupiah(info.subtotal)}
                              {` · stok ${info.chosen.stock}`}
                              {info.chosen.linkedTo ? ` · stok mengikuti ${info.chosen.linkedTo}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => openRow(index)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                            >
                              <Pencil size={13} /> Ubah
                            </button>
                            <button
                              type="button"
                              onClick={() => removeRow(index)}
                              className="p-2 rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors"
                              aria-label="Hapus produk"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    const group = groupOf(row);
                    const maxStock = info.chosen ? info.chosen.stock : 0;
                    const quantity = Number(row.quantity) || 1;

                    return (
                      <div
                        key={index}
                        className="rounded-xl border-2 border-slate-200 dark:border-slate-700 p-3 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Produk {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            disabled={items.length === 1}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-transparent"
                            aria-label="Hapus produk"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* 1 · Cari produk (hasil dikelompokkan per produk + jenis kain) */}
                        <div className="space-y-1.5">
                          {rowComplete(row) && info.chosen && (
                            <p className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                              {[
                                group?.name || row.product,
                                row.kain ? `Kain ${row.kain}` : "",
                                step.show ? row.series : "",
                                `${info.chosen.size} × ${info.quantity}`,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                              <span className="font-semibold"> · Rp {formatRupiah(info.subtotal)}</span>
                            </p>
                          )}
                          <input
                            ref={index === openIndex ? searchRef : null}
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari produk… (mis. super, grey, b-01)"
                            aria-label="Cari produk"
                            className={inputClass}
                          />

                          {categoryOptions.length > 1 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {["all", ...categoryOptions].map((category) => {
                                const active = catChip === category;
                                return (
                                  <button
                                    key={category}
                                    type="button"
                                    onClick={() => setCatChip(category)}
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                                      active
                                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    }`}
                                  >
                                    {category === "all" ? "Semua" : category}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {!group ? (
                            <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 max-h-[214px] overflow-y-auto no-scrollbar">
                              {dataset.length === 0 ? (
                                <p className="px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  Memuat daftar produk…
                                </p>
                              ) : visibleGroups.length === 0 ? (
                                <p className="px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  Produk tidak ditemukan. Coba kata lain (mis. “super”, “grey”, “b-01”).
                                </p>
                              ) : (
                                visibleGroups.map((option) => (
                                  <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => chooseGroup(index, option)}
                                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                  >
                                    <span className="min-w-0">
                                      <span className="block text-sm font-bold text-slate-900 dark:text-white truncate">{option.name}</span>
                                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                        {[
                                          option.kain ? `Kain ${option.kain}` : "",
                                          option.category,
                                          option.series.length > 1 ? `${option.series.length} series` : "",
                                        ]
                                          .filter(Boolean)
                                          .join(" · ")}
                                      </span>
                                    </span>
                                    <span
                                      className={`shrink-0 text-[11px] font-bold ${
                                        option.stockTotal > 0
                                          ? "text-emerald-600 dark:text-emerald-400"
                                          : "text-slate-400 dark:text-slate-500"
                                      }`}
                                    >
                                      {option.stockTotal > 0 ? `sisa ${option.stockTotal}` : "habis"}
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2">
                              <span className="min-w-0 text-sm font-bold text-slate-900 dark:text-white truncate">
                                {group.name}
                                {group.kain ? (
                                  <span className="font-semibold text-slate-500 dark:text-slate-400"> · Kain {group.kain}</span>
                                ) : null}
                              </span>
                              <button
                                type="button"
                                onClick={() => chooseGroup(index, null)}
                                className="shrink-0 px-2 py-1 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                              >
                                Ganti
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Warna: hanya kalau produk ini punya lebih dari satu warna asli (mis. Kandora) */}
                        {group && group.warnas.length > 1 && !row.warna && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Warna</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {group.warnas.map((warna) => (
                                <button
                                  key={warna}
                                  type="button"
                                  onClick={() => updateRow(index, { warna, series: null, variant: "" })}
                                  className="px-3 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                  {warna}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 2 · Series (nama + harga + sisa stok; urut seperti Laporan Stok) */}
                        {group && row.warna && step.show && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Series</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {seriesChoices(row).map((option) => {
                                const active = (row.series || "") === option.series;
                                const soldOut = option.stock <= 0;
                                return (
                                  <button
                                    key={option.series || "tanpa-series"}
                                    type="button"
                                    disabled={soldOut}
                                    onClick={() => updateRow(index, { series: option.series, variant: "" })}
                                    className={`px-3 py-2 rounded-xl border-2 text-left transition-colors ${
                                      active
                                        ? "border-slate-900 dark:border-white bg-slate-900 dark:bg-white"
                                        : soldOut
                                          ? "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 opacity-60 cursor-not-allowed"
                                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    }`}
                                  >
                                    <span
                                      className={`block text-sm font-bold truncate ${
                                        active
                                          ? "text-white dark:text-slate-900"
                                          : soldOut
                                            ? "text-slate-400 dark:text-slate-500"
                                            : "text-slate-900 dark:text-white"
                                      }`}
                                    >
                                      {option.series || "Tanpa series"}
                                    </span>
                                    <span
                                      className={`block text-[11px] font-semibold ${
                                        active ? "text-white/80 dark:text-slate-700" : "text-slate-500 dark:text-slate-400"
                                      }`}
                                    >
                                      Rp {formatRupiah(option.price)}
                                    </span>
                                    <span
                                      className={`block text-[11px] font-bold ${
                                        active
                                          ? "text-white/80 dark:text-slate-700"
                                          : soldOut
                                            ? "text-slate-400 dark:text-slate-500"
                                            : "text-emerald-600 dark:text-emerald-400"
                                      }`}
                                    >
                                      {soldOut ? "stok habis" : `sisa ${option.stock}`}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 3 · Ukuran (stok per ukuran = stock_efektif, jadi pengikut ikut induknya) */}
                        {info.product && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ukuran</p>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                              {info.options.map((option) => {
                                const active = row.variant === option.value;
                                const soldOut = option.stock <= 0;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    disabled={soldOut}
                                    onClick={() => updateRow(index, { variant: option.value })}
                                    className={`px-2 py-2 rounded-xl border-2 text-center transition-colors ${
                                      active
                                        ? "border-slate-900 dark:border-white bg-slate-900 dark:bg-white"
                                        : soldOut
                                          ? "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 opacity-60 cursor-not-allowed"
                                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    }`}
                                  >
                                    <span
                                      className={`block text-sm font-bold ${
                                        active
                                          ? "text-white dark:text-slate-900"
                                          : soldOut
                                            ? "text-slate-400 dark:text-slate-500"
                                            : "text-slate-900 dark:text-white"
                                      }`}
                                    >
                                      {option.size}
                                    </span>
                                    <span
                                      className={`block text-[10px] font-bold ${
                                        active
                                          ? "text-white/80 dark:text-slate-700"
                                          : soldOut
                                            ? "text-slate-400 dark:text-slate-500"
                                            : "text-slate-500 dark:text-slate-400"
                                      }`}
                                    >
                                      {soldOut ? "habis" : `sisa ${option.stock}`}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 4 · Qty (maksimal = stok efektif varian yang dipilih) */}
                        {info.chosen && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Jumlah</p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateRow(index, { quantity: Math.max(1, quantity - 1) })}
                                disabled={quantity <= 1}
                                className="w-9 h-9 grid place-items-center rounded-xl border-2 border-slate-200 dark:border-slate-700 text-lg font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                                aria-label="Kurangi jumlah"
                              >
                                −
                              </button>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={row.quantity}
                                onChange={(event) => updateRow(index, { quantity: clampQty(digits(event.target.value), maxStock) })}
                                aria-label="Jumlah"
                                className={`${inputClass} w-16 text-center`}
                              />
                              <button
                                type="button"
                                onClick={() => updateRow(index, { quantity: Math.min(maxStock, quantity + 1) })}
                                disabled={quantity >= maxStock}
                                className="w-9 h-9 grid place-items-center rounded-xl border-2 border-slate-200 dark:border-slate-700 text-lg font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                                aria-label="Tambah jumlah"
                              >
                                +
                              </button>
                              <span
                                className={`text-[11px] font-bold ${
                                  quantity >= maxStock ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"
                                }`}
                              >
                                {quantity >= maxStock ? `Stok tersisa ${maxStock}` : `Maks ${maxStock} pcs`}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {info.chosen
                              ? `Rp ${formatRupiah(info.chosen.price)} / pcs · subtotal Rp ${formatRupiah(info.subtotal)}`
                              : info.product
                                ? "Pilih ukuran dulu"
                                : group
                                  ? step.show
                                    ? "Pilih series di atas"
                                    : "Pilih ukuran di atas"
                                  : "Cari & pilih produk di atas"}
                            {info.chosen?.linkedTo ? ` · stok mengikuti ${info.chosen.linkedTo}` : ""}
                          </p>
                          {info.issue ? (
                            <p
                              className={`text-xs font-bold ${
                                info.chosen ? "text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-500"
                              }`}
                            >
                              {info.issue}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  <Plus size={15} /> Tambah produk
                </button>
              </section>
                </>
              )}

              {/* ── Langkah 3: Pembayaran ── */}
              {step === 2 && (
                <>
              {/* Ongkir & diskon */}
              <section className="space-y-2">
                <h4 className={sectionClass}>Ongkir &amp; Diskon</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Ongkir</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-semibold text-sm">Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.shipping_cost}
                        onChange={(event) => updateForm({ shipping_cost: digits(event.target.value) })}
                        placeholder="0"
                        className={`${inputClass} pl-10`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Diskon (opsional)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-semibold text-sm">Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.discount}
                        onChange={(event) => updateForm({ discount: digits(event.target.value) })}
                        placeholder="0"
                        className={`${inputClass} pl-10`}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Catatan */}
              <section className="space-y-2">
                <h4 className={sectionClass}>Catatan</h4>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(event) => updateForm({ notes: event.target.value })}
                  placeholder="Catatan transaksi (opsional)"
                  className={inputClass}
                />
              </section>

              {/* Ringkasan transaksi */}
              <section className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pelanggan</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{form.customer_name || "-"}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{form.customer_whatsapp || "nomor belum ada"}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {SOURCE_LABEL[form.source]}
                  </span>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-2 text-xs">
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{form.address || "Alamat belum diisi"}</p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {[form.kecamatan, form.city, form.province, form.postal_code].filter(Boolean).join(", ")}
                  </p>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-2 space-y-1">
                  {items.map((row, index) => {
                    const info = rowInfo[index];
                    if (!info?.chosen) return null;
                    const seri = seriesStep(row.category, row.kain, row.warna);
                    const label = [row.warna, seri.show ? row.series : "", info.chosen.size].filter(Boolean).join(" · ");
                    return (
                      <div key={index} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-slate-700 dark:text-slate-200 truncate">{label}</span>
                        <span className="text-slate-900 dark:text-white font-semibold whitespace-nowrap">
                          x{info.quantity} · Rp {formatRupiah(info.subtotal)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-2 space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                    <span className="font-semibold text-slate-900 dark:text-white">Rp {formatRupiah(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Ongkir</span>
                    <span className="font-semibold text-slate-900 dark:text-white">Rp {formatRupiah(shippingValue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Diskon</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      - Rp {formatRupiah(Math.min(discountValue, subtotal))}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Total</span>
                  <span className="text-base font-black font-heading text-slate-900 dark:text-white whitespace-nowrap">
                    Rp {formatRupiah(total)}
                  </span>
                </div>
              </section>
                </>
              )}

              {/* Tombol simpan untuk Enter; tombol aslinya ada di footer yang menempel */}
              <button type="submit" className="hidden" aria-hidden="true" />
            </form>

            {/* Footer menempel: Total di kiri, aksi di kanan — tidak ikut ter-scroll */}
            <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1d28] px-5 sm:px-6 py-3.5">
              {(step === 1 && stockIssues.length > 0) || saveError ? (
                <p className="flex items-start gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 mb-2" role="alert">
                  <AlertCircle size={13} className="mt-px shrink-0" />
                  <span className="line-clamp-2">
                    {saveError || stockIssues[0]}
                    {!saveError && stockIssues.length > 1 ? ` (+${stockIssues.length - 1} lainnya)` : ""}
                  </span>
                </p>
              ) : null}

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</p>
                  <p className="text-lg font-black font-heading text-slate-900 dark:text-white whitespace-nowrap">
                    Rp {formatRupiah(total)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {step > 0 && (
                    <button
                      type="button"
                      onClick={goBack}
                      className="px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
                    >
                      Kembali
                    </button>
                  )}

                  {step < 2 ? (
                    <button
                      type="button"
                      onClick={goNext}
                      className={`px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all ${
                        stepReady[step] ? "" : "opacity-60"
                      }`}
                      title={stepReady[step] ? undefined : "Lengkapi isian wajib di langkah ini dulu"}
                    >
                      Lanjut
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={save}
                      disabled={mutation.isPending}
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 transition-all"
                    >
                      <Save size={16} />
                      {mutation.isPending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan Transaksi"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Konfirmasi tutup: isian belum disimpan tidak hilang karena salah klik */}
            <AnimatePresence>
              {confirmClose && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 bg-white/80 dark:bg-[#1a1d28]/80 backdrop-blur-sm flex items-center justify-center p-5"
                  onClick={() => setConfirmClose(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1d28] p-5 shadow-xl"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <h4 className="font-heading font-bold text-slate-900 dark:text-white">Isian belum disimpan</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Tutup drawer dan buang isian transaksi ini?
                    </p>
                    <div className="flex gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => setConfirmClose(false)}
                        className="flex-1 px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all"
                      >
                        Lanjut isi
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmClose(false);
                          setTouched(false);
                          onClose();
                        }}
                        className="flex-1 px-4 py-2.5 border-2 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                      >
                        Buang &amp; tutup
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
