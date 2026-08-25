-- Bio links table for managing the bio link page
-- Each row is one link/button on samaqu.id/bio

create table if not exists bio_links (
  id          uuid primary key default gen_random_uuid(),
  section     text not null,              -- 'Belanja', 'Informasi', 'Tentang', 'Ikuti'
  label       text not null,              -- display text
  subtitle    text default '',            -- optional subtitle (e.g. 'Official Website')
  href        text not null default '#',  -- target URL
  icon        text not null default 'link', -- icon name (mapped to SVG in bio page)
  sort_order  int not null default 0,     -- order within section
  enabled     boolean not null default true,
  target      text default '',            -- e.g. '_blank' for external links
  created_at  timestamptz not null default now()
);

-- Seed with current hardcoded data
insert into bio_links (section, label, subtitle, href, icon, sort_order, enabled, target) values
-- Belanja
('Belanja', 'Lihat Koleksi Samaqu', 'Official Website', '/id/katalog', 'shopping-bag', 1, true, ''),
('Belanja', 'Pesan via WhatsApp', '', 'https://wa.me/6281234567890', 'whatsapp', 2, true, '_blank'),
-- Informasi
('Informasi', 'Create Your Price', '', '#', 'tag', 1, true, ''),
('Informasi', 'Panduan Ukuran', '', '#', 'ruler', 2, true, ''),
('Informasi', 'Review Pelanggan', '', '#', 'star', 3, true, ''),
('Informasi', 'Cara Pemesanan', '', '#', 'clipboard', 4, true, ''),
('Informasi', 'Garansi & Retur', '', '#', 'shield', 5, true, ''),
-- Tentang
('Tentang', 'Tentang Samaqu', '', '#', 'info', 1, true, ''),
('Tentang', 'Sama Quran', '', '#', 'book', 2, true, ''),
-- Ikuti
('Ikuti', 'Instagram', '', 'https://instagram.com/', 'instagram', 1, true, '_blank'),
('Ikuti', 'Website', '', '#', 'globe', 2, true, ''),
('Ikuti', 'WhatsApp', '', 'https://wa.me/6281234567890', 'whatsapp', 3, true, '_blank');

-- RLS
alter table bio_links enable row level security;
drop policy if exists "Allow all bio_links" on bio_links;
create policy "Allow all bio_links" on bio_links for all using (true) with check (true);
