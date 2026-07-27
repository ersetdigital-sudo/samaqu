"use client";

import { useState, useCallback } from "react";

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

  const fetchProvinces = useCallback(async () => {
    if (provinces.length > 0) return provinces;
    setLoadingProvinces(true);
    try {
      const res = await fetch("/api/shipping/provinces");
      const json = await res.json();
      const list: IdName[] = json.data || [];
      setProvinces(list);
      return list;
    } finally {
      setLoadingProvinces(false);
    }
  }, [provinces.length]);

  const fetchCities = useCallback(async (provinceId: number) => {
    setLoadingCities(true);
    setCities([]);
    try {
      const res = await fetch(`/api/shipping/districts?provinceId=${provinceId}`);
      const json = await res.json();
      const list: IdName[] = json.data || [];
      setCities(list);
      return list;
    } finally {
      setLoadingCities(false);
    }
  }, []);

  const fetchCost = useCallback(
    async (destinationDistrictId: number, weightGrams: number) => {
      if (!originDistrictId) return;
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
        const json = await res.json();

        // RajaOngkir returns data as array of courier results
        // Each has costs[] array with service, cost, etd
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

        // Sort by price ascending
        options.sort((a, b) => a.cost - b.cost);
        setShippingOptions(options);
        return options;
      } finally {
        setLoadingCost(false);
      }
    },
    [originDistrictId]
  );

  // Resolve origin district on first use (Depok)
  const resolveOrigin = useCallback(async () => {
    if (originDistrictId) return originDistrictId;
    // Fetch Jawa Barat province (id varies, search by name)
    const provRes = await fetch("/api/shipping/provinces");
    const provJson = await provRes.json();
    const jabar = (provJson.data || []).find((p: IdName) =>
      p.name.toUpperCase().includes("JAWA BARAT")
    );
    if (!jabar) return null;

    // Fetch cities/districts in Jawa Barat, find Depok
    const cityRes = await fetch(`/api/shipping/districts?provinceId=${jabar.id}`);
    const cityJson = await cityRes.json();
    const depok = (cityJson.data || []).find((c: IdName) =>
      c.name.toUpperCase().includes("DEPOK")
    );
    if (depok) {
      setOriginDistrictId(depok.id);
      return depok.id;
    }
    return null;
  }, [originDistrictId]);

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
