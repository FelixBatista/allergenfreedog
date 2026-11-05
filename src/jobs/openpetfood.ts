import type { Env } from "../server/env";
import type { Source } from "./collection";
import { uid } from "../server/data";
import { downloadImage } from "./images";
// Keep the licensed upstream dataset separately exportable; do not silently erase attribution.
export async function collectOpenPetFood(env: Env, source: Source) {
  const url = new URL(source.url);
  url.searchParams.set("sort_by", "last_modified_t");
  if (
    url.hostname !== "world.openpetfoodfacts.org" ||
    url.protocol !== "https:"
  )
    throw new Error("Unexpected Open Pet Food Facts endpoint");
  const response = await fetch(url, {
    headers: {
      "User-Agent": "DogAllergyCheck/1.0 (https://dogallergycheck.com)",
    },
    redirect: "manual",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Open Pet Food Facts ${response.status}`);
  const content = await response.text();
  if (content.length > 2000000)
    throw new Error("Catalog response exceeds limit");
  const data = JSON.parse(content);
  const products = Array.isArray(data.products)
    ? data.products
    : data.product
      ? [data.product]
      : [];
  for (const p of products.slice(0, 100)) {
    const count = await env.DB.prepare(
      "SELECT COUNT(*) n FROM source_datasets",
    ).first<{ n: number }>();
    const present = await env.DB.prepare(
      "SELECT record_id FROM source_datasets WHERE source_id=? AND record_id=?",
    )
      .bind(source.id, String(p.code))
      .first();
    if (!present && (count?.n ?? 0) >= 100) break;
    if (
      !/^[0-9]{8,14}$/.test(String(p.code)) ||
      !p.product_name ||
      !p.ingredients_text ||
      !p.countries_tags?.includes("en:united-states") ||
      !p.categories_tags?.some(
        (c: string) =>
          c === "en:dog-food" ||
          c === "en:dry-dog-food" ||
          c === "en:wet-dog-food",
      )
    )
      continue;
    const raw = JSON.stringify(p),
      attribution = `Open Pet Food Facts contributors; https://world.openpetfoodfacts.org/product/${p.code}`;
    const old = await env.DB.prepare(
      "SELECT payload FROM source_datasets WHERE source_id=? AND record_id=?",
    )
      .bind(source.id, p.code)
      .first<{ payload: string }>();
    if (old?.payload === raw) continue;
    await env.DB.prepare(
      "INSERT INTO source_datasets(source_id,record_id,payload,attribution,license) VALUES(?,?,?,?,?) ON CONFLICT(source_id,record_id) DO UPDATE SET payload=excluded.payload,updated_at=CURRENT_TIMESTAMP",
    )
      .bind(
        source.id,
        p.code,
        raw,
        attribution,
        "ODbL-1.0; individual contents DbCL-1.0",
      )
      .run();
    const sourceUrl = `https://world.openpetfoodfacts.org/product/${p.code}`;
    const existing = await env.DB.prepare(
      "SELECT id FROM products WHERE source_id=? AND source_url=?",
    )
      .bind(source.id, sourceUrl)
      .first<{ id: string }>();
    const proposalId = uid();
    let imageKey: string | null = null;
    if (p.image_front_url && source.image_permission) {
      try {
        imageKey = await downloadImage(
          env,
          p.image_front_url,
          source,
          `review-images/${proposalId}`,
        );
      } catch {
        await env.DB.prepare(
          "INSERT INTO alerts(id,level,message) VALUES(?,?,?)",
        )
          .bind(
            uid(),
            "warning",
            `Image for source record ${p.code} requires manual collection`,
          )
          .run();
      }
    }
    await env.DB.prepare(
      "INSERT INTO proposals(id,kind,product_id,payload,reasons) VALUES(?,?,?,?,?)",
    )
      .bind(
        proposalId,
        "product",
        existing?.id ?? null,
        JSON.stringify({
          name: p.product_name,
          brand: p.brands ?? "",
          variant: p.quantity ?? "",
          ingredients: p.ingredients_text,
          sourceId: source.id,
          sourceUrl,
          imageUrl: p.image_front_url ?? null,
          imageKey,
          method: "openpetfoodfacts",
          attribution,
          license: "ODbL-1.0",
        }),
        JSON.stringify([
          "Community catalog label requires verification against current US package",
          "Image license and attribution must be checked before reuse",
        ]),
      )
      .run();
  }
  await env.DB.prepare(
    "UPDATE sources SET last_fetch_at=CURRENT_TIMESTAMP,last_error=NULL WHERE id=?",
  )
    .bind(source.id)
    .run();
}
