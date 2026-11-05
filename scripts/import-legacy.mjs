import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
const input = process.argv[2],
  out = process.argv[3] ?? "migration-private/import.sql";
if (!input) {
  console.error(
    "Usage: npm run import:legacy -- migration-private/export.json migration-private/import.sql",
  );
  process.exit(1);
}
const d = JSON.parse(await readFile(input, "utf8")),
  sql = ["PRAGMA foreign_keys=ON;"],
  q = (v) =>
    v === null || v === undefined
      ? "NULL"
      : "'" +
        String(typeof v === "object" ? JSON.stringify(v) : v).replaceAll(
          "'",
          "''",
        ) +
        "'";
function insert(table, values) {
  sql.push(
    `INSERT INTO ${table}(${Object.keys(values).join(",")}) VALUES(${Object.values(values).map(q).join(",")});`,
  );
}
const seen = new Set();
for (const identity of d.identities ?? []) {
  if (!identity.legacyId || !identity.googleSubject)
    throw new Error(
      "Verified Google subjects are required for legacy account migration",
    );
  if (seen.has(identity.legacyId)) throw new Error("Duplicate legacy owner");
  seen.add(identity.legacyId);
  insert("legacy_identities", {
    legacy_id: identity.legacyId,
    google_subject: identity.googleSubject,
  });
}
for (const dog of d.dogs ?? []) {
  if (!seen.has(dog.ownerId) || !dog.id || !dog.name)
    throw new Error("Dog has missing identity mapping");
  insert("dogs", {
    id: dog.id,
    legacy_owner: dog.ownerId,
    name: dog.name,
    breed: dog.breed,
    age: dog.age,
    weight: dog.weight,
  });
}
for (const comparison of d.comparisons ?? []) {
  if (!(d.dogs ?? []).some((x) => x.id === comparison.dogId))
    throw new Error("Comparison refers to unknown dog");
  insert("comparisons", {
    id: comparison.id,
    dog_id: comparison.dogId,
    input: comparison.input,
    result: comparison.result,
    engine_version: comparison.engineVersion ?? "legacy",
    ...(comparison.createdAt ? { created_at: comparison.createdAt } : {}),
  });
}
for (const product of d.products ?? []) {
  if (!product.id || !product.name || !product.ingredients)
    throw new Error("Incomplete product");
  insert("products", {
    id: `mysql-${product.id}`,
    legacy_id: `mysql-${product.id}`,
    name: product.name,
    brand: product.brand ?? "",
    ingredients: product.ingredients,
    market: product.market ?? "unverified",
  });
  insert("product_versions", {
    product_id: `mysql-${product.id}`,
    version: 1,
    snapshot: product,
  });
}
await mkdir(dirname(resolve(out)), { recursive: true });
await writeFile(out, sql.join("\n") + "\n", { mode: 0o600 });
console.log(
  `Prepared private SQL for ${d.identities?.length ?? 0} owners, ${d.dogs?.length ?? 0} dogs, ${d.comparisons?.length ?? 0} comparisons and ${d.products?.length ?? 0} products. Import once into an empty migration target; do not commit this file.`,
);
