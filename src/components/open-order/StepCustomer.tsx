"use client";

/**
 * Langkah 4 — data pemesan. Kecamatan dipakai untuk menghitung ongkir J&T (dihitung di wizard).
 */

import { useState } from "react";
import type { CustomerData } from "./types";
import { DANGER, Field, PrimaryButton, TextArea, TextInput } from "./ui";

export default function StepCustomer({
  customer,
  onChange,
  onContinue,
}: {
  customer: CustomerData;
  onChange: (field: keyof CustomerData, value: string) => void;
  onContinue: () => void;
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

        <Field label="Kode Pos" required>
          <TextInput
            value={customer.postalCode}
            onChange={(e) => onChange("postalCode", e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="16412"
            inputMode="numeric"
            autoComplete="postal-code"
          />
        </Field>
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
