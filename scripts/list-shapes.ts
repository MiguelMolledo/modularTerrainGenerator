/**
 * Script to list all shapes in the database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listShapes() {
  const { data, error } = await supabase
    .from('piece_shapes')
    .select('*')
    .order('shape_key');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\nAll shapes in database:\n');
  console.log('ID | Key | Name | Dimensions | Diagonal');
  console.log('-'.repeat(80));

  for (const shape of data) {
    console.log(`${shape.id.slice(0, 8)}... | ${shape.shape_key.padEnd(20)} | ${shape.name.padEnd(20)} | ${shape.width}x${shape.height} | ${shape.is_diagonal}`);
  }

  console.log(`\nTotal: ${data.length} shapes`);

  // Check for 6x6
  const sixBySix = data.filter(s => s.shape_key.startsWith('6x6'));
  if (sixBySix.length > 0) {
    console.log('\n6x6 shapes found:');
    for (const s of sixBySix) {
      console.log(`  - ${s.name} (key: ${s.shape_key})`);
    }
  } else {
    console.log('\nNo 6x6 shapes found - you can create one!');
  }
}

listShapes().catch(console.error);
