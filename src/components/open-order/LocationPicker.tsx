"use client";

/**
 * Pemilih lokasi tujuan di langkah 4 (data pemesan).
 *
 * Provinsi → Kota/Kabupaten → Kecamatan memakai komponen dropdown yang sama dengan checkout
 * dan dashboard ops (`src/components/wilayah/WilayahSelect`), sumbernya dataset area J&T lewat
 * `/api/shipping/wilayah` — jadi tampilannya seragam dan nama kota/kecamatan yang tersimpan
 * persis yang dipakai `/api/shipping/jnt-cost` untuk menghitung ongkir J&T.
 *
 * Kalau daftar wilayah tidak bisa dimuat, komponen ini otomatis kembali ke input teks
 * Kota + Kecamatan seperti sebelumnya supaya pesanan tetap bisa dikirim dan admin menghitung
 * ongkir menyusul.
 */

import { useEffect, useState } from "react";
import WilayahSelect from "@/components/wilayah/WilayahSelect";
import type { CustomerData } from "./types";
import { Field, MUTED, TextInput } from "./ui";

type Status = "loading" | "ready" | "unavailable";

async function loadNames(url: string, signal: AbortSignal): Promise<string[]> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json?.data)) return [];
  return json.data
    .map((option: { name?: string }) => String(option?.name || ""))
    .filter((name: string) => name.length > 0);
}

export default function LocationPicker({
  customer,
  onChange,
}: {
  customer: CustomerData;
  onChange: (field: keyof CustomerData, value: string) => void;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);

  // Daftar provinsi cukup dimuat sekali.
  useEffect(() => {
    const controller = new AbortController();
    loadNames("/api/shipping/wilayah", controller.signal)
      .then((options) => {
        setProvinces(options);
        setStatus(options.length > 0 ? "ready" : "unavailable");
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        console.error("[OPEN-ORDER] daftar provinsi gagal dimuat:", err);
        setStatus("unavailable");
      });
    return () => controller.abort();
  }, []);

  // Kota/kabupaten mengikuti provinsi terpilih.
  useEffect(() => {
    if (!customer.provinceId) {
      setCities([]);
      return;
    }
    const controller = new AbortController();
    loadNames(`/api/shipping/wilayah?province=${encodeURIComponent(customer.provinceId)}`, controller.signal)
      .then(setCities)
      .catch((err: Error) => {
        if (err.name !== "AbortError") console.error("[OPEN-ORDER] daftar kota gagal dimuat:", err);
      });
    return () => controller.abort();
  }, [customer.provinceId]);

  // Kecamatan mengikuti kota/kabupaten terpilih.
  useEffect(() => {
    if (!customer.cityId) {
      setDistricts([]);
      return;
    }
    const controller = new AbortController();
    loadNames(`/api/shipping/wilayah?city=${encodeURIComponent(customer.cityId)}`, controller.signal)
      .then(setDistricts)
      .catch((err: Error) => {
        if (err.name !== "AbortError") console.error("[OPEN-ORDER] daftar kecamatan gagal dimuat:", err);
      });
    return () => controller.abort();
  }, [customer.cityId]);

  function selectProvince(province: string) {
    onChange("provinceId", province);
    onChange("cityId", "");
    onChange("districtId", "");
    onChange("city", "");
    onChange("district", "");
  }

  function selectCity(city: string) {
    onChange("cityId", city);
    onChange("city", city);
    onChange("districtId", "");
    onChange("district", "");
  }

  function selectDistrict(district: string) {
    onChange("districtId", district);
    onChange("district", district);
  }

  // Daftar wilayah tidak tersedia → kembali ke input teks seperti sebelumnya.
  if (status === "unavailable") {
    return (
      <>
        <Field label="Kecamatan" required hint="Ongkir J&T dihitung otomatis dari kecamatan ini.">
          <TextInput
            value={customer.district}
            onChange={(e) => onChange("district", e.target.value)}
            placeholder="contoh: Sukmajaya"
          />
        </Field>

        <Field label="Kota / Kabupaten" required>
          <TextInput
            value={customer.city}
            onChange={(e) => onChange("city", e.target.value)}
            placeholder="contoh: Kota Depok"
            autoComplete="address-level2"
          />
        </Field>
      </>
    );
  }

  return (
    <>
      <WilayahSelect
        label="Provinsi"
        variant="store"
        value={customer.provinceId}
        options={provinces}
        loading={status === "loading"}
        disabled={status === "loading"}
        placeholder={status === "loading" ? "Memuat provinsi…" : "Pilih provinsi"}
        onChange={selectProvince}
      />

      <div>
        {customer.provinceId && cities.length > 0 ? (
          <WilayahSelect
            label="Kota / Kabupaten"
            variant="store"
            value={customer.cityId}
            options={cities}
            placeholder="Pilih kota / kabupaten"
            onChange={selectCity}
          />
        ) : customer.provinceId ? (
          <Field label="Kota / Kabupaten" required>
            <TextInput
              value={customer.city}
              onChange={(e) => onChange("city", e.target.value)}
              placeholder="contoh: Kota Depok"
              autoComplete="address-level2"
            />
          </Field>
        ) : (
          <WilayahSelect
            label="Kota / Kabupaten"
            variant="store"
            value=""
            placeholder="Pilih provinsi dulu"
            disabled
            options={[]}
            onChange={() => {}}
          />
        )}
      </div>

      <div>
        {customer.cityId && districts.length > 0 ? (
          <WilayahSelect
            label="Kecamatan"
            variant="store"
            value={customer.districtId}
            options={districts}
            placeholder="Pilih kecamatan"
            onChange={selectDistrict}
          />
        ) : customer.cityId ? (
          <Field label="Kecamatan" required hint="Ongkir J&T dihitung otomatis dari kecamatan ini.">
            <TextInput
              value={customer.district}
              onChange={(e) => onChange("district", e.target.value)}
              placeholder="contoh: Sukmajaya"
            />
          </Field>
        ) : (
          <WilayahSelect
            label="Kecamatan"
            variant="store"
            value=""
            placeholder="Pilih kota / kabupaten dulu"
            disabled
            options={[]}
            onChange={() => {}}
          />
        )}
      </div>

      <p className="text-[11px] leading-relaxed" style={{ color: MUTED }}>
        Pilihan wilayah ini berasal dari data area J&T, jadi ongkir J&T langsung terhitung begitu kecamatan dipilih.
      </p>
    </>
  );
}
