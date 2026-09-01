# Findance — the whole system, A to Z

A working mental model of what Findance is, how a request flows through it, how the money
maths actually works, and how it is deployed and operated. Read top to bottom once; after
that use it as a map.

*Last updated: 2026-09-01.*

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
| Database tables | 120 |
| Models | 144 |
| Controllers | 180 |
| Background jobs | 43 |
| Migrations | 388 |
| Test files | 571 |
| Tests passing | 5,667 |

This is a large mature application. You are not maintaining a small app; you are maintaining
a **small delta on top of a large app**. Almost every "how do I…" question is answered by
finding how upstream already does it.

---

## 2. The stack in one paragraph

Ruby on Rails 8.1 (Ruby 3.4.9), Postgres for all persistence, Redis for the job queue and
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
                          ┌──────────────────────────┐
     you ──── HTTPS ────► │ Cloudflare (findance.app)│   proxied, TLS, DNS
                          └─────────────┬────────────┘
                                        │
                          ┌─────────────▼────────────┐
                          │   Railway — US East (VA) │
                          │  ┌─────────┐ ┌─────────┐ │  same image,
                          │  │   web   │ │ worker  │ │  different CMD
                          │  │ (Puma)  │ │(Sidekiq)│ │
                          │  └────┬────┘ └────┬────┘ │
                          └───────┼───────────┼──────┘
                                  │           │
              ┌───────────────────┴─────┬─────┴──────────────┐
              ▼                         ▼                    ▼
   ┌────────────────────┐   ┌────────────────────┐  ┌──────────────────┐
   │ Supabase Postgres  │   │ Supabase Storage   │  │ Redis Cloud      │
   │ pooler :5432       │   │ S3: findance-      │  │ queue + cache    │
   │                    │   │     uploads        │  │ + ActionCable    │
   └────────────────────┘   └────────────────────┘  └──────────────────┘
        all three in ca-central-1 (Montreal)
```

**Uploads live in object storage, not on the container.** Active Storage used to default to
`local`, meaning files were written to the container's own disk — so every deploy destroyed
them, and the worker (a *different* container) could not read them at all. Nine files were
lost that way before this was found. Storage now points at Supabase's S3-compatible endpoint,
with a **separate bucket per environment** (`findance-uploads`, `findance-uploads-staging`) so
staging can never write into — or purge from — production's files.

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
  your machine              GitHub                        Railway
  ────────────              ──────                        ───────
  B:\Projects\findance ──► findance/setup ──auto──┬──► production → findance.app
    (worktree)                                    │      Supabase + Redis Cloud + Storage
                                                  │
                                                  └──► staging    → web-staging-48fd…
                                                         own Postgres + Redis (internal)
                                                         own Storage bucket
```

Both environments track the **same branch**. Only their data and their environment variables
differ — which is the whole reason configuration can be staged but code cannot.

- Pushing to a branch **auto-deploys** it (Railway GitHub App). No manual step.
- **Migrations run automatically on boot** via `bin/docker-entrypoint` (`rails db:prepare`).
  A migration merged to `findance/setup` *will* run against production Supabase. Back up first.
- Staging's **data** is fully isolated: its own Postgres, Redis and storage bucket, so an
  experiment there can never read, write or purge anything real.
- **There is no independent staging gate for code.** Railway stores repo+branch at the
  *service* level, shared across environments. This was tested directly rather than assumed: a
  probe branch identical to production's HEAD was pointed at staging only, and **production
  followed within seconds**. So a push reaches both environments at once, and a migration
  merged to `findance/setup` runs against production Supabase at the same moment it runs
  against staging's.
  - **Environment variables *are* per-environment.** Configuration can therefore genuinely be
    staged first (that is how object storage was rolled out); code cannot.
  - Getting a real code gate needs a second service pair, or a per-environment branch setting
    if the Railway dashboard exposes one.
- The practical gate today is the Codespace: the full suite, rubocop, erb_lint and brakeman
  against a real Postgres, before anything is pushed.

---

## 5. The domain model — the part worth truly understanding

### 5.1 The tenancy root

```
Family ──┬── User (super_admin | admin | member | guest)
         │      └── Session          (expiring, revocable)
         │      └── LegalAcceptance  (which document version, accepted when)
         ├── Account
         ├── Category
         ├── Budget
         ├── Tag
         ├── ExpenseContainer
         └── provider items (Plaid, SimpleFIN, …)

LegalDocument sits outside the tenancy tree — it is instance-wide, not per family.
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

### 5.9 Sessions and legal acceptance

Two small models that gate access to everything else.

**`Session`** is a real database row, not just a cookie. It carries `user_agent`, `ip_address`,
`last_active_at` and `expires_at`, and expires on **two independent axes**: 30 minutes idle, and
7 days absolute regardless of activity (both ENV-tunable). Three details matter:

- `last_active_at` is written on nearly every request, so it is **throttled to once a minute**
  via `update_column`. Without that, every page view costs an extra write to a database in
  another city.
- Requests the *browser* makes on its own — `/cable`, `/manifest`, `/service-worker`,
  sparkline frames — deliberately do **not** count as activity. Otherwise an open tab with
  nobody at the keyboard keeps a session alive forever, which defeats the idle timeout.
- Logging in calls `reset_session`, preserving only a small whitelist of keys. That closes
  session fixation: a session id fixed before login cannot be reused after it.

Users can see every live session in Settings → Security and revoke them individually or all at
once; an hourly `SessionSweepJob` removes expired rows.

**`LegalDocument` / `LegalAcceptance`** record *which version* of terms and privacy a person
agreed to, and when. `LegalDocument.current(kind)` returns the newest document whose
`effective_at` has passed, so a new version can be staged in advance without prompting anyone
until it takes effect. Acceptance is recorded per user per document version, so when a new
version becomes effective **existing users are re-prompted**, not just new signups. Re-accepting
is idempotent — it keeps the original timestamp, because the date someone agreed must not move.

The gate is dormant while no document is published, which is how it ships ahead of the legal
text. The acceptance screen, `/privacy` and `/terms`, and signing out are never blocked by it —
otherwise a user could be trapped on a page explaining something they cannot read.

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

| Layer | Mechanism | State |
|---|---|---|
| Sessions | DB-backed, 30 min idle / 7 day absolute, explicit cookie flags, rotation on login | ✅ |
| Passwords | bcrypt | ✅ |
| Second factor | TOTP (`ROTP`), issuer = `PRODUCT_NAME` | ✅ available, **not enforced** |
| Roles | `super_admin` > `admin` > `member` > `guest` | ✅ |
| Per-account sharing | `AccountShare` → `owner` / `full_control` / `read_write` / `read_only` | ✅ intra-family only |
| API | Doorkeeper OAuth + API keys (`read` or `read_write`, one per key) | ✅ |
| Abuse | Rack::Attack throttles | ✅ default limits, not tightened |
| Secrets in transit | HTTPS only (`.app` is HSTS-preloaded — plain HTTP cannot work) | ✅ |
| Log hygiene | `filter_parameters` for params **and** `http_header_filters` for headers | ✅ |
| Uploads | Supabase Storage, private buckets, signed URLs | ✅ |
| **Secrets at rest** | **nothing is encrypted — see below** | ❌ |

### 9.1 Encryption at rest is NOT on. Read this before trusting the schema.

The models are full of `encrypts` declarations, and it is natural to conclude that provider
tokens, API keys, MFA secrets and emails are protected. **They are not.** Every one of those
columns is stored as readable plaintext in production today.

The reason is a single conditional. `Encryptable.encryption_ready?` resolves to
`ActiveRecordEncryptionConfig.explicitly_configured?`, which counts **only** environment
variables or Rails credentials — it does *not* count the self-hosted runtime fallback that
derives keys from `SECRET_KEY_BASE`. So the fallback was assigning keys while no model ever
declared `encrypts`:

```ruby
if encryption_ready?          # false in production → the whole block is skipped
  encrypts :email, deterministic: true
  encrypts :otp_secret, deterministic: true
end
```

Verified directly, not inferred: `select email from users limit 3` returns
`partner_user@example.com` — readable, not ciphertext. The boot-time warning about data being
"UNENCRYPTED at rest" was telling the literal truth all along.

**Turning it on is a migration, not a config change.** Setting the three key variables flips
`encrypts` on, and Rails immediately starts looking up users by *ciphertext* against columns
holding *plaintext*. Nothing matches, `find_by(email:)` returns nil, and every user is locked
out. This was learned the hard way: pinning the keys took production login down for ~25 minutes
before being rolled back.

The correct sequence:

1. `config.active_record.encryption.support_unencrypted_data = true` — lets Rails read the
   existing plaintext while the migration runs. **This step is mandatory and was the one missed.**
2. Set the three `ACTIVE_RECORD_ENCRYPTION_*` variables.
3. Encrypt every existing row (`rails encryption:reencrypt`-style pass over ~20 models).
4. Verify no plaintext remains, then set `support_unencrypted_data = false`.

The dangerous columns are the **deterministic** ones, because they are used for lookups:
`users.email`, `users.otp_secret`, `users.unconfirmed_email`, `ApiKey.display_key`, and every
provider credential (Akahu, Binance, Brex, Coinbase, Coinstats, EnableBanking, Snaptrade,
Sophtron, Up, Wise). A half-migrated table means the users in the un-migrated half cannot sign
in. `rails encryption:attributes` prints the full list — but only when run **with keys
exported**, since without them the models declare nothing and the task reports almost nothing.

Key rotation, once encryption is actually on, needs `previous:` keys **and**
`extend_queries = true`, or deterministic lookups stop matching rows still encrypted under the
old key. That support is already wired, gated on `ACTIVE_RECORD_ENCRYPTION_PREVIOUS_*`.

### 9.2 Other open items

- **Credentials have never been rotated** — the Supabase database password, Redis URL, Sidekiq
  dashboard password and Supabase S3 keys were all shared in plain text during setup.
- **MFA is not enforced**, including for `super_admin`.
- **Registration is open** (`ONBOARDING_STATE=open`): anyone with the URL can create an account.
  Deliberate for now — friends are testing — but it is a decision, not a default.
- **No terms or privacy text exists yet**, so the acceptance gate is dormant.

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
| `ACTIVE_STORAGE_SERVICE` | `generic_s3` in both environments; `local` means the ephemeral disk |
| `GENERIC_S3_*` | Supabase Storage endpoint, region, bucket, path-style. **Bucket differs per environment** |
| `SESSION_IDLE_TIMEOUT_MINUTES` | default 30 |
| `SESSION_ABSOLUTE_LIFETIME_DAYS` | default 7 |
| `ACTIVE_RECORD_ENCRYPTION_*` | **Do not set these until the §9.1 migration is done** — setting them alone locks every user out |

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
10. **`include A, B, C` includes in REVERSE order.** A `before_action` registered from a concern
    listed last therefore runs *first* — before `Authentication` has set `Current.user`. A gate
    written that way sees a nil user and waves every request through while looking completely
    normal in a browser. Register order-sensitive filters explicitly in `ApplicationController`,
    not from inside a concern. Only the tests caught this one.
11. **Verifying a deploy means proving the new build is live.** Polling for HTTP 200 proves
    nothing: the *old* container answers 200 perfectly well while the new one is still starting.
    A change was once declared "verified on staging" on exactly that evidence, and was in fact
    broken. Assert the deployed commit — or a value only the new build returns — *before*
    testing behaviour.
12. **`encrypts` is conditional in this codebase.** Models only declare it when keys are
    explicitly configured, so an instance without keys silently stores everything in plaintext,
    and encryption tooling run without keys exported reports almost nothing. See §9.1.
13. **Deleting a record with raw SQL bypasses Active Storage callbacks** and leaves orphaned
    blob and attachment rows pointing at files that no longer exist. Purge through the model.

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

# Back up before any migration. The server is PostgreSQL 17, and pg_dump refuses
# to dump a newer server, so the v17 client must be installed in the Codespace:
#   . /etc/os-release
#   curl -sSo /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc #     https://www.postgresql.org/media/keys/ACCC4CF8.asc
#   echo "deb [...] https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" #     > /etc/apt/sources.list.d/pgdg.list && apt-get update -qq && apt-get install -y postgresql-client-17
/usr/lib/postgresql/17/bin/pg_dump -h $DB_HOST -U $POSTGRES_USER -d $POSTGRES_DB -Fc -f backup.dump

# Audit which uploads still have a readable file, and which service holds them
bin/rails active_storage:audit

# Emergency rollback of a bad configuration change (this restored login during
# the encryption incident): delete the variables and redeploy, do not wait for a fix
railway variables delete VAR_NAME --service web
railway service redeploy --service web --yes

# Roll back a bad deploy
git revert <sha> && git push origin findance/setup
```

Backups live in `B:\Projects\findance-backups\`. **Supabase's free tier has no automatic
backups** — these manual dumps are the only copy.

Tests run in the GitHub Codespace (no local Ruby): `bin/rails test test/controllers/...`.
A fresh Codespace needs `bundle install` and `bin/rails tailwindcss:build` before the suite
will run — without the Tailwind build, every test that renders a layout fails with
"asset 'tailwind.css' was not found". Codespaces are deleted after ~30 days of inactivity;
recreate with `gh codespace create -R Mehervamsi1/sure -b <branch> -m basicLinux32gb`.

---

## 13. What Findance changed on top of Sure

| Area | Change |
|---|---|
| Brand | Token overlay, coin-edge logomark, Cormorant + Instrument Sans, full asset set in `brand/` |
| Categories | Dependent parent → child selects on the transaction form |
| Containers | New `ExpenseContainer` model, nav entry, container lens |
| Sessions | Idle + absolute expiry, cookie hardening, login rotation, active-session management, sweeper |
| Storage | Uploads moved off the ephemeral disk to Supabase Storage, one bucket per environment |
| Legal | `LegalDocument` + versioned `LegalAcceptance` with an acceptance gate (dormant until text is published) |
| Security | Header redaction so session cookies stop leaking into logs; deletion tombstone no longer retains the address |
| Reliability | Redis connection pools capped for managed-Redis client limits |
| Infra | Supabase + Redis Cloud + Railway, custom domain, all components co-located in ca-central-1 |

Everything else is upstream. **Prefer upstream's way of doing something over inventing a
parallel one** — it keeps future merges cheap.

---

## 14. Where this is going

Ordered by what blocks what, not by appetite.

**Before inviting anyone beyond friends**

1. **Encryption at rest** (§9.1) — the largest open exposure: provider tokens, API keys, MFA
   secrets and PII are all readable in the database. Needs a rehearsed four-step migration and a
   maintenance window, not a config change.
2. **Rotate credentials** — database password, Redis URL, Sidekiq password, Supabase S3 keys.
3. **Harden auth** — enforce MFA for admins, tighten Rack::Attack on login and the API, alert on
   failed-login spikes.
4. **Legal text** — the mechanism is live and dormant; publishing a `LegalDocument` activates it.

**Then, product**

5. **Portfolio** — the model layer already exists (`Security` → `SecurityPrice` → `Trade` →
   `Holding`). Needs a licensed price provider, delayed-quote labelling, corporate actions,
   market calendars, and local-vs-home-currency return shown separately.
6. **Capture** — write-only scoped API keys plus iOS Shortcuts, using the existing
   `(account_id, source, external_id)` unique index for idempotency; and **ShotCapture**, UPI
   screenshot ingestion reusing the `PdfImport` pipeline.
7. **Financial state classification** — daily feature vector, deterministic rules (not ML, because
   the reasoning must be explainable and contestable), guidance whose numbers are computed rather
   than generated.
8. **Share** — split a payment across people, track claims and settlements without ever writing
   into another family's ledger. Touches the tenancy model, so it goes last.
