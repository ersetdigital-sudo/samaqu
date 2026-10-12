"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { X, Send, Loader2, Image as ImageIcon } from "lucide-react";
import { useSafeTranslations, useSafeLocale } from "@/lib/safe-i18n";
import { waNumber } from "@/lib/whatsapp";
import { uploadToCloudinary, validateMediaFile } from "@/lib/cloudinary";
import type { ChatProductCard } from "@/lib/chat-tools";

/** Ikon robot untuk bubble chat AI (SVG inline, aman dari perubahan ikon library). */
function RobotIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 6.5V4" />
      <circle cx="12" cy="3" r="1.1" fill="currentColor" stroke="none" />
      <rect x="4" y="6.5" width="16" height="11.5" rx="3.2" />
      <circle cx="9" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <path d="M9.5 15.6h5" />
      <path d="M4 11.5H2.4M20 11.5h1.6" />
    </svg>
  );
}

/**
 * Widget live chat AI di storefront. Nonaktif (render null) sampai `/api/chat`
 * mengonfirmasi chat diaktifkan admin & API key tersedia.
 *
 * Bubble ditaruh di atas FAB WhatsApp (AutoCTA) dengan offset --mobile-nav-h supaya
 * tidak menabrak bottom nav mobile.
 */

interface Msg {
  role: "user" | "assistant";
  content: string;
  products?: ChatProductCard[];
  images?: string[];
}

// Tombol "Lanjut chat ke WhatsApp admin" di panel chat — dimatikan dulu atas permintaan
// pemilik. Ubah ke true untuk menampilkannya lagi (logikanya masih utuh di bawah).
const SHOW_WHATSAPP_HANDOFF = false;

/** Tebal `**text**` → <strong>. Tanpa HTML mentah (aman dari injeksi). */
function renderInline(text: string, keyBase: string) {
  return text.split(/(\*\*[^*\n]+\*\*)/g).filter(Boolean).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={`${keyBase}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={`${keyBase}-${i}`}>{part}</Fragment>
    )
  );
}

/** Render sederhana: baris kosong jadi jarak, `- `/`1. ` jadi daftar, sisanya paragraf. */
function renderRichText(text: string) {
  return text.split("\n").map((line, i) => {
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);

    if (bullet || numbered) {
      const content = bullet ? bullet[1] : numbered![2];
      return (
        <span key={i} className="flex gap-2">
          <span aria-hidden style={{ opacity: 0.6 }}>{bullet ? "•" : `${numbered![1]}.`}</span>
          <span className="min-w-0">{renderInline(content, `l${i}`)}</span>
        </span>
      );
    }
    if (!line.trim()) return <span key={i} className="block h-1.5" />;
    return (
      <span key={i} className="block">
        {renderInline(line, `l${i}`)}
      </span>
    );
  });
}

export default function ChatWidget() {
  const t = useSafeTranslations("chat");
  const locale = useSafeLocale();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const sessionIdRef = useRef("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImageFile(file: File | null | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      await validateMediaFile(file);
      const url = await uploadToCloudinary(file, { scope: "chat" });
      setImageUrl(url);
    } catch (e) {
      console.error("[CHAT] Gagal mengunggah gambar:", e);
      setMessages((m) => [...m, { role: "assistant", content: t("imageError") }]);
    } finally {
      setUploading(false);
    }
  }

  // ID sesi anonim (localStorage) supaya log percakapan bisa dikelompokkan per pengunjung.
  useEffect(() => {
    try {
      let sid = localStorage.getItem("samaqu_chat_sid");
      if (!sid) {
        sid =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem("samaqu_chat_sid", sid);
      }
      sessionIdRef.current = sid;
    } catch {
      sessionIdRef.current = "";
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/chat")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled || !json.enabled) return;
        setReady(true);
        setGreeting(json.greeting || t("greeting"));
        setWhatsapp(json.whatsapp || "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sapaan pembuka muncul saat panel pertama kali dibuka.
  useEffect(() => {
    if (open && !startedRef.current) {
      startedRef.current = true;
      setMessages([{ role: "assistant", content: greeting || t("greeting") }]);
    }
  }, [open, greeting, t]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  async function send() {
    const text = input.trim();
    if ((!text && !imageUrl) || loading || uploading) return;

    const sentImage = imageUrl || undefined;
    const history: Msg[] = [
      ...messages,
      { role: "user", content: text, images: sentImage ? [sentImage] : undefined },
    ];
    let cards: ChatProductCard[] = [];
    // Pesan asisten kosong yang diisi bertahap dari stream.
    const render = (content: string) => setMessages([...history, { role: "assistant", content, products: cards }]);
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setImageUrl(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, sessionId: sessionIdRef.current, locale }),
      });

      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}));
        render(json.error || t("error"));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload) continue;

          let evt: { delta?: string; reset?: boolean; error?: string; done?: boolean; products?: ChatProductCard[] };
          try {
            evt = JSON.parse(payload);
          } catch {
            continue;
          }

          if (evt.reset) acc = "";
          else if (Array.isArray(evt.products)) cards = evt.products;
          else if (typeof evt.delta === "string") acc += evt.delta;
          else if (evt.error) acc = acc || evt.error;

          render(acc);
        }
      }

      if (!acc) render(t("error"));
    } catch {
      render(t("error"));
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return null;

  // Handoff WhatsApp membawa konteks: pertanyaan terakhir pelanggan ikut disertakan.
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content;
  const handoffText = lastUserMessage
    ? `${t("handoffMessage")}\n\nPertanyaan saya: "${lastUserMessage}"`
    : t("handoffMessage");
  const waHref = whatsapp
    ? `https://wa.me/${waNumber(whatsapp)}?text=${encodeURIComponent(handoffText)}`
    : "";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label={t("open")}
        className="fixed right-4 sm:right-6 bottom-[calc(var(--mobile-nav-h)+5.5rem)] z-[95] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105"
        style={{ background: "var(--gold, #b08d57)" }}
      >
        <RobotIcon size={26} />
      </button>
    );
  }

  return (
    <div
      className="fixed z-[96] right-4 sm:right-6 left-4 sm:left-auto bottom-[calc(var(--mobile-nav-h)+1.5rem)] sm:w-[380px] h-[70vh] sm:h-[560px] max-h-[calc(100vh-6rem)] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
      style={{ background: "var(--bg, #fff)", border: "1px solid #e4e4e7" }}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white shrink-0" style={{ background: "var(--espresso, #2b2118)" }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,.15)" }}>
            <RobotIcon size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{t("title")}</p>
            <p className="text-[11px] opacity-80 truncate">{t("subtitle")}</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} aria-label={t("close")} className="p-1 opacity-80 hover:opacity-100">
          <X size={18} />
        </button>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2" style={{ background: "var(--sub, #fafafa)" }}>
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col gap-1.5 ${m.role === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words ${
                m.role === "user" ? "text-white whitespace-pre-wrap" : "space-y-px"
              }`}
              style={
                m.role === "user"
                  ? { background: "var(--gold, #b08d57)" }
                  : { background: "#fff", color: "var(--fg, #18181b)", border: "1px solid #ececec" }
              }
            >
              {m.role === "user" ? (
                <>
                  {m.images?.map((u) => (
                    <img key={u} src={u} alt="" className="block rounded-lg max-h-48 w-auto mb-1.5" />
                  ))}
                  {m.content}
                </>
              ) : (
                renderRichText(m.content)
              )}
            </div>
            {m.products && m.products.length > 0 && (
              <div className="w-full space-y-1.5">
                {m.products.map((p) => (
                  <a
                    key={p.id}
                    href={`/${locale}/katalog/${p.id}`}
                    className="flex items-center gap-2.5 rounded-xl p-2"
                    style={{ background: "#fff", border: "1px solid #ececec" }}
                  >
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-11 h-11 rounded-lg object-cover shrink-0" />
                    ) : (
                      <span className="w-11 h-11 rounded-lg shrink-0" style={{ background: "var(--sub, #fafafa)" }} />
                    )}
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold truncate" style={{ color: "var(--fg, #18181b)" }}>
                        {p.name}
                      </span>
                      <span className="block text-[11px] font-medium" style={{ color: "var(--gold, #b08d57)" }}>
                        {p.cyp ? `Mulai Rp ${p.price.toLocaleString("id-ID")}` : `Rp ${p.price.toLocaleString("id-ID")}`}
                        <span style={{ color: "var(--fg3, #a1a1aa)" }}>{" · "}{p.category}</span>
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && !messages[messages.length - 1]?.content && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-3 py-2 text-sm" style={{ background: "#fff", border: "1px solid #ececec" }}>
              <Loader2 size={16} className="animate-spin" />
            </div>
          </div>
        )}
      </div>

      {SHOW_WHATSAPP_HANDOFF && waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-center text-xs font-semibold py-2 border-t"
          style={{ borderColor: "#ececec", color: "var(--espresso, #2b2118)", background: "#fff" }}
        >
          {t("handoff")}
        </a>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="shrink-0 border-t"
        style={{ borderColor: "#ececec", background: "#fff" }}
      >
        {imageUrl && (
          <div className="px-2 pt-2">
            <div className="relative inline-block">
              <img src={imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover" style={{ border: "1px solid #e4e4e7" }} />
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                aria-label={t("removeImage")}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white"
                style={{ background: "rgba(0,0,0,.7)" }}
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 p-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              handleImageFile(f);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || loading}
            aria-label={t("attach")}
            className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40"
            style={{ border: "1px solid #e4e4e7", color: "var(--fg2, #52525b)" }}
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("placeholder")}
            className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
            style={{ border: "1px solid #e4e4e7", background: "#fff", color: "var(--fg, #18181b)" }}
          />
          <button
            type="submit"
            disabled={loading || uploading || (!input.trim() && !imageUrl)}
            aria-label={t("send")}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-40"
            style={{ background: "var(--gold, #b08d57)" }}
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
