# Implementation status — 6 November 2026

## Production

Website: https://dogallergycheck.com

Cloudflare is the authoritative DNS host. The production Worker serves the apex and `www` custom domains, and the scheduled jobs Worker is deployed. The original InfinityFree A records and its ACME challenge record have been removed, so the public domain no longer routes to InfinityFree. The old account and files are retained temporarily for rollback.

The production hostname uses the previously verified Cloudflare D1, private R2 bucket, job/dead-letter queues and Workflow. Their resource names still contain `staging`; they were promoted in place to preserve the tested data and authentication secrets. Google sign-in was exercised on the production domain, and the owner's two dogs and twenty saved comparisons loaded. The owner asked to pause AI until product work is complete, so `AI_ENABLED=false` is deployed. Scheduled collectors remain active. `AUTO_PUBLISH=true` only allows unchanged, already-listed products whose structured source label passes exact-text checks; new/changed labels and scientific comments remain review-gated.

## Verification

- Production health endpoint returns HTTP 200 with comparison engine version 2.0.0.
- HTTP and `www` canonicalize to HTTPS apex while preserving legacy paths and query parameters.
- The legacy testing page, allergy guide and journal serve from Cloudflare static assets.
- Fresh Firebase Auth and Firestore exports on 6 November matched the verified pre-cutover snapshots: four Google identities, seven dogs and twenty comparisons. All 31 Firestore documents, including missing ancestors, were retained.
- The last InfinityFree MySQL export (5 November) had 40 products and 113 canonical ingredients. Reconciliation found no product additions or changes before cutover. All historical labels remain explicitly unverified as current formulations.
- The live D1 backup passed SQLite integrity/foreign-key validation and contains 40 products, 113 ingredients, seven dogs and twenty comparisons.
- Web and scheduled Workers both deployed. The deploy command passed type checking, 22 automated tests, production build and configuration preflight.
- Google OAuth production origin and callback are configured; staging OAuth entries were kept.
- The application exposes a bounded US Open Pet Food Facts connector, permitted manufacturer HTML/JSON-LD collection, review-only photo proposals, PubMed metadata/abstract collection, reusable-license PMC excerpts, AI-assisted drafts and correction/retraction checks. Scheduled collection is enabled; products and scientific comments remain review-gated.

## Operations still to complete

- Keep the old hosting, Firebase and private exports for seven days. Public-domain traffic no longer reaches the old site. Reconcile any new D1 data before a rollback.
- D1 point-in-time recovery and the verified SQL export are available. Scheduled SQL exports to private R2 still require a separately scoped Cloudflare API token; none is installed as a long-lived Worker secret.
- Full model qualification remains outstanding. AI is disabled. Complete qualification before re-enabling AI or increasing publication autonomy.
- Scheduled SQL backups to R2 are disabled by owner preference. D1 Time Travel on Workers Free retains seven days, and a verified cutover export is kept locally in the ignored private directory.
- The wildcard `*.dogallergycheck.com` parking record still points to Bodis, and the existing MX record was preserved. These are not used for the apex/www application. Confirm mail use before changing MX.

For runbooks, see `DOMAIN-CUTOVER.md`, `OPERATIONS.md`, `MIGRATION.md` and `AI-EVALUATION.md`.
