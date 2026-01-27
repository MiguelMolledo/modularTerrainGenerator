/**
 * Script to fix corrupted shapeKeys in the database
 *
 * Run with: npx tsx scripts/fix-shape-keys.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env.local
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env.local');
    const content = readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    }
  } catch (e) {
    console.error('Could not load .env.local');
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface PieceShape {
  id: string;
  shape_key: string;
  name: string;
  width: number;
  height: number;
  is_diagonal: boolean;
  default_rotation: number;
}

function generateCorrectShapeKey(shape: PieceShape): string {
  let key = `${shape.width}x${shape.height}`;

  if (shape.is_diagonal) {
    const rotationLabel = ['tl', 'tr', 'br', 'bl'][shape.default_rotation / 90] || 'tl';
    key += `-diagonal-${rotationLabel}`;
  }

  // Note: We can't detect elevation from the shape data alone
  // Elevation is stored separately, so we just fix dimension-based keys

  return key;
}

async function fixShapeKeys() {
  console.log('Fetching all piece shapes...\n');

  const { data: shapes, error } = await supabase
    .from('piece_shapes')
    .select('*');

  if (error) {
    console.error('Error fetching shapes:', error);
    process.exit(1);
  }

  if (!shapes || shapes.length === 0) {
    console.log('No shapes found in database');
    return;
  }

  console.log(`Found ${shapes.length} shapes\n`);

  const issues: { shape: PieceShape; correctKey: string }[] = [];
  const duplicateKeys = new Map<string, PieceShape[]>();

  // First pass: identify issues
  for (const shape of shapes as PieceShape[]) {
    const correctKey = generateCorrectShapeKey(shape);

    // Check if current key matches expected key (ignoring elevation suffix)
    const baseCurrentKey = shape.shape_key.split('-e')[0]; // Remove elevation suffix if present
    const baseCorrectKey = correctKey;

    if (baseCurrentKey !== baseCorrectKey) {
      issues.push({ shape, correctKey });
      console.log(`❌ MISMATCH: "${shape.name}"`);
      console.log(`   Current key: ${shape.shape_key}`);
      console.log(`   Expected:    ${correctKey} (based on ${shape.width}x${shape.height})`);
      console.log('');
    }

    // Track duplicates
    const key = shape.shape_key;
    if (!duplicateKeys.has(key)) {
      duplicateKeys.set(key, []);
    }
    duplicateKeys.get(key)!.push(shape);
  }

  // Report duplicates
  console.log('\n--- Duplicate Keys ---\n');
  let hasDuplicates = false;
  for (const [key, shapesWithKey] of duplicateKeys) {
    if (shapesWithKey.length > 1) {
      hasDuplicates = true;
      console.log(`⚠️  Key "${key}" is used by ${shapesWithKey.length} shapes:`);
      for (const s of shapesWithKey) {
        console.log(`   - ${s.name} (${s.width}x${s.height}, id: ${s.id})`);
      }
      console.log('');
    }
  }

  if (!hasDuplicates) {
    console.log('No duplicate keys found.\n');
  }

  if (issues.length === 0) {
    console.log('✅ All shape keys are correct!');
    return;
  }

  console.log(`\n--- Found ${issues.length} shapes with incorrect keys ---\n`);
  console.log('Fixing...\n');

  // Fix issues
  for (const { shape, correctKey } of issues) {
    // Check if the correct key already exists (would cause duplicate)
    const existingWithCorrectKey = (shapes as PieceShape[]).find(
      s => s.shape_key === correctKey && s.id !== shape.id
    );

    if (existingWithCorrectKey) {
      console.log(`⚠️  Cannot fix "${shape.name}" - key "${correctKey}" already exists`);
      console.log(`   Used by: "${existingWithCorrectKey.name}"`);
      console.log(`   Consider deleting one of these shapes manually.\n`);
      continue;
    }

    const { error: updateError } = await supabase
      .from('piece_shapes')
      .update({ shape_key: correctKey })
      .eq('id', shape.id);

    if (updateError) {
      console.log(`❌ Failed to fix "${shape.name}": ${updateError.message}`);
    } else {
      console.log(`✅ Fixed "${shape.name}": ${shape.shape_key} → ${correctKey}`);
    }
  }

  console.log('\nDone!');
}

fixShapeKeys().catch(console.error);
