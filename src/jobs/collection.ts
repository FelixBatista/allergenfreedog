import * as cheerio from "cheerio";
import robotsParser from "robots-parser";
import { z } from "zod";
import type { Env } from "../server/env";
import { generate } from "./ai";
export type Source = {
  id: string;
  name: string;
  kind: string;
  url: string;
  allowed_host: string;
  permission_basis: string;
  image_permission: string;
  min_interval_seconds: number;
  connector?: string;
};
const agent = "DogAllergyCheckBot";
export function assertSourceUrl(raw: string, source: Source) {
  const url = new URL(raw);
  if (
    url.protocol !== "https:" ||
    url.hostname !== source.allowed_host ||
    url.port ||
    url.username ||
    url.password ||
    !/[a-z]\.[a-z]{2,}$/i.test(url.hostname) ||
    /\.(local|internal|localhost)$/i.test(url.hostname)
  )
    throw new Error("URL is outside the approved source");
  return url;
}
export async function fetchSource(
  url: string,
  source: Source,
  env: Env,
  robots = true,
) {
  assertSourceUrl(url, source);
  if (!source.permission_basis)
    throw new Error("Source permission must be recorded");
  if (robots) {
    const robotsUrl = new URL("/robots.txt", url).href;
    const response = await fetch(robotsUrl, {
      redirect: "manual",
      headers: { "User-Agent": agent },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok && response.status !== 404)
      throw new Error("Cannot verify robots policy");
    if (response.ok) {
      const rules = robotsParser(
        robotsUrl,
        (await response.text()).slice(0, 100000),
      );
      if (rules.isAllowed(url, agent) === false)
        throw new Error("Source disallows crawling");
    }
  }
  // Atomic per-source lease prevents concurrent workers from overrunning the source rate limit.
  const lease = await env.DB.prepare(
    "UPDATE sources SET last_fetch_at=CURRENT_TIMESTAMP WHERE id=? AND (last_fetch_at IS NULL OR last_fetch_at<=datetime('now',?))",
  )
    .bind(source.id, `-${Math.max(10, source.min_interval_seconds)} seconds`)
    .run();
  if (!lease.meta.changes) throw new Error("Source rate limit; retry later");
  const response = await fetch(url, {
    redirect: "manual",
    headers: {
      "User-Agent": agent,
      Accept: "text/html,application/json,application/xml",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > 2000000) throw new Error("Source exceeds size limit");
  if (!response.body) throw new Error("Empty response");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let body = "",
    bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 2000000) {
      await reader.cancel();
      throw new Error("Source exceeds size limit");
    }
    body += decoder.decode(value, { stream: true });
  }
  body += decoder.decode();
  return body;
}
export const extractedProduct = z.object({
  name: z.string().min(2).max(250),
  brand: z.string().max(150),
  variant: z.string().max(200).default(""),
  ingredients: z.string().min(5).max(20000),
  imageUrl: z.string().url().nullable().default(null),
  confidence: z.number().min(0).max(1),
});
function findProducts(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(findProducts);
  if (!value || typeof value !== "object") return [];
  const v = value as Record<string, unknown>,
    types = Array.isArray(v["@type"]) ? v["@type"] : [v["@type"]];
  return [
    ...(types.includes("Product") ? [v] : []),
    ...Object.entries(v)
      .filter(([key]) => key !== "@context")
      .flatMap(([, val]) => (typeof val === "object" ? findProducts(val) : [])),
  ];
}
export async function extractProduct(html: string, env: Env) {
  const $ = cheerio.load(html);
  const candidates = [] as Record<string, unknown>[];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      candidates.push(...findProducts(JSON.parse($(el).text())));
    } catch {
      /* Invalid source JSON is not executable. */
    }
  });
  $("script,style,nav,footer,header").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 30000);
  const product = candidates.length === 1 ? candidates[0] : undefined;
  if (product && typeof product.ingredients === "string") {
    const brand =
      typeof product.brand === "object" && product.brand
        ? String((product.brand as { name?: string }).name ?? "")
        : String(product.brand ?? "");
    return {
      data: extractedProduct.parse({
        name: product.name,
        brand,
        ingredients: product.ingredients,
        imageUrl: typeof product.image === "string" ? product.image : null,
        confidence: 1,
      }),
      text,
      method: "jsonld",
    };
  }
  const data = await generate(
    env,
    "Extract exactly one dog food variant. Copy its ingredient list VERBATIM from the page, preserving percentages and parentheses. Return {name,brand,variant,ingredients,imageUrl:null,confidence:number}. If no complete ingredient list or multiple variants, use confidence 0. Never infer ingredients from product marketing.",
    { text, structured: candidates },
    extractedProduct,
  );
  return { data, text, method: "ai" };
}
export function validateExtraction(
  data: z.infer<typeof extractedProduct>,
  text: string,
) {
  const norm = (s: string) =>
    s.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
  const reasons = [] as string[];
  if (data.confidence < 0.98)
    reasons.push("Extraction confidence below publication threshold");
  if (!norm(text).includes(norm(data.ingredients)))
    reasons.push("Ingredient list cannot be verified verbatim in source");
  if (!norm(text).includes(norm(data.name)))
    reasons.push("Product identity not present in source");
  if (!data.brand) reasons.push("Brand missing");
  return reasons;
}
export function discoveryLinks(html: string, source: Source) {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $("a[href]").each((_, el) => {
    try {
      const url = new URL($(el).attr("href")!, source.url);
      assertSourceUrl(url.href, source);
      if (/\/products?\//.test(url.pathname)) {
        url.hash = "";
        url.search = "";
        urls.add(url.href);
      }
    } catch {}
  });
  return [...urls].slice(0, 100);
}
