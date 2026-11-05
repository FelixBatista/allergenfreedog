# Implementation status — 5 November 2026

## Published staging

Web: https://dogallergycheck-staging-web.felixb-neto.workers.dev

Cloudflare account: Felix's account. Staging has its own D1 database, private R2 bucket, job/dead-letter queues and Workflow. The original domain and hosting have not been changed.

The deployed application remains on staging, with collection and Workers AI enabled and automatic publication disabled. Source configurations now prepare the production-domain cutover; they have not been deployed while DNS activation is pending. Google sign-in is configured with deployed secrets and has been exercised successfully. Administrator allowlisting never grants guest access. See DOMAIN-CUTOVER.md for registrar changes and deployment prerequisites.

## Verification

- Type checking, production build and 21 automated tests pass.
- Guest comparison was exercised in the browser, including wheat versus buckwheat, and API authorization was checked remotely.
- The D1 seed contains 113 canonical ingredient names and 37 historical products, explicitly unverified as current US formulations.
- Eleven journal pages and the legacy testing landing pages are generated as sanitized static HTML.
- A staging SQL backup was exported, copied into private R2 and restored into an isolated in-memory SQLite database: 37 products and 113 ingredients recovered.
- Initial source collection is a bounded US Open Pet Food Facts API connector; new records and photos are held for review with attribution. Manufacturer HTML/JSON-LD collection and AI extraction are also implemented, with source permissions and rate limits.
- The first successful product Workflow collected five US products and five private review photos. The scientific Workflow completed with ten article records and two pending comment drafts. No new products or comments were automatically published.
- A real message sent through Cloudflare Queues started and completed the correction/retraction Workflow (23 steps). Scientific processing and correction checks now checkpoint each article separately, with spacing and retries, to stay within provider and Worker request limits.
- Scientific collection supports PubMed metadata/abstracts, reusable-license PMC full-text excerpts, AI drafts, and Crossref/PubMed correction checks. Every scientific draft needs review.

## Deferred operational steps

On 5 November, authorized live exports were obtained from InfinityFree MySQL, Firebase Authentication and Firestore. Four verified Google identity mappings, seven dogs and twenty comparisons were imported into staging. The current MySQL catalog has forty products; three missing from the historical seed were added, with no ingredient changes to the other thirty-seven. All historical labels remain unverified. MySQL user/profile/history tables were empty; Firestore held the profiles and comparisons, including subcollections under missing ancestor documents.

The owner's Google account recovered its two dogs and all twenty comparisons in the browser; a historical comparison opened successfully. Other owners' dogs remain linked to their own Google subjects and are claimed on sign-in. Original comparison fields are retained in `result.legacySnapshot`, alongside a current-engine recomputation for UI compatibility. Old sessions are not migrated. Foreign key validation passed. Private raw exports and before-migration D1 backup are in ignored `migration-private/`; never commit them.

The production domain has not been switched. The old site can still receive new writes; take a fresh export and reconcile changes during cutover.

Recurring SQL backups and optional Browser Run require separately scoped runtime credentials; the developer's temporary Wrangler OAuth token is deliberately not installed as a long-lived application secret. The first manual backup/restore succeeded. The scheduled backup reports missing configuration until a runtime export token is added.

External AI providers are supported through AI Gateway but require their Gateway/provider credentials. The staging pilot uses a Cloudflare-hosted model; the full model qualification suite is documented and is still required before automatic publication or production promotion. An adversarial manual smoke test produced an invented ingredient; the source-verbatim validator and review requirement are therefore essential. Structured output and runtime schema validation do not establish scientific truth.

For ongoing setup and release gates see OPERATIONS.md, MIGRATION.md and AI-EVALUATION.md. Do not describe staging deployment as a completed production migration.
