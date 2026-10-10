"use client";

/**
 * Menu admin "Open Order" — versi ber-locale (/id/admin/open-order).
 *
 * Isi formulirnya ada di src/components/admin/OpenOrderSettingsForm.tsx (dipakai bersama
 * /admin/open-order). Lihat supabase/open-order-settings.sql untuk kolom store_settings.
 */

import AdminShell from "@/components/AdminShell";
import OpenOrderSettingsForm from "@/components/admin/OpenOrderSettingsForm";

export default function AdminOpenOrderPage() {
  return (
    <AdminShell>
      <OpenOrderSettingsForm />
    </AdminShell>
  );
}
