# Dog Allergy Check — Cloudflare application

The new application lives at the repository root. The original PHP/Grav source remains in `dogallergycheck.com/htdocs` for migration and rollback; it is **not** uploaded by the new build.

## Local development

Requires Node 24 and npm. Run `npm ci`, `npm run prepare:content`, `npm run db:local`, `npm run seed:local`, then `npm run dev`. Guest ingredient comparisons work without Google or AI credentials. Copy `.dev.vars.example` to `.dev.vars` to enable integrations locally. Never commit secrets or private exports.

On this Windows machine, npm's existing global `os` setting was `linux`. Use `npm ci --os=win32 --cpu=x64 --include=optional` here to install the correct native build tools without changing global settings. CI uses its normal Linux defaults.

`npm run check` runs type checking, comparison/security/ingestion tests, and the production build. `npm run build` migrates the static journal and landing pages before bundling. `npm run preview` uses the built Wrangler deployment configuration after a build.

## What is implemented

- React interface: multiple problem/tolerated foods, brand filters, comparison table, unknown ingredients, candidate food checks, dog profiles, versioned saved comparisons, reviewed evidence and admin review queues.
- Versioned Hono API with input validation, ownership checks, Google sign-in through Better Auth, secure response headers and restricted file serving.
- D1 schema, a seed of 113 ingredient names and 37 legacy catalog entries, legacy data import tooling and static migration of the Grav journal.
- Scheduled Queues/Workflows ingestion, source access/rate checks, JSON-LD and AI extraction, change detection, proposals, image collection, scientific draft generation, retraction checks, budget reservations and backup workflow.
- AI Gateway integration with configurable provider/model; comparison itself is deterministic and independent of AI availability.

See [implementation status](docs/IMPLEMENTATION-STATUS.md), [operations](docs/OPERATIONS.md), [migration](docs/MIGRATION.md) and [AI evaluations](docs/AI-EVALUATION.md) for deployment, launch requirements and limitations. Staging resources are provisioned and deployed. Google OAuth and the staging import of live data were verified on 5 November 2026: 4 identity mappings, 7 dogs, 20 comparisons and 40 catalog products. Private exports are excluded from Git. Model qualification, automated backup credentials, final data reconciliation and production cutover remain operational steps.
