# Findance: a personal finance tracker

Findance is a self-hosted personal-finance tracker — accounts, transactions, budgets, investments, and net-worth tracking, all under your own control on your own database.

> [!IMPORTANT]
> **Attribution & licensing.** Findance is a fork of [Sure](https://github.com/we-promise/sure), the community-maintained continuation of the archived [Maybe Finance](https://github.com/maybe-finance/maybe) project. It is licensed under the [AGPLv3](LICENSE), the same license as the projects it builds on.
>
> Findance is **not affiliated with, or endorsed by, Maybe Finance Inc. or the Sure project**. "Maybe" is a trademark of Maybe Finance Inc.; no Maybe branding is used in this fork.
>
> Under the AGPLv3, if this application is made available to users over a network, those users are entitled to the complete corresponding source code, including any modifications.

## Understanding the system

**New here, or coming back after a while? Read
[docs/FINDANCE_MENTAL_MODEL.md](docs/FINDANCE_MENTAL_MODEL.md).** It explains the whole
application end to end: the domain model (families, accounts, entries, balances), the sign
convention that all the money maths depends on, how the sync engine and Turbo interact,
the deployment topology, and the gotchas that have already cost real debugging time.

## Backstory

The [Maybe Finance](https://github.com/maybe-finance/maybe) (archived/abandoned repo) team spent most of 2021–2022 building a full-featured personal finance and wealth management app. It even included an “Ask an Advisor” feature that connected users with a real CFP/CFA — all included with your subscription.

The business end of things didn't work out, and so they stopped developing the app in mid-2023.

After spending nearly $1 million on development (employees, contractors, data providers, infra, etc.), the team open-sourced the app. Their goal was to let users self-host it for free — and eventually launch a hosted version for a small fee.

They actually did launch that hosted version … briefly.

That also didn’t work out — at least not as a sustainable B2C business — so now here we are: hosting a community-maintained fork to keep the codebase alive and see where this can go next.

Join us!

## Hosting Findance

Findance is a fully working personal finance app that can be [self hosted with Docker](docs/hosting/docker.md).

## What Findance adds on top of Sure

Findance is intentionally a **thin layer** over upstream Sure, so upstream changes stay cheap
to merge:

| Area | Change |
|---|---|
| Brand | Token overlay (`findance-tokens.css`), coin-edge logomark, Cormorant Garamond + Instrument Sans, full asset set in [`brand/`](brand/) |
| Categories | Dependent Parent → Subcategory selects on the transaction form |
| Containers | `ExpenseContainer` — group spend for one effort (a trip, a renovation) across categories |
| Security | Session cookies and auth headers redacted from logs |
| Reliability | Redis connection pools sized for managed-Redis client limits |

Everything else is upstream. When adding a feature, prefer upstream's existing pattern over
inventing a parallel one.

## Forking and Attribution

Findance is a fork of [Sure](https://github.com/we-promise/sure), the community continuation
of the archived Maybe Finance repo. You are free to fork it under the AGPLv3.

To stay compliant and avoid trademark issues:

- Keep the [AGPLv3 license](LICENSE) and state clearly that your fork is based on Maybe
  Finance / Sure but is **not affiliated with or endorsed by** either.
- "Maybe" is a trademark of Maybe Finance Inc. — its name and logo must not be used in forks.
- AGPLv3 is a *network* licence: if you run this where other people can reach it, they are
  entitled to the complete corresponding source, including your changes.

## Local Development Setup

**If you are trying to _self-host_ the app, [read this guide to get started](docs/hosting/docker.md).**

The instructions below are for developers to get started with contributing to the app.

### Requirements

- See `.ruby-version` file for required Ruby version
- PostgreSQL >9.3 (latest stable version recommended)
- Redis > 5.4 (latest stable version recommended)

### Getting Started
```sh
cd findance
cp .env.local.example .env.local
bin/setup
bin/dev

# Optionally, load demo data
rake demo_data:default
```

Visit http://localhost:3000 to view the app.

If you loaded the optional demo data, log in with these credentials:

- Email: `user@example.com`
- Password: `Password1!`

For further instructions, see guides below.

### Setup Guides

- [Mac dev setup](https://github.com/we-promise/sure/wiki/Mac-Dev-Setup-Guide)
- [Linux dev setup](https://github.com/we-promise/sure/wiki/Linux-Dev-Setup-Guide)
- [Windows dev setup](https://github.com/we-promise/sure/wiki/Windows-Dev-Setup-Guide)
- Dev containers - visit [this guide](https://code.visualstudio.com/docs/devcontainers/containers)

### One-click Install

[![Run on PikaPods](https://www.pikapods.com/static/run-button.svg)](https://www.pikapods.com/pods?run=sure)

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/sure?referralCode=CW_fPQ)

### Managed OpenClaw for Sure Finances

<a href="https://kilocode.pxf.io/repo-readme"><img src="https://kilo.ai/kiloclaw/partner-resources/kiloclaw-logo-yellow-bg-typography.png" alt="Managed OpenClaw for Sure Finances" width="185"/></a>


## License and Trademarks

Maybe and Sure are both distributed under
an [AGPLv3 license](https://github.com/we-promise/sure/blob/main/LICENSE).
- "Maybe" is a trademark of Maybe Finance, Inc.
- "Sure" is not, and refers to this community fork.

![Alt](https://repobeats.axiom.co/api/embed/3a9753cff07501fba8a6749d0ebd567ff63848c8.svg "Repobeats analytics image")

<p align="center">
  <a href="https://gittensor.io/miners/repository?name=we-promise%2Fsure">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/we-promise/sure/gittensor-impact-assets/gittensor-impact-dark.svg">
      <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/we-promise/sure/gittensor-impact-assets/gittensor-impact-light.svg">
      <img src="https://raw.githubusercontent.com/we-promise/sure/gittensor-impact-assets/gittensor-impact-light.svg" alt="Gittensor contributor impact for Sure repo" width="600">
    </picture>
  </a>
</p>
