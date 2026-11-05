# dogallergycheck.com cutover

## Prepared 5 November 2026

- Registrar: STRATO (registry registrar Cronon GmbH).
- Cloudflare account: `5197cbc92b5db4a7abfaf76c38c6d0c5`.
- Cloudflare DNS zone `86f5d39074c82a3c716a5edfbed56cba` created on the Free plan; activation awaits registrar propagation.
- Assigned authoritative servers: `rajeev.ns.cloudflare.com`, `saanvi.ns.cloudflare.com`.
- Existing apex and www A records: `185.27.134.215` (InfinityFree). Keep these DNS-only until the Worker cutover is ready.
- Imported 25 DNS records: 2 A, 2 CNAME, 20 CAA, 1 MX. Certificate validation `_acme-challenge` and legacy wildcard parking CNAME remain DNS-only. Existing CAA and MX records were preserved.
- Existing public delegation includes `ns1.byet.org` through `ns5.byet.org` and `ns1.infinityfree.com`, `ns2.infinityfree.com`. Preserve this list for rollback; registrar must delegate only to the two assigned Cloudflare servers.
- No DNSSEC DS record was returned by the public resolver during preparation. Verify registrar DNSSEC status before nameserver replacement; do not remove an existing DS without handling the DNSSEC transition.
- Google OAuth client was saved with the additional origin `https://dogallergycheck.com` and redirect `https://dogallergycheck.com/api/auth/callback/google`; existing staging entries were retained.
- No domain registration transfer, paid plan, or new billing subscription was requested or enabled.

## Registrar change saved — 5 November 2026

STRATO confirmed that the two assigned Cloudflare nameservers were saved and sent to the registry. The old nameservers in slots 3 and 4 were cleared. The registry RDAP response still showed `ns1.byet.org` through `ns4.byet.org` during the final check, and Cloudflare still reported `pending`; this is propagation, not a completed application cutover.

The production Worker configuration and canonical-host redirect are prepared in source but **have not been deployed** while the zone is pending. The existing deployed staging application remains available. `npm run check` passed (22 tests, type checking and build), and the production deploy dry-run passed. Both apex and www custom domains are declared in `wrangler.jsonc`, with the application URL set to the apex. The resource names still contain `staging`; this plan promotes the validated deployment without copying private authentication secrets or duplicating the database.

Fresh Firebase exports contained the same 4 identities, 7 dogs and 20 comparisons; all 31 Firestore documents (including missing ancestors) matched the previous export after key-order normalization. The D1 pre-cutover backup was restored and checked successfully (40 products, 113 ingredients, 7 dogs, 20 comparisons). Old-source writes are not yet frozen; repeat reconciliation at actual cutover. Private exports and backups remain ignored under `migration-private/`.

## Remaining steps

1. Wait for the saved STRATO nameserver change to reach the registry and confirm Cloudflare Active status. Do not resubmit the same change repeatedly.
2. Follow MIGRATION.md release gates: freeze old writes, take final exports and pre-cutover D1 backup, reconcile source counts and new records without replacing staging users' new records.
3. Attach apex and www as Worker custom domains. Preserve MX and other non-web records. Set the canonical application/auth URL to `https://dogallergycheck.com` and redirect alternate web hostnames to it. Reconcile these settings in source configuration before deployment.
4. Verify DNS, certificate issuance, HTTP-to-HTTPS/canonical redirects, API health, comparison, Google login, dog/history ownership and legacy content URLs. Do not call nameserver delegation alone a completed application cutover.
5. Retain old hosting and exports for at least seven days. If rolling back after new D1 writes, first export and reconcile those writes as documented in MIGRATION.md.
