-- Konten halaman bio link (samaqu.id/bio) yang bisa diedit dari /admin/biolink.
-- Satu baris (id = 1); seluruh isi halaman disimpan sebagai JSON supaya
-- struktur visual (hero, kategori, garansi, marquee) bisa diubah tanpa migrasi baru.
--
-- Bentuk JSON mengikuti DEFAULT_BIO_CONTENT di src/lib/bio-page-content.ts.

create table if not exists bio_page_content (
  id          int primary key default 1 check (id = 1),
  content     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- RLS: konsisten dengan tabel bio lain (dibaca halaman publik, ditulis admin).
alter table bio_page_content enable row level security;
drop policy if exists "Allow all bio_page_content" on bio_page_content;
create policy "Allow all bio_page_content" on bio_page_content for all using (true) with check (true);

insert into bio_page_content (id, content)
values (1, '{}'::jsonb)
on conflict (id) do nothing;
