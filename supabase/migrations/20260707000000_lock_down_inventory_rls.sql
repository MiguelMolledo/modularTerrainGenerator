-- =============================================
-- Lock down inventory RLS policies
-- =============================================
-- The inventory tables below hold seed/reference data only. The client keeps
-- the user's working inventory in localStorage and never writes to these
-- tables (only `profiles` and `maps` are queried from Supabase). The original
-- "Allow all" FOR ALL policies let any authenticated user write to them, which
-- is an abuse vector with no legitimate use. Replace them with read-only SELECT
-- for authenticated users so the tables can still be read but never mutated
-- from the client.
--
-- If any of these tables is later made user-specific, add a `user_id` column
-- and owner-scoped policies (see maps for the pattern) instead of this.

-- piece_shapes
DROP POLICY IF EXISTS "Allow all on piece_shapes" ON piece_shapes;
CREATE POLICY "Read piece_shapes" ON piece_shapes
  FOR SELECT TO authenticated USING (true);

-- terrain_types
DROP POLICY IF EXISTS "Allow all on terrain_types" ON terrain_types;
CREATE POLICY "Read terrain_types" ON terrain_types
  FOR SELECT TO authenticated USING (true);

-- terrain_pieces
DROP POLICY IF EXISTS "Allow all on terrain_pieces" ON terrain_pieces;
CREATE POLICY "Read terrain_pieces" ON terrain_pieces
  FOR SELECT TO authenticated USING (true);

-- terrain_objects
DROP POLICY IF EXISTS "Allow all on terrain_objects" ON terrain_objects;
CREATE POLICY "Read terrain_objects" ON terrain_objects
  FOR SELECT TO authenticated USING (true);

-- custom_pieces
DROP POLICY IF EXISTS "Allow all on custom_pieces" ON custom_pieces;
CREATE POLICY "Read custom_pieces" ON custom_pieces
  FOR SELECT TO authenticated USING (true);

-- piece_templates
DROP POLICY IF EXISTS "Allow all on piece_templates" ON piece_templates;
CREATE POLICY "Read piece_templates" ON piece_templates
  FOR SELECT TO authenticated USING (true);

-- piece_template_items
DROP POLICY IF EXISTS "Allow all on piece_template_items" ON piece_template_items;
CREATE POLICY "Read piece_template_items" ON piece_template_items
  FOR SELECT TO authenticated USING (true);

-- piece_variants
DROP POLICY IF EXISTS "Allow all operations on piece_variants" ON piece_variants;
CREATE POLICY "Read piece_variants" ON piece_variants
  FOR SELECT TO authenticated USING (true);
