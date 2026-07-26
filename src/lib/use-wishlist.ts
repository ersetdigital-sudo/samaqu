"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export function useWishlist() {
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { setLoaded(true); return; }
      supabase.from("wishlists").select("product_id").eq("customer_id", data.user.id).then(({ data: rows }) => {
        if (rows) setWishlistIds(new Set(rows.map((r) => r.product_id)));
        setLoaded(true);
      });
    });
  }, []);

  const toggle = useCallback(async (productId: string) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return false;

    const isWishlisted = wishlistIds.has(productId);
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (isWishlisted) next.delete(productId); else next.add(productId);
      return next;
    });

    if (isWishlisted) {
      await supabase.from("wishlists").delete().eq("customer_id", data.user.id).eq("product_id", productId);
    } else {
      await supabase.from("wishlists").insert({ customer_id: data.user.id, product_id: productId });
    }
    return !isWishlisted;
  }, [wishlistIds]);

  const isWishlisted = useCallback((productId: string) => wishlistIds.has(productId), [wishlistIds]);

  return { wishlistIds, isWishlisted, toggle, loaded };
}
