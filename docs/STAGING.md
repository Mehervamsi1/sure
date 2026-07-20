# Findance deployment pipeline

- **staging** — branch `findance/staging` → Railway *staging* environment
  (web + worker + own Postgres + own Redis). URL: web-staging-48fd.up.railway.app
- **production** — branch `findance/setup` → Railway *production* environment
  → Supabase Postgres + Redis Cloud. URL: findance-personal.up.railway.app

Flow: commit to `findance/staging` → auto-deploy staging → verify → fast-forward
`findance/setup` (`git push origin findance/staging:findance/setup`) → auto-deploy production.

Never commit directly to `findance/setup` without going through staging first.
