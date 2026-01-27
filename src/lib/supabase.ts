import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create client if credentials are available
let supabaseClient: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} else if (typeof window !== 'undefined') {
  // Only warn in browser, not during build
  console.warn(
    'Supabase credentials not found. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local'
  );
}

export const supabase = supabaseClient;

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => supabaseClient !== null;

// Database types
export interface DbMap {
  id: string;
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
