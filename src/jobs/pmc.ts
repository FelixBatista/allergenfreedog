import { XMLParser } from "fast-xml-parser";
import type { Env } from "../server/env";
export function reusableLicense(license: string) {
  return /^(CC BY|CC BY-SA|CC0|PUBLIC DOMAIN)(?:\s+[\d.]+)?$/i.test(
    license.trim(),
  );
}
export async function fullText(pmcId: string, env: Env) {
  if (!/^PMC\d+$/.test(pmcId)) return null;
  const permission = await fetch(
    `https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi?id=${pmcId}`,
    { signal: AbortSignal.timeout(20000) },
  );
  if (!permission.ok) return null;
  const record = new XMLParser({ ignoreAttributes: false }).parse(
    await permission.text(),
  ).OA?.records?.record;
  const license = String(record?.["@_license"] ?? "");
  if (!reusableLicense(license)) return null;
  const response = await fetch(
    `https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/${pmcId}/unicode`,
    { signal: AbortSignal.timeout(30000) },
  );
  if (!response.ok) return null;
  const payload = await response.text();
  if (payload.length > 2000000)
    throw new Error("Scientific text exceeds pilot size limit");
  const collections = JSON.parse(payload);
  const list = Array.isArray(collections) ? collections : [collections];
  const passages = list
    .flatMap((c: any) => c.documents ?? [])
    .flatMap((d: any) => d.passages ?? [])
    .map((p: any) => String(p.text ?? ""))
    .filter(Boolean);
  if (!passages.length) return null;
  const key = `science/pmc/${pmcId}.json`;
  await env.FILES.put(key, payload, {
    httpMetadata: { contentType: "application/json" },
    customMetadata: {
      license,
      source: `https://pmc.ncbi.nlm.nih.gov/articles/${pmcId}/`,
    },
  });
  return { key, license, text: passages.join("\n").slice(0, 22000) };
}
