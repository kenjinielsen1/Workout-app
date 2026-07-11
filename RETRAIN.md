# Retraining the ML model

The deployed service ships with a **synthetic** starter model. This is how to
retrain it on your **real logged data** and redeploy. It only helps once you've
accumulated data — `buildTrainingTable` needs ≥3 prior sessions per exercise, so
early on the export is empty and there's nothing to train.

Two layers work together:
- **The gate** (nightly `pg_cron`, see the Supabase SQL in chat / `model_eval`)
  decides *whether to trust* the model per user.
- **Retraining** (below) actually *improves* the model.

## What you need

- Your Supabase **service_role** key (Dashboard → Settings → API). This bypasses
  RLS to read all logged data — **server-side only, never in the browser or a
  `VITE_*` var.**
- A Fly deploy token: `fly tokens create deploy` (for the automated path).

## Manual retrain (works today, no CI)

From the repo root:

```bash
# 1. Export a training table from Supabase (reuses the tested TS feature pipeline)
SUPABASE_URL=https://isnhcaytdmqahgcfneqr.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<your-service_role-key> \
  npm run export:training -- ml/training_table.json

# 2. Train on it (writes ml/models/model.joblib)
cd ml
python train.py --input training_table.json        # holdout MAE printed

# 3. Redeploy — the Dockerfile bakes in models/model.joblib when present
~/.fly/bin/fly deploy --ha=false
```

`fly deploy` sees the freshly-trained `models/model.joblib` in the build context and
uses it instead of training a synthetic one. Done — `/health` will still report the
model, now trained on your data.

## Automated weekly retrain (GitHub Actions)

1. Add repo **Secrets** (Settings → Secrets and variables → Actions → New secret):
   - `SUPABASE_URL` = `https://isnhcaytdmqahgcfneqr.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = your service_role key
   - `FLY_API_TOKEN` = output of `fly tokens create deploy`
2. Add the workflow (GitHub → **Add file → Create new file** → `.github/workflows/retrain.yml`):

```yaml
name: Retrain ML model
on:
  schedule:
    - cron: '0 9 * * 1' # Mondays 09:00 UTC
  workflow_dispatch: {}
jobs:
  retrain:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - id: export
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          npx tsx scripts/export-training-table.ts ml/training_table.json
          echo "rows=$(node -e "console.log(require('./ml/training_table.json').length)")" >> "$GITHUB_OUTPUT"
      - if: ${{ fromJSON(steps.export.outputs.rows) < 30 }}
        run: echo "Only ${{ steps.export.outputs.rows }} rows — keeping the current model."
      - uses: actions/setup-python@v5
        if: ${{ fromJSON(steps.export.outputs.rows) >= 30 }}
        with: { python-version: '3.12' }
      - name: Train + deploy
        if: ${{ fromJSON(steps.export.outputs.rows) >= 30 }}
        working-directory: ml
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
        run: |
          pip install -r requirements.txt
          python train.py --input training_table.json --out models/model.joblib
          curl -L https://fly.io/install.sh | sh
          export PATH="$HOME/.fly/bin:$PATH"
          fly deploy --ha=false
```

3. Trigger it any time from the **Actions** tab → *Retrain ML model* → **Run
   workflow** (or wait for Monday). It skips (keeps the current model) until you
   have ≥30 training rows.

The gate then judges the new model on your next few sessions and flips
`ml_alpha_cap` accordingly — so a retrain can only ever help, never regress you.
