/**
 * Writes the canonical feature contract (ordered names) to ml/feature_spec.json,
 * so the Python service and the TS feature pipeline agree on the exact vector
 * layout. Run: npm run feature:spec
 *
 * A drift guard (src/lib/featureSpec.test.ts) fails if FEATURE_NAMES and the
 * committed JSON diverge.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { FEATURE_NAMES } from '../src/lib/features';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../ml/feature_spec.json');

const spec = {
  version: 1,
  count: FEATURE_NAMES.length,
  feature_names: FEATURE_NAMES,
};

writeFileSync(OUT, JSON.stringify(spec, null, 2) + '\n', 'utf8');
console.log(`Wrote ${OUT} with ${FEATURE_NAMES.length} features.`);
