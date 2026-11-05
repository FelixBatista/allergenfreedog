import { downloadImage } from "./images";
import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import type { Env, JobMessage } from "../server/env";
import { uid, approveProposal } from "../server/data";
import {
  extractProduct,
  fetchSource,
  discoveryLinks,
  validateExtraction,
  assertSourceUrl,
  type Source,
} from "./collection";
import { discoverScience, processArticle, checkRetractions } from "./science";
import { reserve } from "./ai";
import { collectOpenPetFood } from "./openpetfood";

async function enqueue(env: Env, message: JobMessage) {
  const result = await env.DB.prepare(
    "INSERT OR IGNORE INTO jobs(id,kind,source_id,url,payload) VALUES(?,?,?,?,?)",
  )
    .bind(
      message.id,
      message.kind,
      message.sourceId ?? null,
      message.url ?? null,
      JSON.stringify(message),
    )
    .run();
  if (result.meta.changes) await env.JOBS.send(message);
}
async function browserContent(env: Env, url: string, source: Source) {
  assertSourceUrl(url, source);
  if (
    env.BROWSER_ENABLED !== "true" ||
    !env.CF_BROWSER_TOKEN ||
    !env.CF_ACCOUNT_ID
  )
    throw new Error(
      "No complete label in static page; browser collection not configured",
    );
  await reserve(env, "browser", 0.05);
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/browser-rendering/content`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_BROWSER_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        gotoOptions: { waitUntil: "domcontentloaded", timeout: 20000 },
      }),
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!r.ok) throw new Error(`Browser collection failed (${r.status})`);
  const out = (await r.json()) as { result: string };
  return out.result;
}
async function storeImage(
  env: Env,
  url: string,
  source: Source,
  productId: string,
) {
  const key = await downloadImage(
    env,
    url,
    source,
    `products/${productId}/${Date.now()}`,
  );
  await env.DB.prepare(
    "UPDATE products SET image_key=?,image_permission=? WHERE id=?",
  )
    .bind(key, source.image_permission, productId)
    .run();
}
async function backup(env: Env, step: WorkflowStep) {
  if (!env.CF_BACKUP_TOKEN || !env.CF_ACCOUNT_ID || !env.CF_DATABASE_ID)
    throw new Error("D1 backup credentials are not configured");
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/d1/database/${env.CF_DATABASE_ID}/export`;
  let bookmark: string | undefined, signedUrl: string | undefined;
  for (let i = 0; i < 30; i++) {
    const result = await step.do(`export-poll-${i}`, async () => {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.CF_BACKUP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          output_format: "polling",
          ...(bookmark ? { current_bookmark: bookmark } : {}),
        }),
      });
      if (!r.ok) throw new Error(`Backup export ${r.status}`);
      const data = (await r.json()) as any;
      if (!data.success) throw new Error("D1 export rejected");
      return data.result;
    });
    bookmark = result.at_bookmark ?? bookmark;
    signedUrl = result.result?.signed_url ?? result.signed_url;
    if (signedUrl) break;
    if (result.status === "error") throw new Error("Backup export failed");
    await step.sleep(`export-wait-${i}`, "10 seconds");
  }
  if (!signedUrl) throw new Error("Backup export did not complete");
  await step.do("save-backup", async () => {
    const r = await fetch(signedUrl!);
    if (!r.ok || !r.body) throw new Error("Backup download failed");
    await env.FILES.put(
      `backups/${new Date().toISOString().slice(0, 10)}.sql`,
      r.body,
      { httpMetadata: { contentType: "application/sql" } },
    );
  });
  await step.do("retain-backups", async () => {
    const cutoff = new Date(Date.now() - 30 * 86400000);
    let cursor: string | undefined;
    do {
      const list = await env.FILES.list({ prefix: "backups/", cursor });
      const expired = list.objects.filter((o) => o.uploaded < cutoff);
      if (expired.length) await env.FILES.delete(expired.map((o) => o.key));
      cursor = list.truncated ? list.cursor : undefined;
    } while (cursor);
  });
}
export class IngestionWorkflow extends WorkflowEntrypoint<Env, JobMessage> {
  async run(event: WorkflowEvent<JobMessage>, step: WorkflowStep) {
    const job = event.payload;
    try {
      await step.do("start", async () => {
        await this.env.DB.prepare(
          "UPDATE jobs SET status='running',updated_at=CURRENT_TIMESTAMP,error=NULL WHERE id=?",
        )
          .bind(job.id)
          .run();
      });
      if (job.kind === "backup") await backup(this.env, step);
      else if (this.env.AGENTS_ENABLED !== "true")
        throw new Error("Agents disabled");
      else if (job.kind === "science") {
        const papers = await step.do(
          "scientific-discovery",
          {
            retries: { limit: 2, delay: "30 seconds", backoff: "exponential" },
          },
          () => discoverScience(this.env),
        );
        for (let i = 0; i < papers.length; i++) {
          await step.do(
            `process-article-${i}`,
            {
              retries: {
                limit: 2,
                delay: "30 seconds",
                backoff: "exponential",
              },
            },
            () => processArticle(this.env, papers[i]),
          );
          await step.sleep(`article-spacing-${i}`, "2 seconds");
        }
      } else if (job.kind === "retractions") {
        const ids = await step.do("evidence-to-check", async () => {
          const rows = await this.env.DB.prepare(
            "SELECT id FROM evidence ORDER BY checked_at ASC LIMIT 20",
          ).all<{ id: string }>();
          return rows.results.map((e) => e.id);
        });
        for (let i = 0; i < ids.length; i++) {
          await step.do(
            `check-evidence-${i}`,
            {
              retries: {
                limit: 2,
                delay: "30 seconds",
                backoff: "exponential",
              },
            },
            () => checkRetractions(this.env, ids[i]),
          );
          await step.sleep(`check-spacing-${i}`, "2 seconds");
        }
      } else if (job.kind === "image")
        await step.do(
          "collect-approved-image",
          {
            retries: { limit: 2, delay: "30 seconds", backoff: "exponential" },
          },
          async () => {
            const source = await this.env.DB.prepare(
              "SELECT * FROM sources WHERE id=? AND enabled=1",
            )
              .bind(job.sourceId ?? "")
              .first<Source>();
            if (!source || !job.productId || !job.url)
              throw new Error("Image job missing approved product/source");
            await storeImage(this.env, job.url, source, job.productId);
          },
        );
      else {
        const source = await step.do("source", async () => {
          const s = await this.env.DB.prepare(
            "SELECT * FROM sources WHERE id=? AND enabled=1",
          )
            .bind(job.sourceId ?? "")
            .first<Source>();
          if (!s || s.kind !== "product")
            throw new Error("Product source unavailable");
          return s;
        });
        const url = job.url ?? source.url;
        assertSourceUrl(url, source);
        if (source.connector === "openpetfoodfacts") {
          await step.do("collect-openpetfoodfacts", () =>
            collectOpenPetFood(this.env, source),
          );
          await step.do("complete-openpetfoodfacts", async () => {
            await this.env.DB.prepare(
              "UPDATE jobs SET status='completed',updated_at=CURRENT_TIMESTAMP WHERE id=?",
            )
              .bind(job.id)
              .run();
          });
          return;
        }
        const collected = await step.do(
          "collect",
          {
            retries: { limit: 2, delay: "30 seconds", backoff: "exponential" },
          },
          async () => {
            const html = await fetchSource(url, source, this.env),
              hash = [
                ...new Uint8Array(
                  await crypto.subtle.digest(
                    "SHA-256",
                    new TextEncoder().encode(html),
                  ),
                ),
              ]
                .map((x) => x.toString(16).padStart(2, "0"))
                .join("");
            const previous = await this.env.DB.prepare(
              "SELECT content_hash FROM source_snapshots WHERE source_id=? AND url=?",
            )
              .bind(source.id, url)
              .first<{ content_hash: string }>();
            const key = `sources/${source.id}/${hash}.html`;
            await this.env.FILES.put(key, html, {
              httpMetadata: { contentType: "text/html" },
            });
            await this.env.DB.prepare(
              "UPDATE jobs SET object_key=?,content_hash=? WHERE id=?",
            )
              .bind(key, hash, job.id)
              .run();
            return { key, hash, unchanged: previous?.content_hash === hash };
          },
        );
        if (job.kind === "discover")
          await step.do("discover", async () => {
            const html = await (await this.env.FILES.get(
              collected.key,
            ))!.text();
            const current = await this.env.DB.prepare(
              "SELECT COUNT(*) count FROM products WHERE market='US' AND status='published'",
            ).first<{ count: number }>();
            const links = discoveryLinks(html, source).slice(
              0,
              Math.max(0, 100 - (current?.count ?? 0)),
            );
            for (const link of links)
              await enqueue(this.env, {
                id: `discover-${job.id}-${await shortHash(link)}`,
                kind: "refresh",
                sourceId: source.id,
                url: link,
              });
          });
        else if (!collected.unchanged)
          await step.do(
            "extract-and-propose",
            { retries: { limit: 1, delay: "30 seconds", backoff: "constant" } },
            async () => {
              if (
                await this.env.DB.prepare(
                  "SELECT id FROM proposals WHERE job_id=?",
                )
                  .bind(job.id)
                  .first()
              )
                return;
              const html = await (await this.env.FILES.get(
                collected.key,
              ))!.text();
              let extracted;
              try {
                extracted = await extractProduct(html, this.env);
              } catch (e) {
                if (this.env.BROWSER_ENABLED !== "true") throw e;
                const rendered = await browserContent(this.env, url, source);
                await this.env.FILES.put(`${collected.key}.rendered`, rendered);
                extracted = await extractProduct(rendered, this.env);
              }
              const { data, text, method } = extracted,
                reasons = validateExtraction(data, text);
              const existing = await this.env.DB.prepare(
                "SELECT id,name,brand,ingredients FROM products WHERE source_id=? AND source_url=?",
              )
                .bind(source.id, url)
                .first<{
                  id: string;
                  name: string;
                  brand: string;
                  ingredients: string;
                }>();
              if (!existing) reasons.push("New product requires first review");
              else if (
                existing.name !== data.name ||
                existing.brand !== data.brand ||
                existing.ingredients !== data.ingredients
              )
                reasons.push("Product identity or composition changed");
              if (method === "ai")
                reasons.push(
                  "AI extraction requires review until connector is qualified",
                );
              const id = uid();
              await this.env.DB.prepare(
                "INSERT INTO proposals(id,job_id,kind,product_id,payload,reasons) VALUES(?,?,?,?,?,?)",
              )
                .bind(
                  id,
                  job.id,
                  "product",
                  existing?.id ?? null,
                  JSON.stringify({
                    ...data,
                    sourceId: source.id,
                    sourceUrl: url,
                    method,
                  }),
                  JSON.stringify(reasons),
                )
                .run();
              if (this.env.AUTO_PUBLISH === "true" && !reasons.length)
                await approveProposal(this.env, id, "worker");
              if (
                existing &&
                data.imageUrl &&
                source.image_permission &&
                !reasons.length
              ) {
                try {
                  await storeImage(
                    this.env,
                    data.imageUrl,
                    source,
                    existing.id,
                  );
                } catch {
                  await this.env.DB.prepare(
                    "INSERT INTO alerts(id,level,message) VALUES(?,?,?)",
                  )
                    .bind(
                      uid(),
                      "warning",
                      `Image collection for product ${existing.id} requires review`,
                    )
                    .run();
                }
              }
            },
          );
        await step.do("record-source", async () => {
          await this.env.DB.batch([
            this.env.DB.prepare(
              "INSERT INTO source_snapshots(source_id,url,content_hash,object_key) VALUES(?,?,?,?) ON CONFLICT(source_id,url) DO UPDATE SET content_hash=excluded.content_hash,object_key=excluded.object_key,created_at=CURRENT_TIMESTAMP",
            ).bind(source.id, url, collected.hash, collected.key),
            this.env.DB.prepare(
              "UPDATE sources SET last_error=NULL WHERE id=?",
            ).bind(source.id),
          ]);
        });
      }
      await step.do("complete", async () => {
        await this.env.DB.prepare(
          "UPDATE jobs SET status='completed',updated_at=CURRENT_TIMESTAMP WHERE id=?",
        )
          .bind(job.id)
          .run();
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Job failed";
      await step.do("record-failure", async () => {
        await this.env.DB.prepare(
          "UPDATE jobs SET status='failed',error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
        )
          .bind(message.slice(0, 500), job.id)
          .run();
        if (job.sourceId)
          await this.env.DB.prepare(
            "UPDATE sources SET last_error=? WHERE id=?",
          )
            .bind(message.slice(0, 500), job.sourceId)
            .run();
        await this.env.DB.prepare(
          "INSERT OR IGNORE INTO alerts(id,level,message) VALUES(?,?,?)",
        )
          .bind(
            `job-${job.id}`,
            "error",
            `Job ${job.id} failed: ${message.slice(0, 300)}`,
          )
          .run();
      });
      throw error;
    }
  }
}
async function shortHash(s: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
  ]
    .slice(0, 12)
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
export default {
  async scheduled(event: ScheduledController, env: Env) {
    const day = new Date(event.scheduledTime).toISOString().slice(0, 10);
    if (event.cron === "0 3 * * *") {
      await enqueue(env, { id: `backup-${day}`, kind: "backup" });
      return;
    }
    if (env.AGENTS_ENABLED !== "true") return;
    const kind: JobMessage["kind"] =
      event.cron === "0 6 * * *"
        ? "refresh"
        : event.cron === "0 7 * * MON"
          ? "discover"
          : event.cron === "0 7 * * TUE"
            ? "science"
            : "retractions";
    if (kind === "science" || kind === "retractions") {
      await enqueue(env, { id: `${kind}-${day}`, kind });
      return;
    }
    const { results } = await env.DB.prepare(
      "SELECT * FROM sources WHERE enabled=1 AND kind='product' ORDER BY id LIMIT 3",
    ).all<Source>();
    for (const source of results) {
      if (kind === "refresh") {
        if (source.connector === "openpetfoodfacts") {
          await enqueue(env, {
            id: `refresh-${day}-${source.id}`,
            kind,
            sourceId: source.id,
          });
          continue;
        }
        const products = await env.DB.prepare(
          "SELECT source_url FROM products WHERE source_id=? AND status='published' LIMIT 100",
        )
          .bind(source.id)
          .all<{ source_url: string }>();
        for (const p of products.results)
          await enqueue(env, {
            id: `refresh-${day}-${await shortHash(p.source_url)}`,
            kind,
            sourceId: source.id,
            url: p.source_url,
          });
      } else
        await enqueue(env, {
          id: `discover-${day}-${source.id}`,
          kind,
          sourceId: source.id,
        });
    }
    // Recover messages persisted just before a failed send; workflow instance IDs make redelivery safe.
    const pending = await env.DB.prepare(
      "SELECT id,kind,source_id,url,payload FROM jobs WHERE status='queued' AND created_at<datetime('now','-1 hour') LIMIT 50",
    ).all<{
      id: string;
      kind: JobMessage["kind"];
      source_id: string;
      url: string;
      payload: string | null;
    }>();
    for (const p of pending.results)
      await env.JOBS.send(
        p.payload
          ? JSON.parse(p.payload)
          : {
              id: p.id,
              kind: p.kind,
              sourceId: p.source_id ?? undefined,
              url: p.url ?? undefined,
            },
      );
  },
  async queue(batch: MessageBatch<JobMessage>, env: Env) {
    for (const message of batch.messages) {
      try {
        try {
          await env.INGESTION.create({
            id: message.body.id,
            params: message.body,
          });
        } catch (error) {
          const existing = await env.INGESTION.get(message.body.id);
          await existing.status();
        }
        message.ack();
      } catch {
        message.retry({ delaySeconds: 60 });
      }
    }
  },
} satisfies ExportedHandler<Env, JobMessage>;
