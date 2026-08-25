-- Remove unique constraint: allow multiple images per category+type
alter table katalog_info_images drop constraint if exists katalog_info_images_cat_type_unique;
