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

The service is containerized ([ml/Dockerfile](ml/Dockerfile)).

```bash
cd ml
fly launch --no-deploy          # creates fly.toml (pick a name/region)
fly deploy
# train + persist a model, or mount one; until then /predict serves the fallback
```

Then set `VITE_ML_URL=https://<app>.fly.dev` in Vercel and redeploy. The nightly
`evaluate.py` gate runs as a scheduled job (Fly Machines / cron) against exported
outcomes.

## Notes

- The `sb_publishable_` key is meant to live in the client bundle; the `sb_secret_`
  key and the DB password must **never** be set as `VITE_*`.
- `.env.local` stays local (gitignored); production config lives in Vercel.
