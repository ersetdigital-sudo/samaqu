-- Fix: allow authenticated users to manage katalog_info_images (like other content tables)
drop policy if exists "Service role full access katalog info images" on katalog_info_images;

create policy "Authenticated full access katalog info images"
  on katalog_info_images for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
