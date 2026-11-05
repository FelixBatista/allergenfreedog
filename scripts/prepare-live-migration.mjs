import { readFile, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { compare, ENGINE_VERSION } from "../src/shared/comparison.ts";
const [authFile, firestoreFile, mysqlFile, baselineFile, output] =
  process.argv.slice(2);
if (!output)
  throw new Error(
    "Expected auth, firestore, MySQL, D1 baseline and private SQL output paths",
  );
const users = JSON.parse(await readFile(authFile, "utf8")).users;
const documents = JSON.parse(await readFile(firestoreFile, "utf8")).documents;
const mysql = await readFile(mysqlFile, "utf8");
const db = new DatabaseSync(":memory:");
db.exec(await readFile(baselineFile, "utf8"));
const statements = [];
const quote = (v) =>
  v == null
    ? "NULL"
    : "'" +
      String(typeof v === "object" ? JSON.stringify(v) : v).replaceAll(
        "'",
        "''",
      ) +
      "'";
function insert(table, row) {
  statements.push(
    `INSERT OR IGNORE INTO ${table}(${Object.keys(row)}) VALUES(${Object.values(row).map(quote)});`,
  );
}
function decode(v) {
  if (v.mapValue)
    return Object.fromEntries(
      Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, decode(x)]),
    );
  if (v.arrayValue) return (v.arrayValue.values ?? []).map(decode);
  if ("nullValue" in v) return null;
  if ("integerValue" in v || "doubleValue" in v)
    return Number(v.integerValue ?? v.doubleValue);
  return v.stringValue ?? v.timestampValue ?? v.booleanValue;
}
const owners = new Set();
for (const user of users) {
  const provider = user.providerUserInfo?.find(
    (p) => p.providerId === "google.com",
  );
  if (!provider?.rawId) throw new Error("Unmapped Firebase identity");
  owners.add(user.localId);
  insert("legacy_identities", {
    legacy_id: user.localId,
    google_subject: provider.rawId,
  });
  const existing = db
    .prepare("SELECT google_subject FROM legacy_identities WHERE legacy_id=?")
    .get(user.localId);
  if (existing && existing.google_subject !== provider.rawId)
    throw new Error("Identity collision");
}
const master = db
  .prepare("SELECT * FROM ingredients")
  .all()
  .map((x) => ({
    ...x,
    aliases: JSON.parse(x.aliases),
    tags: JSON.parse(x.tags),
  }));
let dogs = 0,
  comparisons = 0;
for (const doc of documents) {
  const path = doc.name.split("/documents/")[1].split("/");
  const data = Object.fromEntries(
    Object.entries(doc.fields ?? {}).map(([k, v]) => [k, decode(v)]),
  );
  if (path.length === 2 && !doc.fields) continue; // Missing ancestors still contain subcollections.
  if (path[0] !== "users" || !owners.has(path[1]))
    throw new Error("Unexpected owner/path");
  const dogId = `firestore:${path.slice(0, 4).join("/")}`;
  if (path.length === 4 && path[2] === "dogs") {
    if (!data.name) throw new Error("Dog name missing");
    insert("dogs", {
      id: dogId,
      legacy_owner: path[1],
      name: data.name,
      created_at: data.createdAt,
    });
    dogs++;
  } else if (path.length === 6 && path[4] === "comparisons") {
    const food = (x) => {
      if (
        typeof x.label !== "string" ||
        !Array.isArray(x.list) ||
        !x.list.every((i) => typeof i === "string")
      )
        throw new Error("Unknown legacy food shape");
      return {
        name: x.label.replace(/^(Triggering|Safe):\s*/, ""),
        ingredients: x.list.join(", "),
      };
    };
    const input = {
      triggering: data.triggering.map(food),
      safe: data.safe.map(food),
      preferences: {},
    };
    // Recompute for current UI; retain every original field alongside the new result.
    const result = {
      ...compare(input.triggering, input.safe, master),
      legacySnapshot: data,
      migration: { originalEngine: "legacy", recomputedWith: ENGINE_VERSION },
    };
    insert("comparisons", {
      id: `firestore:${path.join("/")}`,
      dog_id: dogId,
      input,
      result,
      engine_version: `${ENGINE_VERSION}-migrated`,
      created_at: data.timestamp,
    });
    comparisons++;
  } else throw new Error("Unhandled Firestore document shape");
}
// Lex only literal VALUES from the catalog dump. Never execute MySQL commands.
const match = mysql.match(/INSERT INTO `food_catalog` \(([^)]+)\) VALUES\s*/);
if (!match) throw new Error("Catalog INSERT missing");
const columns = [...match[1].matchAll(/`([^`]+)`/g)].map((x) => x[1]);
let pos = match.index + match[0].length;
const rows = [];
const skip = () => {
  while (/\s/.test(mysql[pos] ?? "") && pos < mysql.length) pos++;
};
while (true) {
  skip();
  if (mysql[pos] !== "(") throw new Error("Expected tuple");
  pos++;
  const values = [];
  while (true) {
    skip();
    let value = "";
    if (mysql[pos] === "'") {
      pos++;
      let closed = false;
      while (pos < mysql.length) {
        const ch = mysql[pos++];
        if (ch === "\\") {
          const next = mysql[pos++];
          value += { n: "\n", r: "\r", t: "\t", 0: "\0" }[next] ?? next;
        } else if (ch === "'") {
          if (mysql[pos] === "'") {
            pos++;
            value += "'";
          } else {
            closed = true;
            break;
          }
        } else value += ch;
      }
      if (!closed) throw new Error("Unclosed SQL literal");
    } else {
      while (pos < mysql.length && ![",", ")"].includes(mysql[pos]))
        value += mysql[pos++];
      value = value.trim() === "NULL" ? null : Number(value.trim());
    }
    values.push(value);
    skip();
    const delim = mysql[pos++];
    if (delim === ")") break;
    if (delim !== ",") throw new Error("Unexpected tuple delimiter");
  }
  if (values.length !== columns.length)
    throw new Error("Catalog column mismatch");
  rows.push(Object.fromEntries(columns.map((c, i) => [c, values[i]])));
  skip();
  const delim = mysql[pos++];
  if (delim === ";") break;
  if (delim !== ",") throw new Error("Unexpected row delimiter");
}
let added = 0,
  updated = 0;
for (const product of rows) {
  if (!product.name || !product.ingredients)
    throw new Error("Incomplete live product");
  const matches = db
    .prepare("SELECT * FROM products WHERE name=? AND brand=?")
    .all(product.name, product.brand ?? "");
  if (matches.length > 1) throw new Error("Ambiguous catalog mapping");
  const old = matches[0];
  const id = old?.id ?? `mysql-${product.id}`;
  if (!old) {
    insert("products", {
      id,
      legacy_id: `mysql-${product.id}`,
      name: product.name,
      brand: product.brand ?? "",
      ingredients: product.ingredients,
      market: "unverified",
    });
    insert("product_versions", {
      product_id: id,
      version: 1,
      snapshot: { ...product, origin: "live-mysql", labelVerified: false },
    });
    added++;
  } else if (old.ingredients !== product.ingredients) {
    const version = old.version + 1;
    statements.push(
      `UPDATE products SET ingredients=${quote(product.ingredients)},version=${version},updated_at=CURRENT_TIMESTAMP WHERE id=${quote(id)} AND version=${old.version};`,
    );
    insert("product_versions", {
      product_id: id,
      version,
      snapshot: { ...product, origin: "live-mysql", labelVerified: false },
    });
    updated++;
  }
}
// Run the exact plan against an isolated copy before writing deployable SQL.
db.exec("PRAGMA foreign_keys=ON; BEGIN;");
for (const statement of statements) db.exec(statement);
if (db.prepare("PRAGMA foreign_key_check").all().length)
  throw new Error("Foreign key validation failed");
if (db.prepare("PRAGMA integrity_check").get().integrity_check !== "ok")
  throw new Error("Integrity check failed");
const counts = {
  owners: users.length,
  dogs,
  comparisons,
  sourceProducts: rows.length,
  productsAdded: added,
  productsUpdated: updated,
};
await writeFile(output, statements.join("\n") + "\n", { mode: 0o600 });
await writeFile(output + ".report.json", JSON.stringify(counts, null, 2));
console.log(JSON.stringify(counts));
db.close();
