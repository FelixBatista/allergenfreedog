# Cloudflare operations

## Resources and deployment

1. Authenticate using `npx wrangler login`. Use the account that owns the destination domain.
2. Create separate staging/production D1 databases, R2 buckets, job queues and dead-letter queues. Commands: `npx wrangler d1 create dogallergycheck`, `npx wrangler r2 bucket create dogallergycheck-files`, `npx wrangler queues create dogallergycheck-jobs`, `npx wrangler queues create dogallergycheck-failed`. Put the returned IDs in **both** Wrangler files. Use suffixed names for staging. Never share live data/bindings with previews.
3. Set matching `account_id`, `APP_URL` and `ADMIN_EMAILS` in both configurations. Before first publish use the web Worker's `workers.dev` hostname. Only add the real custom domain at final cutover.
4. Apply `npx wrangler d1 migrations apply DB --remote`, then import the seed using `npx wrangler d1 execute DB --remote --file database/seed.sql`. The seed consists of old sample labels, **not verified current US formulations**. Prefer the live catalog import for production. Do not seed after importing a live catalog unless intentional duplicates are acceptable.
5. Set secrets with `npx wrangler secret put NAME` and `--config wrangler.jobs.jsonc` where applicable. Google OAuth requires its client credentials plus `BETTER_AUTH_SECRET` on web. Register the callback `https://APP_HOST/api/auth/callback/google`. All admin addresses must be allowlisted. Refreshing Wrangler login does not configure Google OAuth for visitors.
6. Run `npm run check`, both `wrangler deploy --dry-run` commands, then `npm run deploy`. Verify `/api/v1/health`, guest comparison, Google sign-in and administrator access. The web deployment uses Vite's generated configuration under `dist`; the original public assets config is input to the build.

## Agents and AI

The checked-in staging configuration has `AGENTS_ENABLED=true`, `AI_ENABLED=true` and `AUTO_PUBLISH=false`. It collects public evidence and proposes drafts without automatically publishing new products or scientific conclusions. Keep agents/AI off when preparing an unverified production environment, then activate the reviewed pilot configuration deliberately.

Use the administrator source form to record the source URL, permitted hostname, basis for access and separate image reuse permission. URLs must be HTTPS. Product discovery recognizes same-host `/product/` and `/products/` links; other catalogs need a connector before onboarding. Refresh tasks inspect existing source-linked products. A catalog listing can be collected manually through the source form's Collect button. The pilot is bounded to three sources and up to 100 newly discovered US variants per discovery run; existing legacy rows do not imply US availability.

The staging pilot uses the Workers AI binding and `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, with JSON Schema output plus runtime validation. It needs no copied developer token. Model output remains untrusted and scientific drafts remain pending. A one-off adversarial test invented an ingredient; source-verbatim verification blocks that class of extraction from publication. Complete the model qualification suite before promoting it to production.

External model configuration: `AI_ACCOUNT_ID`, `AI_GATEWAY_ID`, `AI_MODEL` (provider-prefixed), secret `AI_GATEWAY_TOKEN`, and either Gateway BYOK configuration or secret `AI_PROVIDER_KEY`. Choose a model supporting Chat Completions and verify structured JSON output. Secrets for background extraction belong on jobs; secrets for interactive explanations belong on web. Provider payload logging is disabled in requests; Workers AI requests use `collectLog=false` when a Gateway is configured. The application does not send owner identity or dog names to AI, and omits unrecognized free-text rows from explanations. Signed-in explanations are limited to five per user per UTC day.

`AI_MAX_CALL_USD` is a conservative per-call reservation, **not measured billing**. Calibrate it against the chosen model's maximum input/output cost, including retries. Calls limit output to 1,800 tokens and input to 30,000 characters. Usage reservations are atomically checked against $20 AI and $30 total variable cost defaults, with $20 reserved for infrastructure. Reservations are not refunded after errors. Provider/Cloudflare bills can still differ; 70/90% alerts are visible in the admin panel, not outbound notifications. Configure provider-side limits where available. A $50 target is not a guaranteed billing ceiling.

Optional browser extraction: set `BROWSER_ENABLED=true`, `CF_ACCOUNT_ID`, `CF_BROWSER_TOKEN` with Browser Run permission on jobs. Use it only for approved sources whose policies allow browser retrieval; each call reserves $0.05 estimated cost. Browser fallback uses the same permitted source URL. Sources requiring arbitrary navigation/authentication or restrictive access are unsupported.

UTC schedules: daily refresh 06:00; Monday discovery 07:00; Tuesday PubMed discovery 07:00; Wednesday corrections/retractions 07:00; daily backup 03:00. Queue consumer concurrency is 1 with three delivery retries and a dead-letter queue. Each message starts a stable-ID Workflow, which handles its own step retries. Queue acceptance is not a completed job. Failed workflows appear in the panel; re-run via the source Collect action or the Cloudflare Workflow dashboard, inspecting idempotency before replay.

New products, AI extractions and material label changes require review. Only unchanged, fully verified structured labels may auto-publish. New scientific meaning always requires a qualified human reviewer. Source snapshots and product versions are retained; ingestion does not rewrite saved comparison results.

## Backups and incidents

Set `CF_ACCOUNT_ID`, `CF_DATABASE_ID`, secret `CF_BACKUP_TOKEN` with D1 export rights on jobs. The backup workflow requests a D1 SQL export, polls for completion and writes it into private R2 `backups/YYYY-MM-DD.sql`; retention is 30 days. Source pages, research XML and backups are never served by the public media endpoint. Product images are served only if a published product references the object and permission is recorded.

Restore test: download a backup into an ignored `migration-private/` directory using Wrangler R2, import it into a **new disposable D1 database**, compare table counts/ownership/version snapshots, then point an isolated staging deployment at it. Never test restores against production. Record the date and result. Use D1 Time Travel for additional recovery when available.

Investigate errors with Workers Observability and the admin jobs/alerts table. Pause agents with `AGENTS_ENABLED=false` and redeploy jobs; disable explanation requests with `AI_ENABLED=false` on web. Existing comparison continues working. A Cloudflare-wide outage affects both the application and its monitoring; this concentration is an accepted tradeoff of the requested architecture.

## Boundaries to validate before launch

This implementation does not claim automatic source licensing, veterinary review, arbitrary retailer scraping or completed AI model qualification. PubMed abstracts are ingested with provenance. When a PMC ID exists, the connector checks the official OA service license and fetches BioC text only for supported reusable licenses (CC BY, CC BY-SA, CC0 and public domain). Only an explicitly marked excerpt is passed to the model; full review is not implied. Crossref and PubMed check known corrections; this does not guarantee discovery of every correction.

The built-in US Open Pet Food Facts connector queries recently modified dog-food records, keeps the upstream dataset separately exportable at `/api/v1/datasets/openpetfoodfacts-us`, preserves ODbL/DbCL attribution and retains image permissions. It stages images privately for review, with CC BY-SA attribution. It caps retained source records at 100; expand only after reviewing quality and licensing. Missing or non-US labels are excluded. New records are not silently published or merged with historical seed products.

# Current spending policy — 5 November 2026

The owner wants to test using free allowances only, with a maximum desired total account budget of US$20 per billing month across all projects combined. This supersedes the earlier $50/month planning target; it does not authorize upgrades or paid services. Do not upgrade plans, enable paid-only models, purchase AI credits or configure paid external AI providers without a new explicit decision from the owner. Workers Free was confirmed active in the authenticated billing dashboard on 5 November.

Account-wide usage budget email alerts were configured at US$10 and US$20 on 5 November. These are informational alerts, not spending caps. Cloudflare documents that alerts do not pause usage, can arrive after usage has accrued, and exclude recurring subscription fees. No account-wide hard cap or guarantee of a maximum US$20 invoice has been established. Do not present the configured alerts, per-project quotas or internal cost reservations as that guarantee.

The existing `MONTHLY_BUDGET_USD` and `AI_MONTHLY_USD` values are conservative application reservation thresholds from the earlier plan, not payments, Cloudflare account spending caps, or proof of charges. Free-plan enforcement is supplied by Cloudflare for Workers/D1/Workers AI/Queues/Workflows. R2 has a metered subscription with a free monthly allowance and can charge overages independently of Workers Free. Keep collection small and review R2 storage and operation usage; the app currently has no account-wide R2 hard spending cap. Optional Browser Run and external AI credentials remain unconfigured. Domain renewal is separate from application hosting.
