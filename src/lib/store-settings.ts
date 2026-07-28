"use client";

import { useState, useEffect } from "react";
import { supabase } from "./supabase";

interface StoreSettings {
  store_name: string;
  tagline: string;
  email: string;
  whatsapp: string;
  origin_district_id: number | null;
  enabled_couriers: string[];
  instagram_url: string;
  cyp_microcopy: string;
}

const DEFAULTS: StoreSettings = {
  store_name: "SAMAQU",
  tagline: "Busana yang Layak Menemani Setiap Momen",
  email: "halo@samaqu.id",
  whatsapp: "+62 812 3456 7890",
  origin_district_id: null,
  enabled_couriers: ["jne", "sicepat", "jnt", "ninja", "tiki", "wahana", "pos", "lion", "anteraja"],
  instagram_url: "https://instagram.com/samaqu.id",
  cyp_microcopy: "Harga Minimum boleh dipilih. Itulah alasan kami membuat Create Your Price.",
};

let cached: StoreSettings = DEFAULTS;

export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings>(cached);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data } = await supabase.from("store_settings").select("*").eq("id", 1).single();
        if (data) {
          let couriers = DEFAULTS.enabled_couriers;
          if (data.enabled_couriers) {
            try {
              couriers = typeof data.enabled_couriers === "string"
                ? JSON.parse(data.enabled_couriers)
                : data.enabled_couriers;
            } catch { /* use defaults */ }
          }
          cached = { ...DEFAULTS, ...data, enabled_couriers: couriers };
          setSettings(cached);
        }
      } catch { /* use defaults */ }
    }
    fetchSettings();
  }, []);

  return settings;
}

export function getWhatsAppNumber(): string {
  return (cached?.whatsapp || DEFAULTS.whatsapp).replace(/[^0-9+]/g, "").replace(/^0/, "62");
}

export function getWhatsAppLink(message: string): string {
  return `https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(message)}`;
}
