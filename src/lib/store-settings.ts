"use client";

import { useState, useEffect } from "react";
import { supabase } from "./supabase";

interface StoreSettings {
  store_name: string;
  tagline: string;
  email: string;
  whatsapp: string;
}

const DEFAULTS: StoreSettings = {
  store_name: "SAMAQU",
  tagline: "Busana yang Layak Menemani Setiap Momen",
  email: "halo@samaqu.id",
  whatsapp: "+62 812 3456 7890",
};

let cached: StoreSettings = DEFAULTS;

export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings>(cached);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data } = await supabase.from("store_settings").select("*").eq("id", 1).single();
        if (data) {
          cached = { ...DEFAULTS, ...data };
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
