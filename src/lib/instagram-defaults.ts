/**
 * Konstanta section Instagram di Home — dipakai bersama oleh komponen website
 * (`src/components/Instagram.tsx`) dan halaman admin "Kelola Foto Instagram".
 *
 * Jumlah slot HARUS sama dengan grid di website (3 kolom × 2 baris = 6).
 * Jangan menebak: kalau grid website berubah, ubah angka ini juga.
 */
export const INSTAGRAM_SLOTS = 6;

/** Profil Instagram default (dipakai kalau "Link tujuan" sebuah foto dikosongkan). */
export const INSTAGRAM_PROFILE = "https://instagram.com/samaqu.id";

/**
 * Foto bawaan = foto yang dipakai website sebelum admin mengubahnya.
 * Dipakai sebagai fallback per slot di website (supaya grid tidak pernah bolong)
 * dan sekaligus sumber data awal seed di `supabase/instagram-photos.sql`.
 */
export const INSTAGRAM_DEFAULT_PHOTOS: { src: string; alt: string }[] = [
  { src: "/images/c8a0800b-b9bb-4b53-bd5e-00f26a500219.png", alt: "SAMAQU thobe" },
  { src: "/images/6dc8bbe4-ca21-49a6-83a6-c2435d4b14db.png", alt: "SAMAQU thobe" },
  { src: "/images/4419a3a6-0e9a-46bc-97c1-657808a84044.png", alt: "SAMAQU tunik" },
  { src: "/images/dd7c9baf-e018-41d2-aa90-fde6d68a96f7.png", alt: "SAMAQU thobe" },
  { src: "/images/000ee3e5-1e1a-439e-a35e-4448fe95a3f6.png", alt: "SAMAQU thobe" },
  { src: "/images/6c9fafc8-b3b8-46ac-ace5-693bd7911905.png", alt: "SAMAQU vest" },
];
