-- Bio carousel images table
-- Stores images for the bio page carousel (samaqu.id/bio)
-- Recommended image size: 1024 x 498 px

create table if not exists bio_carousel_images (
  id          uuid primary key default gen_random_uuid(),
  image_url   text not null,              -- Cloudinary URL or local path
  alt         text default '',            -- alt text for accessibility
  sort_order  int not null default 0,     -- display order
  enabled     boolean not null default true,
  created_at  timestamptz not null default now()
);

-- RLS
alter table bio_carousel_images enable row level security;
drop policy if exists "Allow all bio_carousel" on bio_carousel_images;
create policy "Allow all bio_carousel" on bio_carousel_images for all using (true) with check (true);

-- Seed with current hardcoded images
insert into bio_carousel_images (image_url, alt, sort_order, enabled) values
('/bio-images/7ac920f0-0cd1-4296-8604-1ada8c4cd69f.png', 'Koleksi Samaqu 1', 1, true),
('/bio-images/1db09a85-30ed-4d90-82d3-267b6618b580.png', 'Koleksi Samaqu 2', 2, true),
('/bio-images/f2ed96b8-98b6-4cb0-9859-e62c726b7e4b.png', 'Koleksi Samaqu 3', 3, true),
('/bio-images/d8d42a74-9658-4d41-a2a6-d6673221aa4a.png', 'Koleksi Samaqu 4', 4, true);
