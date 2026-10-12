"use client";

/**
 * Langkah 4 — data pemesan. Provinsi/kota/kecamatan dipilih dari data RajaOngkir
 * (lihat `LocationPicker`); kecamatan itulah yang dipakai menghitung ongkir J&T di wizard.
 *
 * Ongkir yang sudah terhitung (state wizard, sumber yang sama dengan langkah 5) ditampilkan
 * di sini juga — di bawah Kode Pos — supaya customer melihat biaya kirimnya sebelum lanjut
 * ke review, bukan baru di langkah terakhir.
 */

import { useState } from "react";
import { money } from "@/lib/open-order-catalog";
import LocationPicker from "./LocationPicker";
import type { CustomerData, DraftShipping } from "./types";
import { DANGER, Field, FIELD_BG, MUTED, PrimaryButton, SummaryRow, TextArea, TextInput } from "./ui";

export default function StepCustomer({
  customer,
  onChange,
  onContinue,
  shipping,
  loadingOngkir,
  ongkirError,
}: {
  customer: CustomerData;
  onChange: (field: keyof CustomerData, value: string) => void;
  onContinue: () => void;
  shipping: DraftShipping | null;
  loadingOngkir: boolean;
  ongkirError: boolean;
}) {
  const [error, setError] = useState("");

  function handleContinue() {
    const required: (keyof CustomerData)[] = ["name", "whatsapp", "address", "district", "city", "postalCode"];
    if (required.some((field) => !customer[field].trim())) {
      setError("Lengkapi semua data pemesan dulu ya.");
      return;
    }
    setError("");
    onContinue();
  }

  return (
    <div>
      <div className="space-y-4">
        <Field label="Nama Lengkap" required>
          <TextInput
            value={customer.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Nama penerima paket"
            autoComplete="name"
          />
        </Field>

        <Field label="No. WhatsApp" required>
          <TextInput
            value={customer.whatsapp}
            onChange={(e) => onChange("whatsapp", e.target.value)}
            placeholder="0812-3456-7890"
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>

        <Field label="Alamat Lengkap" required hint="Sertakan RT/RW, kelurahan, dan nomor rumah (jika ada).">
          <TextArea
            value={customer.address}
            onChange={(e) => onChange("address", e.target.value)}
            rows={3}
            placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan"
            autoComplete="street-address"
          />
        </Field>

        <LocationPicker customer={customer} onChange={onChange} />

        <Field label="Kode Pos" required>
          <TextInput
            value={customer.postalCode}
            onChange={(e) => onChange("postalCode", e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="16412"
            inputMode="numeric"
            autoComplete="postal-code"
          />
        </Field>

        {/* Ongkir dari kecamatan tujuan: terhitung otomatis (debounce 1 detik) begitu kecamatan
            dipilih, lalu dipakai lagi di langkah 5 — nilainya sama, tidak dihitung dua kali. */}
        <div className="rounded-2xl px-5 py-4" style={{ background: FIELD_BG, border: "1px solid rgba(0,0,0,.25)" }}>
          <SummaryRow
            label={shipping ? `Ongkir (J&T — ${shipping.service})` : "Ongkir"}
            value={loadingOngkir ? "Menghitung…" : shipping ? money(shipping.cost) : "—"}
          />
          {ongkirError ? (
            <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: MUTED }}>
              Ongkir otomatis belum tersedia — admin akan menghitung dan mengabari kamu.
            </p>
          ) : !shipping && !loadingOngkir ? (
            <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: MUTED }}>
              Pilih provinsi, kota, lalu kecamatan dulu supaya ongkir J&T muncul di sini.
            </p>
          ) : null}
        </div>
      </div>

      {error && (
        <p className="mt-4 text-[12px]" style={{ color: DANGER }}>
          {error}
        </p>
      )}

      <div className="mt-6">
        <PrimaryButton onClick={handleContinue}>Lanjut ke Review</PrimaryButton>
      </div>
    </div>
  );
}
