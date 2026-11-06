# dogallergycheck.com production cutover

## Completed — 6 November 2026

- Registrar: STRATO (registry registrar Cronon GmbH).
- Authoritative DNS: Cloudflare zone `dogallergycheck.com` (Free plan), active in Felix's account.
- STRATO delegates to `rajeev.ns.cloudflare.com` and `saanvi.ns.cloudflare.com`.
- Apex and `www` are attached as Cloudflare Worker custom domains. Cloudflare manages their DNS records and certificates.
- Web Worker: `dogallergycheck-staging-web`, serving production at `https://dogallergycheck.com`.
- Scheduled worker: `dogallergycheck-staging-jobs`; collectors remain enabled, AI is disabled by owner request, and auto-publishing is limited to unchanged existing products with exact-validated structured labels. New/changed products and scientific comments remain review-gated.
- The existing apex and `www` A records to InfinityFree (`185.27.134.215`) and the InfinityFree `_acme-challenge` CNAME were removed. Cloudflare now routes apex and `www` to the Worker. The InfinityFree hosting account/files remain available for rollback, but the domain no longer points to that web host.
- Preserved the existing MX, CAA and wildcard parking records. The wildcard `*.dogallergycheck.com` still points to Bodis; this is unrelated to the apex/www application routes. Do not remove MX until the domain's email use is known.
- Added DNS TXT validation records requested by Cloudflare for Google Trust Services certificates. Confirm certificate status in Cloudflare if troubleshooting TLS.
- No registration transfer, paid plan or subscription was made.

## Production verification

- `https://dogallergycheck.com/api/v1/health` returns HTTP 200 and engine version 2.0.0.
- HTTP and `www` requests return a permanent redirect to the HTTPS apex, preserving path and query string.
- The legacy URL `/dog-allergy-tests.html?i=1` serves the migrated page after Cloudflare's `.html` canonical redirect.
- `/blog/` and the allergy-testing guide return the migrated static content.
- Google sign-in succeeded on the production hostname; the owner's two dogs and twenty saved comparisons appeared.
- The D1 SQL export passed SQLite integrity/foreign-key checks: 40 products, 113 ingredients, 7 dogs, 20 comparisons.
- Fresh Firebase Auth and Firestore exports on 6 November matched the earlier pre-cutover snapshots: 4 Google identities and 31 Firestore documents, including the same 7 dogs and 20 comparisons. The InfinityFree catalog export is from 5 November; catalog reconciliation found 40 products and no additions or changes against D1.
- `npm run deploy` completed for both web and scheduled workers. Type checking, build and 22 automated tests passed as part of the deployment command.

## Rollback and remaining operations

- Keep the old InfinityFree hosting, Firebase project and private exports for at least seven days. The site no longer writes to those services through the public domain. Before a rollback after new production writes, export D1 and reconcile those changes; do not simply point DNS at the old app.
- Google OAuth production origin and callback are configured. Existing staging OAuth entries and Worker credentials were retained.
- D1's own seven-day point-in-time recovery on the Free plan and the verified SQL export are available. Scheduled copy-to-R2 backups are disabled by owner preference; no backup token is configured.
- The Worker and its D1/bucket/queue resources retain `staging` in their names, but the verified resources now serve the production hostname. Renaming or separating these requires a planned data/resource migration.
- Keep automatic publication disabled. Complete the model qualification and human review process before increasing AI autonomy or publishing generated claims.
