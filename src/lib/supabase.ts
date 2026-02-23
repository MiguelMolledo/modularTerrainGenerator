import { createClient } from '@/lib/supabase/client';

// Browser client — use this in client components
// For server components and middleware, use createClient from '@/lib/supabase/server'
export const supabase = createClient();

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Database types
export interface DbMap {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  map_width: number;
  map_height: number;
  levels: number[];
  placed_pieces: unknown; // JSONB
  grid_config: unknown | null; // JSONB
  thumbnail: string | null;
  snapshot: string | null;
  is_custom_thumbnail: boolean;
  created_at: string;
  updated_at: string;
}

// Inventory database types
export interface DbMagnetConfig {
  size: string;
  quantity: number;
}

export interface DbPieceShape {
  id: string;
  shape_key: string;
  name: string;
  width: number;
  height: number;
  is_diagonal: boolean;
  default_rotation: number;
  display_order: number;
  base_height: number | null; // Base height in inches (default 0.5")
  magnets: DbMagnetConfig[] | null; // JSONB: array of magnet configurations
  created_at: string;
}

export interface DbTerrainType {
  id: string;
  slug: string;
  name: string;
  color: string;
  icon: string;
  description: string | null;
  is_default: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbTerrainPiece {
  id: string;
  terrain_type_id: string;
  shape_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface DbTerrainObject {
  id: string;
  terrain_type_id: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  emoji: string;
  description: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface DbCustomPiece {
  id: string;
  name: string;
  width: number;
  height: number;
  cell_colors: string[][]; // JSONB: 2D array of terrain type UUIDs
  quantity: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbPieceTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  is_default: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbPieceTemplateItem {
  id: string;
  template_id: string;
  shape_id: string;
  quantity: number;
}

export interface DbPieceVariant {
  id: string;
  terrain_type_id: string;
  shape_id: string;
  name: string;
  tags: string[];
  cell_colors: string[][]; // JSONB: 2D array of terrain type UUIDs
  quantity: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}
