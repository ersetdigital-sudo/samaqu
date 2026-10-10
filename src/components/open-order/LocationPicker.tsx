"use client";

/**
 * Pemilih lokasi tujuan di langkah 4 (data pemesan).
 *
 * Provinsi → Kota/Kabupaten → Kecamatan diambil dari RajaOngkir lewat route shipping yang
 * sudah ada (`/api/shipping/provinces`, `/api/shipping/districts`). Nama kota/kecamatan yang
 * tersimpan adalah nama resmi RajaOngkir — itulah yang dipakai `/api/shipping/jnt-cost` untuk
 * menghitung ongkir J&T, jadi ongkir tidak lagi bergantung pada ejaan yang diketik customer.
 *
 * Kalau daftar RajaOngkir tidak bisa dimuat (kunci kosong / API bermasalah), komponen ini
 * otomatis kembali ke input teks Kota + Kecamatan seperti sebelumnya supaya pesanan tetap
 * bisa dikirim dan admin menghitung ongkir menyusul.
 */

import { useEffect, useState } from "react";
import type { CustomerData } from "./types";
import { Field, inputClass, inputStyle, MUTED, TextInput } from "./ui";

interface LocationOption {
  id: number;
  name: string;
}

type Status = "loading" | "ready" | "unavailable";

/** Nama RajaOngkir serba kapital ("KOTA ADM. JAKARTA TIMUR") → "Kota Adm. Jakarta Timur". */
const prettyName = (name: string) =>
  name.toLowerCase().replace(/(^|[\s.])([a-z])/g, (_, sep: string, char: string) => sep + char.toUpperCase());

async function loadOptions(url: string, signal: AbortSignal): Promise<LocationOption[]> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

function LocationSelect({
  value,
  placeholder,
  disabled,
  options,
  onChange,
}: {
  value: string;
  placeholder: string;
  disabled?: boolean;
  options: LocationOption[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} ${disabled ? "opacity-60" : ""}`}
      style={inputStyle}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={String(option.id)}>
          {prettyName(option.name)}
        </option>
      ))}
    </select>
  );
}

export default function LocationPicker({
  customer,
  onChange,
}: {
  customer: CustomerData;
  onChange: (field: keyof CustomerData, value: string) => void;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);

  // Daftar provinsi cukup dimuat sekali.
  useEffect(() => {
    const controller = new AbortController();
    loadOptions("/api/shipping/provinces", controller.signal)
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
    loadOptions(`/api/shipping/districts?provinceId=${customer.provinceId}`, controller.signal)
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
    loadOptions(`/api/shipping/districts?cityId=${customer.cityId}`, controller.signal)
      .then(setDistricts)
      .catch((err: Error) => {
        if (err.name !== "AbortError") console.error("[OPEN-ORDER] daftar kecamatan gagal dimuat:", err);
      });
    return () => controller.abort();
  }, [customer.cityId]);

  function selectProvince(provinceId: string) {
    onChange("provinceId", provinceId);
    onChange("cityId", "");
    onChange("districtId", "");
    onChange("city", "");
    onChange("district", "");
  }

  function selectCity(cityId: string) {
    const city = cities.find((option) => String(option.id) === cityId);
    onChange("cityId", cityId);
    onChange("city", city ? prettyName(city.name) : "");
    onChange("districtId", "");
    onChange("district", "");
  }

  function selectDistrict(districtId: string) {
    const district = districts.find((option) => String(option.id) === districtId);
    onChange("districtId", districtId);
    onChange("district", district ? prettyName(district.name) : "");
  }

  // RajaOngkir tidak tersedia → kembali ke input teks seperti sebelumnya.
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
      <Field label="Provinsi" required>
        <LocationSelect
          value={customer.provinceId}
          placeholder={status === "loading" ? "Memuat provinsi…" : "Pilih provinsi"}
          disabled={status === "loading"}
          options={provinces}
          onChange={selectProvince}
        />
      </Field>

      <Field label="Kota / Kabupaten" required>
        {customer.provinceId && cities.length > 0 ? (
          <LocationSelect
            value={customer.cityId}
            placeholder="Pilih kota / kabupaten"
            options={cities}
            onChange={selectCity}
          />
        ) : customer.provinceId ? (
          <TextInput
            value={customer.city}
            onChange={(e) => onChange("city", e.target.value)}
            placeholder="contoh: Kota Depok"
            autoComplete="address-level2"
          />
        ) : (
          <LocationSelect value="" placeholder="Pilih provinsi dulu" disabled options={[]} onChange={() => {}} />
        )}
      </Field>

      <Field label="Kecamatan" required hint="Ongkir J&T dihitung otomatis dari kecamatan ini.">
        {customer.cityId && districts.length > 0 ? (
          <LocationSelect
            value={customer.districtId}
            placeholder="Pilih kecamatan"
            options={districts}
            onChange={selectDistrict}
          />
        ) : customer.cityId ? (
          <TextInput
            value={customer.district}
            onChange={(e) => onChange("district", e.target.value)}
            placeholder="contoh: Sukmajaya"
          />
        ) : (
          <LocationSelect value="" placeholder="Pilih kota / kabupaten dulu" disabled options={[]} onChange={() => {}} />
        )}
      </Field>

      <p className="text-[11px] leading-relaxed" style={{ color: MUTED }}>
        Pilihan wilayah ini berasal dari data RajaOngkir, jadi ongkir J&T langsung terhitung begitu kecamatan dipilih.
      </p>
    </>
  );
}
