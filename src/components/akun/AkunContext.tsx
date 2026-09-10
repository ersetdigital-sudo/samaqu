"use client";

import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { useSafeLocale } from "@/lib/safe-i18n";

export interface AkunCustomer {
  id: string;
  name: string;
  whatsapp: string;
  email?: string;
  chest_size?: number | null;
  shoulder_size?: number | null;
  length_size?: number | null;
  sleeve_size?: number | null;
}

interface AkunCtxValue {
  customer: AkunCustomer | null;
  ready: boolean;
}

const AkunCtx = createContext<AkunCtxValue>({ customer: null, ready: false });

export function useAkunCustomer() {
  return useContext(AkunCtx);
}

export function AkunProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useSafeLocale();
  const [customer, setCustomer] = useState<AkunCustomer | null>(null);
  const [ready, setReady] = useState(false);

  const prefix = `/${locale}`;
  const to = (href: string) => `${prefix}${href}`;

  useEffect(() => {
    let alive = true;
    async function init() {
      const c = await getCurrentCustomer();
      if (!alive) return;
      if (!c) {
        router.replace(to("/akun/login"));
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      setCustomer({ ...(c as AkunCustomer), email: user?.email || "" });
      setReady(true);
    }
    init();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AkunCtx.Provider value={{ customer, ready }}>
      {children}
    </AkunCtx.Provider>
  );
}
