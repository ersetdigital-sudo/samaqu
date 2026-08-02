-- Allow anon key to INSERT/UPDATE/DELETE on product_series
DO $$ BEGIN CREATE POLICY "Anon write product_series" ON product_series FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Same forjenis_kain (already has service role policy, but anon needs write too)
DO $$ BEGIN CREATE POLICY "Anon write jenis_kain" ON jenis_kain FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
