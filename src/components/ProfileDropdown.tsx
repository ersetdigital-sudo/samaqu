"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { User, ShoppingBag, LogOut, MapPin, Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getWhatsAppLink } from "@/lib/store-settings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ProfileDropdown() {
  const router = useRouter();
  const pathname = usePathname();
  const isHomepage = pathname === "/";
  const [customer, setCustomer] = useState<{ name: string; email: string; whatsapp: string } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setCustomer(null);
        setReady(true);
        return;
      }
      if (session?.user) {
        supabase.from("customers").select("name, whatsapp").eq("id", session.user.id).single().then(({ data: c }) => {
          setCustomer(c ? { ...c, email: session.user.email || "" } : null);
          setReady(true);
        });
      } else {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
          style={{ background: "rgba(42,33,27,.08)", color: "var(--espresso)" }}
          aria-label="Akun saya">
          <User size={18} strokeWidth={2} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 p-2" style={{ borderRadius: "1rem", border: "1px solid rgba(64,50,37,.1)", background: "white", boxShadow: "0 16px 40px -12px rgba(42,33,27,.2)" }}>
        {customer ? (
          isHomepage ? (
            <>
              <div className="px-3 py-2.5 mb-1">
                <p className="text-sm font-semibold" style={{ color: "var(--espresso)" }}>{customer.name}</p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{customer.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/akun" className="gap-2.5">
                  <User size={16} style={{ color: "var(--text-muted)" }} />
                  <span style={{ color: "var(--espresso)" }}>Dashboard Saya</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/akun" className="gap-2.5">
                  <ShoppingBag size={16} style={{ color: "var(--text-muted)" }} />
                  <span style={{ color: "var(--espresso)" }}>Pesanan Saya</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/akun/alamat" className="gap-2.5">
                  <MapPin size={16} style={{ color: "var(--text-muted)" }} />
                  <span style={{ color: "var(--espresso)" }}>Alamat Tersimpan</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/akun" className="gap-2.5">
                  <Heart size={16} style={{ color: "var(--text-muted)" }} />
                  <span style={{ color: "var(--espresso)" }}>Wishlist</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => { setCustomer(null); await supabase.auth.signOut(); router.push("/"); }} className="gap-2.5 text-red-500 focus:text-red-600 focus:bg-red-50">
                <LogOut size={16} />
                <span>Keluar</span>
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <div className="px-3 py-2.5 mb-1">
                <p className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>{customer.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => { setCustomer(null); await supabase.auth.signOut(); router.push("/"); }} className="gap-2.5 text-red-500 focus:text-red-600 focus:bg-red-50">
                <LogOut size={16} />
                <span>Keluar</span>
              </DropdownMenuItem>
            </>
          )
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link href="/akun/login" className="gap-2.5">
                <User size={16} style={{ color: "var(--text-muted)" }} />
                <span style={{ color: "var(--espresso)" }}>Masuk</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/akun/register" className="gap-2.5">
                <User size={16} style={{ color: "var(--text-muted)" }} />
                <span style={{ color: "var(--espresso)" }}>Daftar</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
