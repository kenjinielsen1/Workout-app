/**
 * Validates seeds/exercises.json against the schema invariants before it is
 * ever turned into SQL. Run: npm run seed:validate
 *
 * Catches the mistakes a hand-authored catalog actually makes: duplicate slugs,
 * missing alias counts, bad enum values, load_type/equipment mismatches, and
 * increments that would break the 2.5 lb loadability grid.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = resolve(__dirname, '../seeds/exercises.json');

const MOVEMENT_PATTERNS = new Set([
  'squat', 'hinge', 'horizontal_push', 'vertical_push',
  'horizontal_pull', 'vertical_pull', 'lunge', 'carry', 'isolation',
]);
const EQUIPMENT = new Set([
  'barbell', 'dumbbell', 'kettlebell', 'machine_selectorized',
  'machine_plate', 'cable', 'bodyweight', 'band',
]);
const LOAD_TYPES = new Set(['total', 'per_side', 'per_hand', 'bodyweight_plus']);

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

const raw = JSON.parse(readFileSync(SEED_PATH, 'utf8')) as SeedExercise[];
const errors: string[] = [];
const warnings: string[] = [];

const slugs = new Set<string>();
const allAliases = new Map<string, string>(); // normalized alias -> slug

const norm = (s: string) => s.trim().toLowerCase();

for (const [i, e] of raw.entries()) {
  const at = `#${i} (${e.slug ?? 'no-slug'})`;

  if (!e.slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.slug))
    errors.push(`${at}: slug must be kebab-case`);
  if (slugs.has(e.slug)) errors.push(`${at}: duplicate slug`);
  slugs.add(e.slug);

  if (!e.name?.trim()) errors.push(`${at}: missing name`);
  if (!MOVEMENT_PATTERNS.has(e.movement_pattern))
    errors.push(`${at}: bad movement_pattern '${e.movement_pattern}'`);
  if (!EQUIPMENT.has(e.equipment))
    errors.push(`${at}: bad equipment '${e.equipment}'`);
  if (!LOAD_TYPES.has(e.load_type))
    errors.push(`${at}: bad load_type '${e.load_type}'`);

  if (!Array.isArray(e.primary_muscles) || e.primary_muscles.length === 0)
    errors.push(`${at}: needs at least one primary muscle`);

  if (!Array.isArray(e.aliases) || e.aliases.length < 3 || e.aliases.length > 5)
    errors.push(`${at}: needs 3-5 aliases, has ${e.aliases?.length ?? 0}`);

  if (typeof e.fatigue_cost !== 'number' || e.fatigue_cost < 1 || e.fatigue_cost > 5)
    errors.push(`${at}: fatigue_cost must be 1..5`);

  if (typeof e.default_increment_lb !== 'number' || e.default_increment_lb <= 0)
    errors.push(`${at}: default_increment_lb must be > 0`);
  // Keep increments on the 2.5 grid so emitted targets can stay loadable.
  else if (Number(((e.default_increment_lb * 10) % 25).toFixed(4)) !== 0)
    warnings.push(`${at}: default_increment_lb ${e.default_increment_lb} is off the 2.5 grid`);

  // load_type / equipment sanity.
  if (e.equipment === 'barbell' && e.load_type !== 'total')
    errors.push(`${at}: barbell should be load_type 'total', got '${e.load_type}'`);
  if (e.equipment === 'bodyweight' && e.load_type !== 'bodyweight_plus')
    warnings.push(`${at}: bodyweight usually uses 'bodyweight_plus'`);
  if (e.load_type === 'bodyweight_plus' && e.equipment !== 'bodyweight')
    warnings.push(`${at}: bodyweight_plus on non-bodyweight equipment '${e.equipment}'`);

  // Alias uniqueness across the whole catalog — the anti-fragmentation guarantee.
  for (const a of e.aliases ?? []) {
    const key = norm(a);
    if (allAliases.has(key) && allAliases.get(key) !== e.slug)
      errors.push(`${at}: alias '${a}' also used by ${allAliases.get(key)}`);
    allAliases.set(key, e.slug);
  }
  // The name itself shouldn't collide with a different exercise's alias.
  const nameKey = norm(e.name);
  if (allAliases.has(nameKey) && allAliases.get(nameKey) !== e.slug)
    warnings.push(`${at}: name collides with alias of ${allAliases.get(nameKey)}`);
}

// variant_of must reference an existing root (depth 1).
for (const e of raw) {
  if (e.variant_of) {
    const parent = raw.find((p) => p.slug === e.variant_of);
    if (!parent) errors.push(`${e.slug}: variant_of '${e.variant_of}' not found`);
    else if (parent.variant_of)
      errors.push(`${e.slug}: variant_of points at another variant (depth > 1)`);
  }
}

// ---------------------------------------------------------------------------
console.log(`Validated ${raw.length} exercises, ${allAliases.size} unique aliases.`);
const byPattern = new Map<string, number>();
for (const e of raw) byPattern.set(e.movement_pattern, (byPattern.get(e.movement_pattern) ?? 0) + 1);
console.log('By pattern:', Object.fromEntries([...byPattern].sort()));

if (warnings.length) {
  console.warn(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.warn('  ⚠ ' + w);
}
if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error('  ✗ ' + e);
  process.exit(1);
}
console.log('\n✓ Seed catalog is valid.');
