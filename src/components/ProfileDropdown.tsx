"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, ShoppingBag, Settings, LogOut } from "lucide-react";
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
  const [customer, setCustomer] = useState<{ name: string; whatsapp: string } | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setCustomer(null);
        return;
      }
      if (session?.user) {
        supabase.from("customers").select("name, whatsapp").eq("id", session.user.id).single().then(({ data: c }) => {
          if (c) setCustomer(c);
        });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const initials = customer?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "●";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="grid place-items-center w-9 h-9 rounded-full transition-all duration-200 hover:scale-105"
          style={{ background: "rgba(42,33,27,.08)", color: "var(--espresso)" }}
          aria-label="Akun saya">
          <User size={18} strokeWidth={2} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 p-2" style={{ borderRadius: "1rem", border: "1px solid rgba(64,50,37,.1)", background: "white", boxShadow: "0 16px 40px -12px rgba(42,33,27,.2)" }}>
        {customer ? (
          <>
            <div className="px-3 py-2.5 mb-1">
              <p className="text-sm font-semibold" style={{ color: "var(--espresso)" }}>{customer.name}</p>
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
              <a href={getWhatsAppLink("Halo, saya butuh bantuan.")} target="_blank" rel="noopener noreferrer" className="gap-2.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.07-.963 4.189.107 1.112 1.069 1.136 2.794.036 3.864-.428.415-.87.789-1.319 1.127M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>
                <span style={{ color: "var(--espresso)" }}>Bantuan</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={async () => { setCustomer(null); await supabase.auth.signOut(); router.push("/"); }} className="gap-2.5 text-red-500 focus:text-red-600 focus:bg-red-50">
              <LogOut size={16} />
              <span>Keluar</span>
            </DropdownMenuItem>
          </>
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
