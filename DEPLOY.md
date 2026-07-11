# Deploy runbook

Two pieces: the **web app** (static PWA → Vercel) and the optional **ML service**
(FastAPI → Fly/Railway). The app runs fully without the ML service (rules-only), so
ship the web app first.

## 1. Push to GitHub

Create an **empty** repo at <https://github.com/new> (no README/.gitignore/license).
Then, from the repo root:

```bash
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

(macOS keychain supplies your GitHub credentials; if it's your first push it may
prompt for a Personal Access Token.)

## 2. Deploy the web app to Vercel (no CLI needed)

1. <https://vercel.com/new> → **Import** the GitHub repo.
2. Vercel auto-detects Vite (build `npm run build`, output `dist` — also pinned in
   `vercel.json`).
3. **Environment variables** (Settings → Environment Variables) — these are inlined
   at build time by Vite, so set them before the first build:
   - `VITE_SUPABASE_URL` = `https://isnhcaytdmqahgcfneqr.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = your `sb_publishable_…` key (client-safe by design)
   - `VITE_ML_URL` = (leave empty until the ML service is up)
4. **Deploy.** Every push to `main` re-deploys.

### Supabase: allow the deployed origin

In the Supabase dashboard → **Authentication → URL Configuration**, add your Vercel
URL (`https://<project>.vercel.app`) to **Site URL** / **Redirect URLs** so auth
works from the deployed site.

## 3. (Optional) ML service → Fly.io

The service is containerized ([ml/Dockerfile](ml/Dockerfile), which also **bakes in
a starter model** so `/predict` returns real ElasticNet predictions) and has a Fly
config ([ml/fly.toml](ml/fly.toml)). CORS is enabled so the browser can call it.

```bash
# Install flyctl (no Homebrew needed) and log in (opens a browser):
curl -L https://fly.io/install.sh | sh
fly auth login

cd ml
# Pick a unique app name — edit `app` in fly.toml (e.g. workout-tracker-ml-<you>):
fly launch --no-deploy      # adopts the existing fly.toml
fly deploy                  # builds the image (runs train.py) and ships it

# Lock CORS to your site (optional but recommended):
fly secrets set ALLOWED_ORIGINS=https://workout-app-sage-three.vercel.app
```

Then turn the ML blend on:

1. In **Vercel → Settings → Environment Variables**, add
   `VITE_ML_URL=https://<your-app>.fly.dev`.
2. **Redeploy** (Vite inlines it at build time).

The app calls `/predict` on the live path only as a *post-hoc refinement* — if the
service is down or slow it silently falls back to the rule engine (α=0), so this
can never break logging.

### Nightly retrain gate

Run [ml/evaluate.py](ml/evaluate.py) on a schedule (Fly Machines cron, GitHub
Actions `schedule`, or Supabase cron) against exported outcomes; it retrains and
sets each user's `ml_alpha_cap` to 0 when the model loses to the rules.

## Notes

- The `sb_publishable_` key is meant to live in the client bundle; the `sb_secret_`
  key and the DB password must **never** be set as `VITE_*`.
- `.env.local` stays local (gitignored); production config lives in Vercel.
