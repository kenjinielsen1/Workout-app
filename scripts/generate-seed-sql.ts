/**
 * Turns seeds/exercises.json into a reproducible, idempotent Supabase migration.
 * The JSON is the diffable source of truth; the .sql is a generated artifact.
 * Run: npm run seed:sql   (writes supabase/migrations/20260101000002_seed_exercises.sql)
 *
 * Slugs are stable natural keys, so re-running upserts rather than duplicating.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = resolve(__dirname, '../seeds/exercises.json');
const OUT_PATH = resolve(__dirname, '../supabase/migrations/20260101000002_seed_exercises.sql');

interface SeedExercise {
  slug: string;
  name: string;
  movement_pattern: string;
  primary_muscles: string[];
  secondary_muscles?: string[];
  equipment: string;
  load_type: string;
  is_compound: boolean;
  is_unilateral: boolean;
  default_increment_lb: number;
  fatigue_cost: number;
  aliases: string[];
  variant_of?: string | null;
}

const seeds = JSON.parse(readFileSync(SEED_PATH, 'utf8')) as SeedExercise[];

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const arr = (xs: string[] = []) =>
  `ARRAY[${xs.map(q).join(', ')}]::text[]`;

const lines: string[] = [];
lines.push('-- GENERATED FILE — do not edit by hand.');
lines.push('-- Source: seeds/exercises.json  •  Regenerate: npm run seed:sql');
lines.push('-- Idempotent: upserts on the natural key `slug`.');
lines.push('');
lines.push('begin;');
lines.push('');

// Pass 1: upsert every exercise (variant_of resolved in pass 2 so order is free).
for (const e of seeds) {
  lines.push(
    `insert into exercises (slug, name, movement_pattern, primary_muscles, ` +
      `secondary_muscles, equipment, load_type, is_unilateral, is_compound, ` +
      `default_increment_lb, fatigue_cost, is_system, owner_id) values (`,
  );
  lines.push(
    `  ${q(e.slug)}, ${q(e.name)}, ${q(e.movement_pattern)}::movement_pattern, ` +
      `${arr(e.primary_muscles)}, ${arr(e.secondary_muscles)}, ` +
      `${q(e.equipment)}::equipment, ${q(e.load_type)}::load_type, ` +
      `${e.is_unilateral}, ${e.is_compound}, ${e.default_increment_lb}, ` +
      `${e.fatigue_cost}, true, null)`,
  );
  lines.push(
    `on conflict (slug) do update set ` +
      `name = excluded.name, movement_pattern = excluded.movement_pattern, ` +
      `primary_muscles = excluded.primary_muscles, ` +
      `secondary_muscles = excluded.secondary_muscles, ` +
      `equipment = excluded.equipment, load_type = excluded.load_type, ` +
      `is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, ` +
      `default_increment_lb = excluded.default_increment_lb, ` +
      `fatigue_cost = excluded.fatigue_cost;`,
  );
  lines.push('');
}

// Pass 2: resolve variant_of by slug now that all rows exist.
for (const e of seeds) {
  if (e.variant_of) {
    lines.push(
      `update exercises set variant_of = (select id from exercises where slug = ${q(e.variant_of)}) ` +
        `where slug = ${q(e.slug)};`,
    );
  }
}
lines.push('');

// Pass 3: aliases. Clear system-exercise aliases first, then reinsert — keeps the
// migration idempotent without needing a unique-violation dance.
for (const e of seeds) {
  lines.push(
    `delete from exercise_aliases where exercise_id = (select id from exercises where slug = ${q(e.slug)});`,
  );
  for (const a of e.aliases) {
    lines.push(
      `insert into exercise_aliases (exercise_id, alias) values ` +
        `((select id from exercises where slug = ${q(e.slug)}), ${q(a)});`,
    );
  }
}

lines.push('');
lines.push('commit;');
lines.push('');

writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');
console.log(`Wrote ${OUT_PATH} from ${seeds.length} exercises.`);
