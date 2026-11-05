import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
const file = process.argv[2];
if (!file)
  throw new Error("Usage: node scripts/verify-backup.mjs work/backup.sql");
const db = new DatabaseSync(":memory:");
db.exec(await readFile(file, "utf8"));
const tables = [
  "ingredients",
  "products",
  "product_versions",
  "sources",
  "dogs",
  "comparisons",
];
const counts = Object.fromEntries(
  tables.map((table) => [
    table,
    db.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n,
  ]),
);
const integrity = db.prepare("PRAGMA integrity_check").get();
const foreignKeys = db.prepare("PRAGMA foreign_key_check").all();
if (integrity.integrity_check !== "ok" || foreignKeys.length)
  throw new Error("Restored backup failed integrity checks");
console.log(JSON.stringify({ integrity: "ok", counts }));
