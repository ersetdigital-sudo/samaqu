"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { supabase } from "@/lib/supabase";
import { setMetaPixelConfig, trackPageView, type MetaPixelConfig } from "@/lib/meta-pixel";

// ── Context ──

interface MetaPixelContextValue {
  config: MetaPixelConfig | null;
  isReady: boolean;
}

const MetaPixelContext = createContext<MetaPixelContextValue>({ config: null, isReady: false });

export function useMetaPixel() {
  return useContext(MetaPixelContext);
}

// ── Config cache (module-level, 5 min TTL) ──

let cachedConfig: MetaPixelConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchConfig(): Promise<MetaPixelConfig | null> {
  const now = Date.now();
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL) return cachedConfig;

  try {
    const { data } = await supabase
      .from("store_settings")
      .select("meta_pixel_id, meta_access_token, meta_pixel_enabled, meta_test_event_code")
      .eq("id", 1)
      .single();

    if (data?.meta_pixel_id && data?.meta_pixel_enabled) {
      cachedConfig = {
        pixelId: data.meta_pixel_id,
        enabled: true,
        accessToken: data.meta_access_token || undefined,
        testEventCode: data.meta_test_event_code || undefined,
      };
    } else {
      cachedConfig = null;
    }
    cacheTimestamp = now;
  } catch {
    // Keep cached config on error
  }

  return cachedConfig;
}

// ── Provider ──

export default function MetaPixelProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<MetaPixelConfig | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const pathname = usePathname();
  const initialPageViewFired = useRef(false);

  // Fetch config on mount + on window focus (for pixel ID changes)
  const loadConfig = useCallback(async () => {
    const cfg = await fetchConfig();
    setConfig(cfg);
    setMetaPixelConfig(cfg);
  }, []);

  useEffect(() => {
    loadConfig();

    const handleFocus = () => loadConfig();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadConfig]);

  // Fire initial PageView after script loads
  useEffect(() => {
    if (scriptLoaded && config?.enabled && !initialPageViewFired.current) {
      initialPageViewFired.current = true;
      trackPageView();
    }
  }, [scriptLoaded, config]);

  // Track PageView on route change (SPA navigation)
  const prevPathname = useRef(pathname);
  useEffect(() => {
    if (scriptLoaded && config?.enabled && pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      trackPageView();
    }
  }, [pathname, scriptLoaded, config]);

  return (
    <MetaPixelContext.Provider value={{ config, isReady: scriptLoaded && !!config?.enabled }}>
      {/* Meta Pixel base code */}
      {config?.enabled && config.pixelId && (
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${config.pixelId}');
              ${config.testEventCode ? `fbq('set', 'agent', '${config.testEventCode}');` : ""}
            `,
          }}
          onLoad={() => setScriptLoaded(true)}
        />
      )}
      {children}
    </MetaPixelContext.Provider>
  );
}
