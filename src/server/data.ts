import type { Env } from "./env";
import type { Ingredient } from "../shared/comparison";
export async function ingredients(env: Env): Promise<Ingredient[]> {
  const { results } = await env.DB.prepare(
    "SELECT * FROM ingredients ORDER BY name",
  ).all<{ id: string; name: string; aliases: string; tags: string }>();
  return results.map((i) => ({
    ...i,
    aliases: JSON.parse(i.aliases),
    tags: JSON.parse(i.tags),
  }));
}
export const uid = () => crypto.randomUUID();
export async function audit(
  env: Env,
  actor: string,
  action: string,
  target: string,
) {
  await env.DB.prepare(
    "INSERT INTO audit(id,actor,action,target) VALUES(?,?,?,?)",
  )
    .bind(uid(), actor, action, target)
    .run();
}
export async function approveProposal(env: Env, id: string, actor: string) {
  const p = await env.DB.prepare(
    "SELECT * FROM proposals WHERE id=? AND status='pending'",
  )
    .bind(id)
    .first<{
      id: string;
      kind: string;
      product_id: string | null;
      payload: string;
    }>();
  if (!p) throw new Error("Proposal unavailable");
  const data = JSON.parse(p.payload);
  if (p.kind === "product") {
    const productId = p.product_id ?? uid();
    // A claim on the proposal and its writes are one atomic D1 batch.
    const guard =
      "EXISTS(SELECT 1 FROM proposals WHERE id=? AND status='pending')";
    const changes = await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO products(id,name,brand,variant,market,ingredients,source_id,source_url,verified_at) SELECT ?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP WHERE ${guard} ON CONFLICT(id) DO UPDATE SET name=excluded.name,brand=excluded.brand,variant=excluded.variant,ingredients=excluded.ingredients,version=products.version+1,source_url=excluded.source_url,verified_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP`,
      ).bind(
        productId,
        data.name,
        data.brand,
        data.variant ?? "",
        "US",
        data.ingredients,
        data.sourceId,
        data.sourceUrl,
        id,
      ),
      env.DB.prepare(
        `INSERT INTO product_versions(product_id,version,snapshot) SELECT id,version,json_object('id',id,'name',name,'brand',brand,'ingredients',ingredients,'source_url',source_url) FROM products WHERE id=? AND ${guard}`,
      ).bind(productId, id),
      env.DB.prepare(
        "UPDATE proposals SET status='approved',reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'",
      ).bind(actor, id),
    ]);
    if (!changes.at(-1)?.meta.changes)
      throw new Error("Proposal already processed");
    if (data.imageUrl) {
      const source = await env.DB.prepare(
        "SELECT image_permission FROM sources WHERE id=?",
      )
        .bind(data.sourceId)
        .first<{ image_permission: string }>();
      if (source?.image_permission) {
        const id = uid();
        const message = {
          id,
          kind: "image" as const,
          sourceId: data.sourceId,
          url: data.imageUrl,
          productId,
        };
        await env.DB.prepare(
          "INSERT INTO jobs(id,kind,source_id,url,payload) VALUES(?,?,?,?,?)",
        )
          .bind(
            id,
            "image",
            data.sourceId,
            data.imageUrl,
            JSON.stringify(message),
          )
          .run();
        await env.JOBS.send(message);
      }
    }
  } else throw new Error("Unsupported proposal");
  await audit(env, actor, "approve-proposal", id);
}
