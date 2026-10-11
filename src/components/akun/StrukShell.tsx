"use client";

import { useRouter } from "next/navigation";
import { useSafeLocale } from "@/lib/safe-i18n";

/**
 * Kerangka halaman "Struk Hangat" untuk area akun: gaya + header.
 *
 * Dipakai halaman detail pesanan dan halaman lacak pesanan supaya keduanya tampil sama.
 * Semua kelas diberi awalan `sk-` dan hanya hidup di dalam `<style>` ini, jadi tidak
 * menyentuh gaya global halaman akun lain (lihat ADDON_CSS di StepCart.tsx untuk pola yang sama).
 */
export const STRUK_CSS = `
.sk-root{position:relative;background:#F7F2E8;color:#1B1A17;font-weight:500;letter-spacing:-.01em;min-height:70vh}
.sk-wrap{max-width:1040px;margin:0 auto}
@keyframes sk-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes sk-pop{from{opacity:.35;transform:scale(1.03)}to{opacity:1;transform:scale(1)}}
.sk-up{opacity:0;animation:sk-up .6s cubic-bezier(.2,.7,.2,1) forwards}
.sk-d1{animation-delay:.04s}.sk-d2{animation-delay:.12s}.sk-d3{animation-delay:.2s}
.sk-d4{animation-delay:.28s}.sk-d5{animation-delay:.36s}.sk-d6{animation-delay:.44s}
@media (prefers-reduced-motion:reduce){.sk-up{opacity:1;animation:none}.sk-shot img{animation:none}}

/* ── Header mobile ── */
.sk-top{display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(247,242,232,.93);backdrop-filter:blur(10px);border-bottom:1px solid rgba(207,195,168,.55)}
.sk-bk{width:38px;height:38px;border-radius:13px;background:#fffdf7;border:1px solid #e6ddc9;display:grid;place-items:center;cursor:pointer;transition:background .2s,transform .2s}
.sk-bk:hover{background:#efe7d6}
.sk-bk:active{transform:scale(.95)}
.sk-bk:focus-visible{outline:2px solid #B4552F;outline-offset:2px}
.sk-top h1{font-size:16.5px;font-weight:800;letter-spacing:-.02em}

/* ── Judul desktop (sidebar layout sudah punya header sendiri) ── */
.sk-dhead{display:none}

.sk-body{padding:0 0 8px}
.sk-card{margin:14px 12px 0;background:#fffdf7;border:1px solid #e8dfca;border-radius:18px;padding:18px 16px;box-shadow:0 10px 26px rgba(27,26,23,.055)}
.sk-card > h3{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:#8a8473;margin-bottom:14px}
.sk-card > h3:before{content:"";width:14px;height:1px;background:#cfc3a8}

/* ── Hero produk ── */
.sk-hero{padding:8px 12px 0}
.sk-shot{position:relative;border-radius:20px;overflow:hidden;background:radial-gradient(120% 100% at 50% 0%,#fbf6ea 0%,#ece1c9 55%,#dfd2b6 100%);box-shadow:0 16px 36px rgba(27,26,23,.10)}
.sk-shot img{display:block;width:100%;aspect-ratio:4/5;object-fit:contain;animation:sk-pop 1s ease-out both}
.sk-chip{position:absolute;top:12px;left:12px;display:inline-flex;align-items:center;gap:7px;padding:7px 13px;border-radius:999px;font-size:12px;font-weight:700;background:rgba(255,253,247,.93);border:1px solid rgba(227,218,198,.9);box-shadow:0 6px 18px rgba(27,26,23,.10);backdrop-filter:blur(8px)}
.sk-dot{width:7px;height:7px;border-radius:50%;flex:none}
.sk-t-wait .sk-dot{background:#B4552F}
.sk-t-process .sk-dot{background:#b58c4a}
.sk-t-ship .sk-dot{background:#3f6ea8}
.sk-t-done .sk-dot{background:#6E7358}
.sk-t-cancel .sk-dot{background:#a4483f}
.sk-meta{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;padding:18px 6px 4px}
.sk-eyebrow{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:#8a8473}
.sk-no{font-size:22px;font-weight:800;letter-spacing:-.02em;margin-top:4px;line-height:1.15;word-break:break-word}
.sk-dt{font-size:12.5px;color:#6b665a;margin-top:4px}
.sk-mini{text-align:right;flex:none}
.sk-mini b{display:block;font-size:19px;font-weight:800;color:#B4552F;font-variant-numeric:tabular-nums;margin-top:4px}

/* ── Langkah pesanan (timeline) ── */
.sk-steps{display:flex;flex-direction:column}
.sk-step{display:flex;gap:14px}
.sk-rail{display:flex;flex-direction:column;align-items:center;width:22px;flex:none}
.sk-node{width:22px;height:22px;border-radius:50%;border:2px solid #dcd2ba;background:#fffdf7;display:grid;place-items:center;flex:none}
.sk-step.is-done .sk-node{background:#6E7358;border-color:#6E7358}
.sk-step.is-done .sk-node:after{content:"";width:5px;height:9px;border:solid #fffdf7;border-width:0 2px 2px 0;transform:rotate(45deg) translate(-1px,-2px)}
.sk-step.is-active .sk-node{border-color:#B4552F;box-shadow:0 0 0 5px rgba(180,85,47,.12)}
.sk-step.is-active .sk-node:after{content:"";width:8px;height:8px;border-radius:50%;background:#B4552F}
.sk-line{flex:1;width:2px;border-radius:2px;background:#e4dac4;margin:4px 0}
.sk-step.is-done .sk-line{background:#d3d6c2}
.sk-txt{padding-bottom:18px;min-width:0}
.sk-step:last-child .sk-txt{padding-bottom:0}
.sk-txt b{display:block;font-size:14.5px;font-weight:700;letter-spacing:-.015em}
.sk-step.is-todo .sk-txt b{color:#a9a294;font-weight:600}
.sk-txt i{display:block;font-style:normal;font-size:12px;color:#8a8473;margin-top:3px}
.sk-step.is-active .sk-txt i{color:#B4552F;font-weight:600}
.sk-hint{display:flex;gap:9px;align-items:flex-start;margin-top:14px;padding:11px 13px;border-radius:13px;background:#fbeee5;color:#8d3f20;font-size:12.5px;line-height:1.45;font-weight:600}
.sk-hint svg{flex:none;margin-top:1px}

/* ── Ringkasan pembayaran ── */
.sk-row{display:flex;justify-content:space-between;gap:12px;font-size:13.5px;padding:6px 0}
.sk-row span:first-child{color:#6b665a}
.sk-row span:last-child{text-align:right;font-weight:600;font-variant-numeric:tabular-nums}
.sk-sep{border-top:1px dashed #cfc3a8;margin:11px 0}
.sk-total{display:flex;justify-content:space-between;align-items:center;gap:12px}
.sk-total span{font-size:14px;font-weight:700}
.sk-total b{font-size:23px;font-weight:800;letter-spacing:-.02em;color:#B4552F;font-variant-numeric:tabular-nums}

/* ── Daftar produk (bisa dilipat) ── */
.sk-root details{margin:14px 12px 0;background:#fffdf7;border:1px solid #e8dfca;border-radius:18px;box-shadow:0 10px 26px rgba(27,26,23,.055);overflow:hidden}
.sk-root details summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:17px 16px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:#8a8473;transition:background .2s}
.sk-root details summary::-webkit-details-marker{display:none}
.sk-root details summary:hover{background:#faf4e6}
.sk-root details summary:focus-visible{outline:2px solid #B4552F;outline-offset:-2px}
.sk-root details summary svg{transition:transform .25s;flex:none}
.sk-root details[open] summary svg{transform:rotate(180deg)}
.sk-it{display:flex;gap:14px;padding:0 16px 16px}
.sk-thumb{width:74px;height:92px;flex:none;border-radius:13px;overflow:hidden;background:radial-gradient(120% 100% at 50% 0%,#fbf6ea 0%,#ece1c9 60%,#dfd2b6 100%);border:1px solid #efe6d3}
.sk-thumb img{width:100%;height:100%;object-fit:contain;display:block}
.sk-it .sk-nm{font-size:14.5px;font-weight:700;line-height:1.3;letter-spacing:-.015em}
.sk-it p{font-size:12.5px;color:#6b665a;line-height:1.5}
.sk-it .sk-pr{font-size:14.5px;font-weight:800;color:#B4552F;margin-top:7px;font-variant-numeric:tabular-nums}

/* ── Aksi bawah (mobile) ── */
.sk-act{position:sticky;bottom:62px;z-index:20;padding:10px 12px 14px;background:linear-gradient(180deg,rgba(247,242,232,0),#F7F2E8 36%)}
.sk-btn{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;padding:15px;border-radius:16px;background:#1B1A17;color:#F7F2E8;font-size:14.5px;font-weight:700;text-decoration:none;cursor:pointer;border:0;box-shadow:0 14px 28px rgba(27,26,23,.20);transition:background .2s,transform .2s}
.sk-btn:hover{background:#B4552F}
.sk-btn:active{transform:scale(.99)}
.sk-btn:focus-visible{outline:2px solid #B4552F;outline-offset:2px}
.sk-note{margin:0 12px;padding:12px 14px;border-radius:13px;border:1px dashed #cfc3a8;color:#6b665a;font-size:12.5px;text-align:center}
.sk-ft{text-align:center;font-size:11px;color:#8a8473;padding:20px 16px 0}

/* ── Desktop: dua kolom, ringkasan pembayaran di kanan ── */
@media (min-width:768px){
 .sk-top{display:none}
 .sk-dhead{display:flex;align-items:center;gap:14px;margin-bottom:16px}
 .sk-dhead h1{font-size:23px;font-weight:800;letter-spacing:-.025em}
 .sk-dhead a{margin-left:auto;display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#6b665a;text-decoration:none}
 .sk-dhead a:hover{color:#B4552F}
 .sk-body{padding:0 0 12px}
 .sk-cols{display:grid;grid-template-columns:minmax(0,1fr) 336px;column-gap:18px;align-items:start}
 .sk-hero{grid-column:1;grid-row:1;padding:0}
 .sk-shot{border-radius:18px}
 .sk-shot img{aspect-ratio:16/11}
 .sk-chip{top:16px;left:16px}
 .sk-meta{padding:20px 2px 4px}
 .sk-tl{grid-column:1;grid-row:2}
 .sk-info{grid-column:1;grid-row:3}
 .sk-pay{grid-column:2;grid-row:1}
 .sk-act{grid-column:2;grid-row:2;position:static;padding:16px 0 0;background:none}
 .sk-card{margin:16px 0 0}
 .sk-root details{margin:16px 0 0}
 .sk-note{margin:0}
 .sk-ft{display:none}
}
`;

/** Header halaman struk (mobile). Sekaligus pemuat gaya "Struk Hangat". */
export function StrukHeader({ title, back }: { title: string; back?: string }) {
  const locale = useSafeLocale();
  const router = useRouter();
  const href = back ? `/${locale}${back}` : undefined;

  return (
    <>
      <style>{STRUK_CSS}</style>
      <div className="sk-top sk-up sk-d1 sticky top-0 z-30 md:hidden">
        <button
          type="button"
          onClick={() => (href ? router.push(href) : router.back())}
          className="sk-bk"
          aria-label="Kembali"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#1B1A17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
        </button>
        <h1>{title}</h1>
      </div>
    </>
  );
}

/** Judul halaman untuk desktop (sidebar akun sudah menampilkan header pengguna). */
export function StrukTitle({ title, back, backLabel }: { title: string; back: string; backLabel: string }) {
  return (
    <div className="sk-dhead">
      <h1>{title}</h1>
      <a href={back}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
        {backLabel}
      </a>
    </div>
  );
}
