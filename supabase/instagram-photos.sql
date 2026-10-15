-- ─────────────────────────────────────────────────────────────────────────────
-- Kelola Foto Instagram (section Home "Ikuti perjalanan kami di Instagram").
--
-- Aman dijalankan berulang: IF NOT EXISTS / ON CONFLICT DO NOTHING.
-- Tulis (insert/update/delete) HANYA lewat API admin (service role);
-- publik hanya boleh membaca.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Tabel ringan: satu baris = satu slot foto (posisi 1..N = urutan di website).
create table if not exists public.instagram_photos (
  id uuid primary key default gen_random_uuid(),
  posisi integer not null,
  image_url text,
  link text,
  alt text,
  updated_at timestamptz not null default now()
);

-- posisi unik → satu foto per slot.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'instagram_photos_posisi_key') then
    alter table public.instagram_photos add constraint instagram_photos_posisi_key unique (posisi);
  end if;
end $$;

-- 2) RLS: publik hanya baca. Tanpa policy tulis, jadi insert/update/delete
--    hanya mungkin lewat service role (API admin).
alter table public.instagram_photos enable row level security;

drop policy if exists "instagram_photos_public_read" on public.instagram_photos;
create policy "instagram_photos_public_read" on public.instagram_photos
  for select using (true);

-- 3) Bucket storage publik untuk foto Instagram (nama bisa dioverride via env INSTAGRAM_BUCKET).
insert into storage.buckets (id, name, public)
values ('instagram-photos', 'instagram-photos', true)
on conflict (id) do nothing;

drop policy if exists "instagram_photos_storage_read" on storage.objects;
create policy "instagram_photos_storage_read" on storage.objects
  for select using (bucket_id = 'instagram-photos');

-- 4) Seed: isi dari 6 foto yang dipakai website saat ini → tampilan tidak berubah.
insert into public.instagram_photos (posisi, image_url, alt) values
  (1, '/images/c8a0800b-b9bb-4b53-bd5e-00f26a500219.png', 'SAMAQU thobe'),
  (2, '/images/6dc8bbe4-ca21-49a6-83a6-c2435d4b14db.png', 'SAMAQU thobe'),
  (3, '/images/4419a3a6-0e9a-46bc-97c1-657808a84044.png', 'SAMAQU tunik'),
  (4, '/images/dd7c9baf-e018-41d2-aa90-fde6d68a96f7.png', 'SAMAQU thobe'),
  (5, '/images/000ee3e5-1e1a-439e-a35e-4448fe95a3f6.png', 'SAMAQU thobe'),
  (6, '/images/6c9fafc8-b3b8-46ac-ace5-693bd7911905.png', 'SAMAQU vest')
on conflict (posisi) do nothing;
