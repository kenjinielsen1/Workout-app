import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FEATURE_NAMES } from './features';

// Drift guard: the committed ml/feature_spec.json is the contract the Python
// service loads. If FEATURE_NAMES changes, regenerate it (`npm run feature:spec`)
// or the service will read a stale layout.
describe('feature spec contract', () => {
  const spec = JSON.parse(readFileSync(resolve(process.cwd(), 'ml/feature_spec.json'), 'utf8')) as {
    count: number;
    feature_names: string[];
  };

  it('matches FEATURE_NAMES exactly (run `npm run feature:spec` if this fails)', () => {
    expect(spec.feature_names).toEqual(FEATURE_NAMES);
    expect(spec.count).toBe(FEATURE_NAMES.length);
  });
});
