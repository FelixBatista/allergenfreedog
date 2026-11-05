import { readFile } from "node:fs/promises";
import { parse } from "jsonc-parser";
for (const file of ["wrangler.jsonc", "wrangler.jobs.jsonc"]) {
  const config = parse(await readFile(file, "utf8"));
  if (config.d1_databases[0].database_id.includes("REPLACE"))
    throw new Error(
      `Configure the real D1 database ID in ${file} before deploying.`,
    );
  if (!config.vars.APP_URL.startsWith("https://"))
    throw new Error(`Set a production HTTPS APP_URL in ${file}.`);
  if (!config.vars.ADMIN_EMAILS)
    throw new Error(`Configure the administrator allowlist in ${file}.`);
  if (
    config.vars.AGENTS_ENABLED === "true" &&
    config.vars.AI_ENABLED === "true" &&
    !config.vars.AI_MODEL
  )
    throw new Error(
      "Set a tested AI model and cost reservation before enabling AI.",
    );
}
console.log(
  "Deployment configuration validated. Confirm secrets, migration counts and backups using docs/OPERATIONS.md.",
);
