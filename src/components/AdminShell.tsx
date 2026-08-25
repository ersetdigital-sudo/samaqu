"use client";

import { useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ShoppingBag, Package, Users, FileText, Settings,
  Search, Bell, Menu, LogOut, X, Ticket, Ruler,
} from "lucide-react";
import { useToast } from "@/components/AdminToast";
import ConfirmModal from "@/components/ConfirmModal";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin", label: "Pesanan", icon: ShoppingBag },
  { href: "/admin", label: "Produk", icon: Package },
  { href: "/admin", label: "Pelanggan", icon: Users },
  { href: "/admin/konten-website", label: "Konten Website", icon: FileText },
  { href: "/admin", label: "Produk Pilihan", icon: Package },
  { href: "/admin", label: "Pengaturan", icon: Settings },
  { href: "/admin/voucher", label: "Voucher", icon: Ticket },
  { href: "/admin/testimoni", label: "Testimoni", icon: FileText },
  { href: "/admin/ukuran-produk", label: "Panduan Ukuran", icon: Ruler },
  { href: "/admin/garansi-retur-page", label: "Halaman Garansi & Retur", icon: FileText },
  { href: "/admin/biolink", label: "Biolink", icon: FileText },
];

export default function AdminShell({ children, onLogout }: { children: ReactNode; onLogout?: () => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <div id="admin-root" className="flex min-h-screen" style={{ background: "var(--cream)" }}>
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky z-40 top-0 left-0 h-screen lg:self-start w-72 shrink-0 transition-transform duration-300 flex flex-col overflow-y-auto admin-sidebar ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ background: "var(--espresso)" }}
      >
        <div className="flex flex-col gap-2 px-6 py-6" style={{ borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <img src="/logo.svg" alt="SAMAQU" className="h-8 w-auto" style={{ filter: "brightness(0) invert(1)" }} />
          <p className="text-[11px] tracking-[0.28em] uppercase" style={{ color: "#9f9690" }}>Admin Panel</p>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-1.5">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8f8680" }}>Menu Utama</p>
          {navItems.slice(0, 4).map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`sidebar-link w-full text-left ${isActive(item.href) ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={20} strokeWidth={1.6} />
              <span className="flex-1">{item.label}</span>
            </Link>
          ))}

          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider mb-2 mt-6" style={{ color: "#8f8680" }}>Lainnya</p>
          {navItems.slice(4).map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`sidebar-link w-full text-left ${isActive(item.href) ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={20} strokeWidth={1.6} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="px-4 pb-6">
          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--cream)" }}>Butuh bantuan?</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "#9f9690" }}>Butuh bantuan atau ingin tambah fitur? Hubungi kami.</p>
            <a href="https://wa.me/6285212150100?text=Halo,%20saya%20ingin%20bertanya%20seputar%20dashboard%20admin%20SAMAQU." target="_blank" rel="noopener noreferrer" className="mt-3 w-full text-sm font-semibold py-2 rounded-lg text-white text-center block" style={{ background: "linear-gradient(135deg, var(--gold), #96742f)" }}>Hubungi Kami</a>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 backdrop-blur" style={{ background: "rgba(248,245,241,.8)", borderBottom: "1px solid rgba(64,50,37,.06)" }}>
          <div className="flex items-center gap-4 px-5 lg:px-8 py-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 rounded-lg cursor-pointer" style={{ color: "var(--espresso)" }}>
              <Menu size={24} strokeWidth={1.8} />
            </button>
            <div className="ml-auto flex items-center gap-3">
              <button className="relative p-2.5 rounded-xl bg-white cursor-pointer" style={{ border: "1px solid rgba(64,50,37,.06)" }}>
                <Bell size={20} strokeWidth={1.7} style={{ color: "var(--espresso)" }} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: "var(--gold)" }} />
              </button>
              <div className="relative">
                <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2.5 pl-2 cursor-pointer">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ background: "linear-gradient(135deg, var(--gold), #96742f)" }}>A</div>
                </button>
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 rounded-xl z-50 overflow-hidden" style={{ background: "white", border: "1px solid rgba(64,50,37,.1)", boxShadow: "0 12px 40px -8px rgba(45,33,27,.2)" }}>
                      {onLogout && (
                        <button onClick={onLogout} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors hover:bg-[var(--bg-secondary)]" style={{ color: "var(--espresso)" }}>
                          <LogOut size={16} strokeWidth={1.6} />
                          Keluar
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>

      <style jsx global>{`
        .sidebar-link {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.7rem 0.9rem; border-radius: 0.7rem;
          color: #d4ccc2; font-size: 0.9rem; font-weight: 500;
          cursor: pointer; transition: all .2s ease; border: 1px solid transparent;
          text-decoration: none;
        }
        .sidebar-link:hover { background: rgba(255,255,255,.06); color: #f8f5f1; }
        .sidebar-link.active { background: rgba(255,255,255,.12); color: #f8f5f1; border-color: rgba(255,255,255,.1); }
        .sidebar-link.active svg { color: var(--gold); }
        .admin-sidebar { scrollbar-width: none; -ms-overflow-style: none; }
        .admin-sidebar::-webkit-scrollbar { display: none; }
        #admin-root button, #admin-root a, #admin-root [role="button"], #admin-root select { cursor: pointer; }
      `}</style>
    </div>
  );
}
