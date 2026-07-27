# Findance — the whole system, A to Z

A working mental model of what Findance is, how a request flows through it, how the money
maths actually works, and how it is deployed and operated. Read top to bottom once; after
that use it as a map.

*Last updated: 2026-07-27.*

---

## 1. What this actually is

Findance is a **self-hosted personal finance tracker**: accounts, transactions, budgets,
investments, and net worth, running on infrastructure you own.

It is a fork of [Sure](https://github.com/we-promise/sure), which is itself the community
continuation of the abandoned Maybe Finance app. That lineage matters in three practical ways:

1. **It is AGPLv3.** Because the app is reachable over a network, anyone who uses it is
   entitled to the complete source, including your modifications. Keeping the fork public is
   what keeps you compliant.
2. **Upstream is alive and fast-moving.** Sure merges dozens of PRs a week. Findance is a
   *thin layer* on top: brand tokens, the container feature, security fixes. Everything else
   is upstream code that should be pulled in periodically rather than diverged from.
3. **No Maybe branding may appear anywhere user-facing.** "Maybe" is their trademark.

Scale of the thing you are working with:

| | |
|---|---|
| Database tables | 119 |
| Models | 142 |
| Controllers | 178 |
| Background jobs | 42 |
| Migrations | 386 |
| Test files | 566 |

This is a large mature application. You are not maintaining a small app; you are maintaining
a **small delta on top of a large app**. Almost every "how do I…" question is answered by
finding how upstream already does it.

---

## 2. The stack in one paragraph

Ruby on Rails 7.2 (Ruby 3.4), Postgres for all persistence, Redis for the job queue and
caching, Sidekiq for background work, and **Hotwire** (Turbo + Stimulus) for the front end —
meaning the server renders HTML and the browser swaps fragments of it, rather than a
JavaScript app calling a JSON API. Tailwind provides styling through a design-token layer.
ViewComponent provides reusable UI pieces (`DS::*`). There is *also* a JSON API (Doorkeeper
OAuth + API keys) used by the mobile app, but the web UI does not go through it.

**The single most useful thing to internalise:** when you click something and the page
updates without a reload, that is Turbo fetching server-rendered HTML — not client-side
state. If a UI bug looks like "my selection disappeared", suspect a Turbo re-render
replacing DOM nodes. (That is exactly what broke statement uploads; see §11.)

---

## 3. Runtime topology — where the code physically runs

```
                        ┌─────────────────────────┐
   you ──── HTTPS ────► │ Cloudflare (findance.app)│  proxied, TLS, DNS
                        └────────────┬─────────────┘
                                     │
                        ┌────────────▼─────────────┐
                        │  Railway — US East (VA)   │
                        │  ┌─────────┐ ┌──────────┐ │
                        │  │  web    │ │  worker  │ │  same image, different CMD
                        │  │ (Puma)  │ │ (Sidekiq)│ │
                        │  └────┬────┘ └────┬─────┘ │
                        └───────┼───────────┼───────┘
                                │           │
              ┌─────────────────┘           └──────────────┐
              ▼                                            ▼
   ┌──────────────────────┐                    ┌────────────────────────┐
   │ Supabase Postgres    │                    │ Redis Cloud            │
   │ Montreal ca-central-1│                    │ ca-central-1           │
   │ (session pooler:5432)│                    │ queue + cache + cable  │
   └──────────────────────┘                    └────────────────────────┘
```

Two services run **the same Docker image**; the only difference is the start command
(`rails server` vs `bundle exec sidekiq`, via `Dockerfile` and `Dockerfile.worker`).

**Why the geography matters.** Every DB query and Redis call is a network round trip. When the
app ran in San Francisco while the data sat in Montreal, each trip cost ~70 ms, dozens of
times per page. Moving the app to Virginia cut page p50 from 946 ms to 586 ms. If you ever
add a data store, **put it in ca-central-1** or you reintroduce the problem.

Postgres is reached through Supabase's **session pooler**, not the direct host: the direct
host is IPv6-only and unreachable from Railway. Use the *session* pooler (5432), never the
transaction pooler (6543) — Rails uses prepared statements, which transaction pooling breaks.

---

## 4. Environments and how code reaches production

```
  your machine                GitHub                     Railway
  ────────────                ──────                     ───────
  B:\Projects\findance ──push──► findance/setup ──auto──► production  → findance.app
    (worktree)                                            Supabase + Redis Cloud

  B:\Projects\findance-staging ─► findance/staging ─────► staging     → web-staging-48fd…
                                                          own Postgres + Redis (internal)
```

- Pushing to a branch **auto-deploys** it (Railway GitHub App). No manual step.
- **Migrations run automatically on boot** via `bin/docker-entrypoint` (`rails db:prepare`).
  A migration merged to `findance/setup` *will* run against production Supabase. Back up first.
- Staging is fully isolated: its own Postgres and Redis inside Railway, so experiments can
  never touch real data.
- **Caveat:** Railway stores repo+branch at the *service* level, shared across environments.
  Pointing one environment at a branch has moved the other before. Verify with
  `railway status` after changing sources.

---

## 5. The domain model — the part worth truly understanding

### 5.1 The tenancy root

```
Family ──┬── User (super_admin | admin | member | guest)
         ├── Account
         ├── Category
         ├── Budget
         ├── Tag
         ├── ExpenseContainer
         └── provider items (Plaid, SimpleFIN, …)
```

**`Family` is the tenant.** Almost every query starts from `Current.family`. If you write a
query that doesn't, you have probably written a data leak. `Current` is a per-request
container holding `family`, `user`, `session`.

Roles matter: **the first user of an instance becomes `super_admin`** and only that role sees
Settings → SSO Providers / Users / Debug.

### 5.2 Accounts are polymorphic

An `Account` holds identity (name, currency, balance) and delegates its *type* to an
"accountable":

```
Account ──► Depository | CreditCard | Loan | Investment | Crypto
            Property | Vehicle | OtherAsset | OtherLiability
```

Assets and liabilities are distinguished by the accountable class, which is how net worth
gets signed correctly.

### 5.3 Entries are the money ledger — and this is the key abstraction

**Every movement of money is an `Entry`.** An Entry has a date, an amount, a currency, an
account — and delegates its meaning to an "entryable":

```
Entry ──► Transaction   (spending / income)
      ──► Trade         (buy / sell a security)
      ──► Valuation     (a manual "the balance is now X" marker)
```

So a `Transaction` **does not** hold its own amount or date — its `Entry` does. This trips
everyone up once. `transaction.entry.amount`, not `transaction.amount`.

**Sign convention — memorise this:**

> **Outflows are positive. Inflows are negative.**

A $40 grocery purchase is `+40`. A $3,000 salary deposit is `-3000`. It reads backwards until
you realise the ledger is written from the perspective of "what did this cost me". Every
total in the app depends on it, and misreading it produces confident, wrong answers (I did
exactly that once — see §11).

### 5.4 What counts as "spending"

Not every outflow is spend. Moving money between your own accounts is not spending; neither
is paying your credit card bill. The canonical filter is:

```ruby
Transaction::BUDGET_EXCLUDED_KINDS = %w[funds_movement one_time cc_payment]
```

…plus `entries.excluded = false` for anything the user manually excluded. Budgets, the income
statement, and expense containers all apply this. **If you write a new total, apply it too.**

### 5.5 Categorisation

```
Category (family-scoped, self-referential parent_id — one level deep)
   ├── Transaction.category_id
   ├── Budget → BudgetCategory → Category
   └── Rule → auto-assign on import/sync
```

Findance added **dependent parent → child selects**: the parent list is roots only, the child
list is narrowed client-side from an embedded map. A parent alone is a valid category; the
child is always optional.

### 5.6 Expense containers — Findance's own feature

A **container** groups spend that belongs to one *effort* (a trip, a renovation) across
categories:

```
ExpenseContainer ──has_many──► Transaction  (transactions.expense_container_id)
```

- **One container per transaction**, so totals can never double-count. A payment shared
  between two efforts is handled by *splitting* it and filing each child separately.
- Transactions still appear in the normal list — the container is an **additional lens**, not
  a filter that hides them.
- Deleting a container **unfiles** its transactions (`dependent: :nullify`); it never deletes
  money records.
- Totals respect the spending rules in §5.4.

### 5.7 Balances are derived, not stored by you

`balances` is a **daily time series per account**, and it is *computed*, not hand-written:

```
Entries (+ Valuations as anchors)
        │
        ▼
Balance::ForwardCalculator   (manual accounts: walk forward from opening balance)
Balance::ReverseCalculator   (linked accounts: walk backward from provider's current balance)
        │
        ▼
Balance::Materializer ──► balances rows ──► charts, net worth, account pages
```

This is why editing an old transaction changes today's chart, and why every write enqueues a
sync (§6). If a balance looks wrong, the fix is almost never to edit `balances` — it is to fix
the entry or valuation the calculator reads from.

### 5.8 Investments

```
Security (ticker + exchange MIC) ──► SecurityPrice (daily)
Trade (entryable) ──► Holding (computed position per account/date)
```

Prices come from pluggable providers (Yahoo Finance is the free default; Twelve Data, Tiingo,
EODHD and others are available). Gold is **not** modelled yet — that is Phase 3.

---

## 6. The sync engine — why things happen "later"

Almost every write enqueues a **`Sync`**. A sync is a tracked, resumable unit of work:

```
you save a transaction
        └─► entry.sync_account_later
                └─► Sync row (pending) ─► SyncJob on Sidekiq
                        ├── import market data
                        ├── materialize balances  (§5.7)
                        ├── apply provider overrides
                        └── broadcast_sync_complete ──► Turbo refresh to your browser
```

Two consequences you will feel:

1. **Numbers settle a moment after you save.** That is the worker, not a bug.
2. **Completed syncs push a page refresh to connected browsers.** Genuinely useful, but it
   replaces DOM nodes — which is how a file input can lose its selection mid-upload (§11).

Recurring work is cron-driven via `sidekiq-cron` and `config/schedule.yml` (daily market data
after US close, hourly stale-sync cleanup, security health checks, etc.).

---

## 7. Request lifecycle, end to end

```
Browser
  │  GET /transactions
  ▼
Cloudflare (TLS, proxy)
  ▼
Railway edge ─► Puma (US East)
  ▼
Rack middleware ─ Rack::Attack throttles ─ session cookie ─ Current.set
  ▼
ApplicationController  → authenticate, set Current.family/user
  ▼
TransactionsController#index
  → Transaction::Search builds a scoped query (family-scoped, permission-filtered)
  → pagy paginates
  ▼
ERB views + ViewComponents (DS::*) render HTML
  ▼
Turbo swaps frames / streams into the page
```

For a write, add: strong params → model validations → save → `sync_account_later` → Turbo
Stream response updating just the affected fragments.

---

## 8. The design layer

Two layers, deliberately separated so upstream merges stay cheap:

```
sure-design-system/_generated.css   ← UPSTREAM, generated. NEVER EDIT.
findance-tokens.css                 ← ours, imported AFTER, overrides the tokens
```

The brand (from `brand/`, with a full asset set and construction sheet):

| Token | Value |
|---|---|
| Alabaster (light surface) | `#FBF9F5` |
| Obsidian (dark surface / text) | `#0B0B0C` |
| Onyx (dark cards) | `#141416` |
| Champagne (dark accents) | `#CBB68C` |
| Foil (light accents) | `#8A7A52` |
| Display type | Cormorant Garamond |
| UI type | Instrument Sans |

Rules: gold is an *edge*, never a fill, ≤5% of any screen. Entrance easing
`cubic-bezier(0.16, 1, 0.3, 1)`; it arrives, it never bounces. The coin-edge "f" logomark is a
theme-aware inline SVG partial (`shared/_logomark`), not an image file.

**Fonts are served by Propshaft**, which resolves CSS `url()` as *asset logical paths* — so
`url('./findance/Foo.ttf')`, never `../fonts/…`. Getting this wrong silently falls back to
system fonts.

---

## 9. Security model

| Layer | Mechanism |
|---|---|
| Sessions | Signed cookie (`_sure_session`), `Current.session` |
| Passwords | bcrypt |
| Second factor | TOTP (`ROTP`), issuer = `PRODUCT_NAME` |
| Roles | `super_admin` > `admin` > `member` > `guest` |
| Per-account sharing | `AccountShare` → `owner` / `full_control` / `read_write` / `read_only` |
| API | Doorkeeper OAuth + scoped API keys |
| Abuse | Rack::Attack throttles |
| Secrets at rest | ActiveRecord encryption on provider tokens |
| Secrets in transit | HTTPS only (`.app` is HSTS-preloaded — plain HTTP cannot work) |
| Log hygiene | `filter_parameters` for params **and** `http_header_filters` for headers |

**Known open items (Phase 3):** `ACTIVE_RECORD_ENCRYPTION_*` keys are derived from
`SECRET_KEY_BASE` rather than set explicitly — meaning `SECRET_KEY_BASE` cannot be rotated
without orphaning encrypted data. Credentials shared during setup have not been rotated.
Statement files sit on the container's **ephemeral disk**, so they are lost on redeploy and
unreadable by the worker.

---

## 10. Configuration that actually matters

| Variable | Why it matters |
|---|---|
| `SELF_HOSTED=true` | Unlocks self-hosting behaviour; also makes preview features default on |
| `SECRET_KEY_BASE` | Signs sessions **and** derives encryption keys — do not change casually |
| `DB_HOST/PORT/POSTGRES_*` | Discrete vars; `database.yml` has no `DATABASE_URL` support |
| `PGSSLMODE=require` | Managed Postgres needs TLS; there is no `sslmode` key in `database.yml` |
| `REDIS_URL` | Queue + cache + ActionCable |
| `APP_DOMAIN` | Used to build links in emails and jobs — set on **web *and* worker** |
| `PRODUCT_NAME` | Product name everywhere, including the 2FA entry in authenticator apps |
| `ONBOARDING_STATE` | `open` = anyone can register; `invite_only` closes it |

Connection budget is finite (managed Redis caps clients): Sidekiq internal pool, Sidekiq
capacity (= concurrency), Rails cache pool and ActionCable all hold connections, and a rolling
deploy briefly doubles every count. Tunable via `SIDEKIQ_REDIS_POOL`, `SIDEKIQ_CONCURRENCY`,
`RAILS_MAX_THREADS`, `DB_POOL`.

---

## 11. Hard-won gotchas

Each of these cost real debugging time. They are the map's "here be dragons".

1. **Turbo refreshes destroy DOM state.** A completed sync broadcasts a page refresh; if it
   lands while a file dialog is open, the `<input type=file>` is recreated and the selection
   is silently dropped, posting an empty list. Fix: submit on selection, or mark the node
   `data-turbo-permanent`.
2. **`DS::Select` is not a `<select>`.** It is a hidden input + button + `div[role=option]`
   driven by Stimulus, emitting `dropdown:select`. Never write code expecting `<option>`.
3. **Per-form CSRF tokens.** Scraping any token on the page and posting it elsewhere yields
   422. Take the token from *the form you are submitting*.
4. **Sign convention.** Negative means money *in*. A container holding only deposits correctly
   shows negative spend — that is not a bug.
5. **Duplicate uploads are silently rejected** by content hash. Testing with byte-identical
   files looks like a broken feature.
6. **Railway branch config is per service, not per environment.**
7. **A new feature needs a nav entry.** Routes + controller + views can all be perfect and the
   feature still invisible. (Containers shipped this way once; there is now a test for it.)
8. **`railway service scale REGION=1` adds a region** rather than moving — set the old one to
   `0` in the same command or you pay for two replicas.
9. **Log timestamps in Railway can read stale** while the lines are current. Read by sequence,
   not by date.

---

## 12. Operational runbook

```bash
# Watch production
railway service link web && railway logs -d $(railway service status --service web --json | jq -r .deploymentId)

# Deploy: just push
git push origin findance/setup       # production
git push origin findance/staging     # staging

# Promote staging → production
git push origin findance/staging:findance/setup

# Back up before any migration (pg_dump 17 client, from the Codespace)
pg_dump -h $DB_HOST -U $POSTGRES_USER -d $POSTGRES_DB -Fc -f backup.dump

# Roll back a bad deploy
git revert <sha> && git push origin findance/setup
```

Backups live in `B:\Projects\findance-backups\`. **Supabase's free tier has no automatic
backups** — these manual dumps are the only copy.

Tests run in the GitHub Codespace (no local Ruby):
`bin/rails test test/controllers/...`. The container image runs Ruby 3.4.7 while the branch
pins 3.4.9, so `.ruby-version` is patched *locally only* there; `git stash` wipes that patch
and every `bin/rails` call then fails with `Bundler::RubyVersionMismatch`.

---

## 13. What Findance changed on top of Sure

| Area | Change |
|---|---|
| Brand | Token overlay, coin-edge logomark, Cormorant + Instrument Sans, full asset set in `brand/` |
| Categories | Dependent parent → child selects on the transaction form |
| Containers | New `ExpenseContainer` model, nav entry, container lens |
| Security | Header redaction so session cookies stop leaking into logs |
| Reliability | Redis connection pools capped for managed-Redis client limits |
| Infra | Supabase + Redis Cloud + Railway, staging pipeline, custom domain |

Everything else is upstream. **Prefer upstream's way of doing something over inventing a
parallel one** — it keeps future merges cheap.

---

## 14. Where this is going (Phase 3)

- Group budgeting: invite friends, split expenses, track who owes whom
- Email notifications (signup, login, OTP) with user-controlled preferences
- Public landing page
- Gold (physical, by weight, at spot) and richer stock portfolios
- Remaining security work: pin encryption keys, rotate credentials, harden auth, move
  statement files to object storage
- Legal: terms and conditions, privacy policy — required before real public signups
