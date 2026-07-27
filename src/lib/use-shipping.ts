"use client";

import { useState } from "react";

interface IdName {
  id: number;
  name: string;
  zip_code?: string;
}

export interface ShippingOption {
  courier: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
}

export function useShipping() {
  const [provinces, setProvinces] = useState<IdName[]>([]);
  const [cities, setCities] = useState<IdName[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingCost, setLoadingCost] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [originDistrictId, setOriginDistrictId] = useState<number | null>(null);

  async function fetchProvinces() {
    if (provinces.length > 0) return provinces;
    setLoadingProvinces(true);
    try {
      const res = await fetch("/api/shipping/provinces");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list: IdName[] = json.data || [];
      setProvinces(list);
      return list;
    } catch (e) {
      console.error("Gagal fetch provinsi:", e);
      return [] as IdName[];
    } finally {
      setLoadingProvinces(false);
    }
  }

  async function fetchCities(provinceId: number) {
    setLoadingCities(true);
    setCities([]);
    try {
      const res = await fetch(`/api/shipping/districts?provinceId=${provinceId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list: IdName[] = json.data || [];
      setCities(list);
      return list;
    } catch (e) {
      console.error("Gagal fetch kota:", e);
      return [] as IdName[];
    } finally {
      setLoadingCities(false);
    }
  }

  async function fetchCost(destinationDistrictId: number, weightGrams: number) {
    if (!originDistrictId) return [];
    setLoadingCost(true);
    setShippingOptions([]);
    try {
      const res = await fetch("/api/shipping/cost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: originDistrictId,
          destination: destinationDistrictId,
          weight: weightGrams,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      const options: ShippingOption[] = [];
      if (json.data && Array.isArray(json.data)) {
        for (const courierResult of json.data) {
          const courierName = courierResult.name || courierResult.code || "";
          if (courierResult.costs && Array.isArray(courierResult.costs)) {
            for (const svc of courierResult.costs) {
              const costEntry = svc.cost?.[0];
              if (costEntry) {
                options.push({
                  courier: courierName,
                  service: svc.service || "",
                  description: svc.description || "",
                  cost: costEntry.value || 0,
                  etd: costEntry.etd || "",
                });
              }
            }
          }
        }
      }

      options.sort((a, b) => a.cost - b.cost);
      setShippingOptions(options);
      return options;
    } catch (e) {
      console.error("Gagal hitung ongkir:", e);
      return [] as ShippingOption[];
    } finally {
      setLoadingCost(false);
    }
  }

  async function resolveOrigin() {
    if (originDistrictId) return originDistrictId;
    try {
      const provList = await fetchProvinces();
      const jabar = provList.find((p) =>
        p.name.toUpperCase().includes("JAWA BARAT")
      );
      if (!jabar) return null;

      const cityList = await fetchCities(jabar.id);
      const depok = cityList.find((c) =>
        c.name.toUpperCase().includes("DEPOK")
      );
      if (depok) {
        setOriginDistrictId(depok.id);
        return depok.id;
      }
    } catch (e) {
      console.error("Gagal resolve origin:", e);
    }
    return null;
  }

  return {
    provinces,
    cities,
    loadingProvinces,
    loadingCities,
    loadingCost,
    shippingOptions,
    originDistrictId,
    fetchProvinces,
    fetchCities,
    fetchCost,
    resolveOrigin,
  };
}
