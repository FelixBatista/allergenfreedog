# Live migration and rollback

The working tree was recovered from GitHub commit `6afec8c729f7242abd18e2cdd1fa298bce1291d7`. Repository content is not a live MySQL or Firestore backup.

## Data export contract

Prepare an ignored `migration-private/export.json` from authorized MySQL, Firebase Auth and Firestore exports:

```json
{
  "identities": [
    {
      "legacyId": "firebase-uid",
      "googleSubject": "verified-google-provider-subject"
    }
  ],
  "dogs": [
    { "id": "existing-dog-id", "ownerId": "firebase-uid", "name": "Milo" }
  ],
  "comparisons": [
    {
      "id": "existing-comparison-id",
      "dogId": "existing-dog-id",
      "input": { "triggering": [], "safe": [], "preferences": {} },
      "result": {},
      "engineVersion": "legacy",
      "createdAt": "2026-01-01 00:00:00"
    }
  ],
  "products": [
    {
      "id": 1,
      "name": "Recipe",
      "brand": "Maker",
      "ingredients": "rice, chicken",
      "market": "unverified"
    }
  ]
}
```

Export Google subjects from Firebase Auth's verified `providerData` Google record (`providerId=google.com`, provider `uid`), not from an email or user-entered field. Convert Firestore timestamps to UTC strings and map the original comparison fields to the current input/output shape; retain raw exports privately for audit. Account/dog linkage is by Google subject only. A user must sign in again; old Firebase sessions are not migrated. Accounts without Google provider data must remain unmapped until a separate verified recovery flow exists.

Run `npm run import:legacy -- migration-private/export.json migration-private/import.sql`, inspect the counts and import once into the migration database. The importer refuses unknown owner/dog references. It does not fetch remote private data or fabricate missing profiles.

## Release gates

### Staging rehearsal completed — 5 November 2026

Live source exports and the pre-import D1 backup are stored in ignored `migration-private/`. `scripts/export-firestore.mjs` uses the existing Firebase CLI login to recursively read collections, including descendants of missing documents. `scripts/prepare-live-migration.mjs` decodes Firestore values, maps only verified Google provider subjects, parses MySQL catalog literals without executing the dump, and validates the generated SQL against an isolated D1 backup before deployment.

Reconciled: 4 Google identities, 7 dogs, 20 comparisons, 40 catalog products and 113 canonical ingredients. Historical inputs and output fields are retained in `result.legacySnapshot`; current-engine results make the imported comparisons usable in the new UI. The owner's two dogs and twenty comparisons were verified after Google login, including opening a saved comparison. Other owners have not been signed in by the operator. This is a staging rehearsal; a final export is still required when old-site writes are frozen.

1. Count live source products, accounts, dogs and comparisons. Check duplicate IDs, malformed ingredient lists and unmapped Google identities.
2. Import into staging and reconcile counts, owner mappings and sample comparison snapshots. Existing legacy risk claims and semantic aliases are not trusted scientific evidence.
3. Test an existing Google account, multiple dogs, saved comparisons and a second user who must not see the first user's data. Test guest comparison, no AI/no evidence paths, invalid inputs, source outages and budget exhaustion.
4. Export and successfully restore a staging backup. Verify all journal/landing URLs and redirect old non-trailing-slash paths as necessary. The former Grav contact form has no mail service in this release; do not advertise it as active.
5. Freeze writes on the old application, take final exports, import remaining records and verify counts before changing domain routing. Migration time is not a promise of zero downtime.
6. Keep the old deployment and final exports for seven days. If reverting after new writes, first export new D1 records and reconcile them; blindly pointing DNS back would lose visible changes. Maintain a written cutover journal without secrets.

The initial local seed contains 113 canonical names and 37 historical products. Legacy ingredient aliases mixing different sources/forms (for example liver vs fat) are deliberately excluded. Source labels remain available but are marked unverified until recollected.
