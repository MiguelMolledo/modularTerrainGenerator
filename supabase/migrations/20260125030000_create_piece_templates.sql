-- User-defined piece templates
CREATE TABLE piece_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT '📦',
  is_default BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template pieces (which shapes and quantities each template includes)
CREATE TABLE piece_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES piece_templates(id) ON DELETE CASCADE,
  shape_id UUID NOT NULL REFERENCES piece_shapes(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  UNIQUE(template_id, shape_id)
);

-- Enable Row Level Security
ALTER TABLE piece_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE piece_template_items ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for local dev)
CREATE POLICY "Allow all on piece_templates" ON piece_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on piece_template_items" ON piece_template_items FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_piece_template_items_template ON piece_template_items(template_id);

-- Trigger for updated_at
CREATE TRIGGER update_piece_templates_updated_at BEFORE UPDATE ON piece_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default templates
INSERT INTO piece_templates (name, description, icon, is_default, display_order) VALUES
  ('Empty', 'No pieces - add them manually', '📭', true, 0),
  ('Starter Set', 'Basic pieces to get started', '🎯', true, 1),
  ('Standard Set', 'Common pieces for most builds', '📦', true, 2),
  ('Full Set', 'All pieces with generous quantities', '🎁', true, 3),
  ('Diagonals Only', 'Just triangular pieces', '📐', true, 4),
  ('Strip Pieces', 'Thin pieces for borders', '📏', true, 5),
  ('Squares Only', 'Just square pieces', '⬛', true, 6);

-- Seed template items for each default template
-- Starter Set
INSERT INTO piece_template_items (template_id, shape_id, quantity)
SELECT t.id, s.id,
  CASE s.shape_key
    WHEN '3x3' THEN 4
    WHEN '6x6' THEN 2
    WHEN '3x6' THEN 2
    WHEN '6x3' THEN 2
    ELSE 0
  END
FROM piece_templates t
CROSS JOIN piece_shapes s
WHERE t.name = 'Starter Set'
  AND s.shape_key IN ('3x3', '6x6', '3x6', '6x3');

-- Standard Set
INSERT INTO piece_template_items (template_id, shape_id, quantity)
SELECT t.id, s.id,
  CASE s.shape_key
    WHEN '3x3' THEN 6
    WHEN '6x6' THEN 4
    WHEN '3x6' THEN 4
    WHEN '6x3' THEN 4
    WHEN '3x1.5' THEN 4
    WHEN '1.5x3' THEN 4
    ELSE 0
  END
FROM piece_templates t
CROSS JOIN piece_shapes s
WHERE t.name = 'Standard Set'
  AND s.shape_key IN ('3x3', '6x6', '3x6', '6x3', '3x1.5', '1.5x3');

-- Full Set
INSERT INTO piece_template_items (template_id, shape_id, quantity)
SELECT t.id, s.id,
  CASE s.shape_key
    WHEN '3x3' THEN 10
    WHEN '6x6' THEN 4
    WHEN '3x6' THEN 5
    WHEN '6x3' THEN 5
    WHEN '3x1.5' THEN 8
    WHEN '1.5x3' THEN 8
    WHEN '6x1.5' THEN 4
    WHEN '1.5x6' THEN 4
    WHEN 'diagonal-tl' THEN 4
    WHEN 'diagonal-tr' THEN 4
    WHEN 'diagonal-br' THEN 4
    WHEN 'diagonal-bl' THEN 4
    ELSE 0
  END
FROM piece_templates t
CROSS JOIN piece_shapes s
WHERE t.name = 'Full Set';

-- Diagonals Only
INSERT INTO piece_template_items (template_id, shape_id, quantity)
SELECT t.id, s.id, 6
FROM piece_templates t
CROSS JOIN piece_shapes s
WHERE t.name = 'Diagonals Only'
  AND s.shape_key IN ('diagonal-tl', 'diagonal-tr', 'diagonal-br', 'diagonal-bl');

-- Strip Pieces
INSERT INTO piece_template_items (template_id, shape_id, quantity)
SELECT t.id, s.id,
  CASE s.shape_key
    WHEN '3x1.5' THEN 8
    WHEN '1.5x3' THEN 8
    WHEN '6x1.5' THEN 6
    WHEN '1.5x6' THEN 6
    ELSE 0
  END
FROM piece_templates t
CROSS JOIN piece_shapes s
WHERE t.name = 'Strip Pieces'
  AND s.shape_key IN ('3x1.5', '1.5x3', '6x1.5', '1.5x6');

-- Squares Only
INSERT INTO piece_template_items (template_id, shape_id, quantity)
SELECT t.id, s.id,
  CASE s.shape_key
    WHEN '3x3' THEN 12
    WHEN '6x6' THEN 6
    ELSE 0
  END
FROM piece_templates t
CROSS JOIN piece_shapes s
WHERE t.name = 'Squares Only'
  AND s.shape_key IN ('3x3', '6x6');
