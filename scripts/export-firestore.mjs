// Read-only export using an already authenticated Firebase CLI installation.
// Usage: node scripts/export-firestore.mjs <firebase-tools-directory> <project> <output>
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
const [cliDirectory, project, output] = process.argv.slice(2);
if (!cliDirectory || !project || !output)
  throw new Error("CLI directory, project and private output path required");
const require = createRequire(resolve(cliDirectory, "package.json"));
const auth = require("./lib/auth.js");
const account = auth.getGlobalDefaultAccount();
if (!account) throw new Error("Firebase CLI login required");
const token = await auth.getAccessToken(account.tokens.refresh_token, [
  "https://www.googleapis.com/auth/cloud-platform",
]);
const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents`;
async function request(url, body) {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok)
    throw new Error(`Firestore export failed: HTTP ${response.status}`);
  return response.json();
}
const documents = [];
async function walk(parent) {
  let next;
  do {
    const collections = await request(`${parent}:listCollectionIds`, {
      pageSize: 100,
      ...(next ? { pageToken: next } : {}),
    });
    for (const collection of collections.collectionIds ?? []) {
      let page;
      do {
        const url = new URL(`${parent}/${encodeURIComponent(collection)}`);
        url.searchParams.set("pageSize", "100");
        url.searchParams.set("showMissing", "true");
        if (page) url.searchParams.set("pageToken", page);
        const result = await request(url);
        for (const document of result.documents ?? []) {
          documents.push(document);
          await walk(`https://firestore.googleapis.com/v1/${document.name}`);
        }
        page = result.nextPageToken;
      } while (page);
    }
    next = collections.nextPageToken;
  } while (next);
}
await walk(base);
await mkdir(dirname(resolve(output)), { recursive: true });
await writeFile(
  output,
  JSON.stringify(
    { project, exportedAt: new Date().toISOString(), documents },
    null,
    2,
  ),
  { mode: 0o600 },
);
console.log(
  `Exported ${documents.length} Firestore documents (including missing ancestors).`,
);
