// Validates every supabase/migrations/*.sql against the REAL PostgreSQL grammar
// (libpg_query via WASM). Catches DDL/enum/policy/trigger/seed syntax errors
// without a running database. Run: npm run db:check
//
// Scope: this is a *grammar* check. It does NOT verify runtime semantics (RLS
// behavior, auth.uid(), FK integrity, trigger execution) — that needs a live
// Postgres / Supabase project.
import Module from 'pg-query-emscripten';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../supabase/migrations');

async function parseWhole(sql) {
  const pg = await new Module(); // fresh instance per file — avoids WASM state reuse
  const res = pg.parse(sql);
  if (res.error) throw new Error(`${res.error.message} @line ${res.error.lineno}`);
  return res.parse_tree?.stmts?.length ?? 0;
}

// Large generated files (no dollar-quoted bodies) are validated statement by
// statement, since the WASM parser is unhappy with very large single inputs.
async function parsePerStatement(sql) {
  const stmts = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('--') && s !== 'begin' && s !== 'commit');
  for (const s of stmts) {
    const pg = await new Module();
    const res = pg.parse(s + ';');
    if (res.error) throw new Error(`stmt "${s.slice(0, 60)}…" → ${res.error.message}`);
  }
  return stmts.length;
}

let ok = true;
for (const f of readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()) {
  const sql = readFileSync(`${dir}/${f}`, 'utf8');
  try {
    let n, how;
    try {
      n = await parseWhole(sql);
      how = 'whole-file';
    } catch {
      n = await parsePerStatement(sql);
      how = 'per-statement';
    }
    console.log(`✓ ${f}: ${n} statements valid PostgreSQL (${how})`);
  } catch (e) {
    ok = false;
    console.log(`✗ ${f}: ${e.message}`);
  }
}
process.exit(ok ? 0 : 1);
