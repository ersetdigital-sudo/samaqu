-- Fix: allow all operations on katalog_info_images (matches other content tables pattern)
-- Drop existing policies
drop policy if exists "Public can read katalog info images" on katalog_info_images;
drop policy if exists "Authenticated full access katalog info images" on katalog_info_images;
drop policy if exists "Service role full access katalog info images" on katalog_info_images;

-- Simple permissive policy for all operations
create policy "Allow all katalog_info_images"
  on katalog_info_images for all
  using (true)
  with check (true);
