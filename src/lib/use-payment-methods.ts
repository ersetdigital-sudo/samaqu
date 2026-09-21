"use client";

import { useEffect, useState } from "react";
import {
  fetchPaymentMethodById,
  isPaymentMethodId,
  legacyPaymentLabel,
  legacyPaymentType,
  normalizeMethodType,
  paymentMethodLabel,
  type PaymentMethodRow,
  type PaymentMethodType,
} from "./payment-methods";

/**
 * Resolve nama metode dari nilai `orders.payment_method`:
 * - pesanan baru: uuid metode → ambil nama dari tabel
 * - pesanan lama: 'bank' / 'qris' / 'cod' → label lama
 */
export function usePaymentMethodName(value?: string | null): { name: string | null; loading: boolean } {
  const legacy = legacyPaymentLabel(value);
  const [name, setName] = useState<string | null>(legacy ?? (isPaymentMethodId(value) ? null : value || null));
  const [loading, setLoading] = useState<boolean>(!!value && isPaymentMethodId(value));

  useEffect(() => {
    const legacyLabel = legacyPaymentLabel(value);
    if (legacyLabel) {
      setName(legacyLabel);
      setLoading(false);
      return;
    }
    if (!isPaymentMethodId(value)) {
      setName(value || null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    fetchPaymentMethodById(value as string).then((pm) => {
      if (!alive) return;
      setName(pm ? paymentMethodLabel(pm) : null);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [value]);

  return { name, loading };
}

/** Detail metode yang dipakai sebuah pesanan (untuk halaman sukses customer). */
export function useResolvedPaymentMethod(value?: string | null): {
  type: PaymentMethodType;
  method: PaymentMethodRow | null;
  loading: boolean;
} {
  const initialType = normalizeMethodType(legacyPaymentType(value) ?? undefined);
  const [state, setState] = useState<{ type: PaymentMethodType; method: PaymentMethodRow | null }>({
    type: initialType,
    method: null,
  });
  const [loading, setLoading] = useState<boolean>(!!value && isPaymentMethodId(value));

  useEffect(() => {
    const legacyType = legacyPaymentType(value);
    if (legacyType) {
      setState({ type: legacyType, method: null });
      setLoading(false);
      return;
    }
    if (!isPaymentMethodId(value)) {
      setState({ type: "bank", method: null });
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    fetchPaymentMethodById(value as string).then((pm) => {
      if (!alive) return;
      setState({ type: pm ? normalizeMethodType(pm.method_type) : "bank", method: pm });
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [value]);

  return { ...state, loading };
}
