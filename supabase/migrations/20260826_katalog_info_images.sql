-- Table for katalog info images (Perbedaan Jenis Kain, Perbedaan Series, etc.)
create table if not exists katalog_info_images (
  id uuid default gen_random_uuid() primary key,
  category text not null,         -- 'Thobe', 'Kandora', etc.
  type text not null,             -- 'kain' or 'series'
  image_url text not null,
  alt_text text default '',
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Unique constraint: one image per category+type
alter table katalog_info_images add constraint katalog_info_images_cat_type_unique unique (category, type);

-- RLS
alter table katalog_info_images enable row level security;

-- Anyone can read
create policy "Public can read katalog info images"
  on katalog_info_images for select
  using (true);

-- Service role can do everything
create policy "Service role full access katalog info images"
  on katalog_info_images for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
