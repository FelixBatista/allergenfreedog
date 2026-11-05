import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { auth, authConfigured, currentUser } from "./auth";
import { ingredients, uid, audit, approveProposal } from "./data";
import { compare, assess, ENGINE_VERSION } from "../shared/comparison";
import type { Env } from "./env";
import { explain } from "../jobs/ai";
type User = { id: string; email: string; name: string };
const app = new Hono<{ Bindings: Env; Variables: { user: User } }>();
app.use("*", async (c, next) => {
  const canonical = new URL(c.env.APP_URL);
  const requested = new URL(c.req.url);
  if (
    canonical.hostname === "dogallergycheck.com" &&
    requested.origin !== canonical.origin &&
    [
      "dogallergycheck.com",
      "www.dogallergycheck.com",
      "dogallergycheck-staging-web.felixb-neto.workers.dev",
    ].includes(requested.hostname)
  ) {
    canonical.pathname = requested.pathname;
    canonical.search = requested.search;
    return c.redirect(canonical.toString(), 308);
  }
  await next();
});
app.use(
  "*",
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://lh3.googleusercontent.com"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
    referrerPolicy: "strict-origin-when-cross-origin",
  }),
);
app.use(
  "/api/*",
  bodyLimit({
    maxSize: 131072,
    onError: (c) => c.json({ error: "Request too large" }, 413),
  }),
);
app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    const origin = c.req.header("Origin");
    if (
      origin &&
      origin !== new URL(c.env.APP_URL).origin &&
      origin !== new URL(c.req.url).origin
    )
      return c.json({ error: "Origin rejected" }, 403);
  }
  await next();
});
app.get("/api/v1/health", (c) =>
  c.json({ ok: true, engineVersion: ENGINE_VERSION }),
);
app.get("/api/v1/config", (c) =>
  c.json({
    loginEnabled: authConfigured(c.env),
    aiEnabled: c.env.AI_ENABLED === "true",
  }),
);
app.on(["GET", "POST"], "/api/auth/*", (c) =>
  authConfigured(c.env)
    ? auth(c.env).handler(c.req.raw)
    : c.json({ error: "Google sign-in has not been configured" }, 503),
);
app.get("/api/v1/me", async (c) => {
  const user = await currentUser(c.req.raw, c.env);
  return c.json({
    user,
    isAdmin:
      !!user &&
      c.env.ADMIN_EMAILS.split(",")
        .map((s) => s.trim().toLowerCase())
        .includes(user.email.toLowerCase()),
  });
});
app.get("/api/v1/ingredients", async (c) => c.json(await ingredients(c.env)));
app.get("/api/v1/datasets/:sourceId", async (c) => {
  const id = c.req.param("sourceId"),
    source = await c.env.DB.prepare(
      "SELECT name FROM sources WHERE id=? AND connector='openpetfoodfacts'",
    )
      .bind(id)
      .first();
  if (!source) return c.notFound();
  const rows = await c.env.DB.prepare(
    "SELECT record_id,payload,attribution,license,updated_at FROM source_datasets WHERE source_id=? ORDER BY record_id LIMIT 100",
  )
    .bind(id)
    .all<{
      record_id: string;
      payload: string;
      attribution: string;
      license: string;
      updated_at: string;
    }>();
  return c.json({
    source,
    license: "ODbL-1.0",
    licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
    records: rows.results.map((r) => ({
      ...r,
      payload: JSON.parse(r.payload),
    })),
  });
});
app.get("/api/v1/products", async (c) => {
  const query = (c.req.query("q") ?? "").slice(0, 100),
    limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 100));
  const { results } = await c.env.DB.prepare(
    "SELECT id,name,brand,variant,market,ingredients,version,source_id,source_url,verified_at,image_key,image_permission FROM products WHERE status='published' AND (name LIKE ? OR brand LIKE ?) ORDER BY brand,name LIMIT ?",
  )
    .bind(`%${query}%`, `%${query}%`, limit)
    .all();
  return c.json(results);
});
const food = z.object({
  id: z.string().max(100).optional(),
  name: z.string().trim().min(1).max(250),
  ingredients: z.string().trim().min(1).max(20000),
  version: z.number().int().positive().optional(),
});
const comparisonInput = z.object({
  triggering: z.array(food).min(1).max(10),
  safe: z.array(food).min(1).max(10),
  preferences: z
    .object({
      glutenFree: z.boolean().optional(),
      chickenFree: z.boolean().optional(),
      hydrolysedLow: z.boolean().optional(),
    })
    .default({}),
});
app.post("/api/v1/compare", async (c) => {
  const input = comparisonInput.parse(await c.req.json());
  return c.json(
    compare(
      input.triggering,
      input.safe,
      await ingredients(c.env),
      input.preferences,
    ),
  );
});
app.post("/api/v1/assess", async (c) => {
  const input = z
      .object({ candidate: food, comparison: comparisonInput })
      .parse(await c.req.json()),
    master = await ingredients(c.env);
  return c.json(
    assess(
      input.candidate,
      compare(
        input.comparison.triggering,
        input.comparison.safe,
        master,
        input.comparison.preferences,
      ),
      master,
    ),
  );
});
app.get("/api/v1/evidence", async (c) =>
  c.json(
    (
      await c.env.DB.prepare(
        "SELECT c.id,c.body,c.ingredient_id,c.evidence_ids,c.reviewed_at,e.id evidence_id,e.title,e.url,e.retracted,e.corrected FROM comments c JOIN evidence e ON EXISTS(SELECT 1 FROM json_each(c.evidence_ids) WHERE value=e.id) WHERE c.status='approved' AND e.retracted=0 ORDER BY c.reviewed_at DESC LIMIT 100",
      ).all()
    ).results,
  ),
);
app.use("/api/v1/private/*", async (c, next) => {
  const user = await currentUser(c.req.raw, c.env);
  if (!user) return c.json({ error: "Sign in required" }, 401);
  c.set("user", user);
  await next();
});
app.get("/api/v1/private/dogs", async (c) =>
  c.json(
    (
      await c.env.DB.prepare(
        "SELECT id,name,breed,age,weight FROM dogs WHERE user_id=? ORDER BY name",
      )
        .bind(c.get("user").id)
        .all()
    ).results,
  ),
);
app.post("/api/v1/private/dogs", async (c) => {
  const d = z
      .object({
        name: z.string().trim().min(1).max(100),
        breed: z.string().max(100).optional(),
        age: z.number().min(0).max(40).optional(),
        weight: z.number().min(0).max(200).optional(),
      })
      .parse(await c.req.json()),
    id = uid();
  await c.env.DB.prepare(
    "INSERT INTO dogs(id,user_id,name,breed,age,weight) VALUES(?,?,?,?,?,?)",
  )
    .bind(
      id,
      c.get("user").id,
      d.name,
      d.breed ?? null,
      d.age ?? null,
      d.weight ?? null,
    )
    .run();
  return c.json({ id, ...d }, 201);
});
app.get("/api/v1/private/comparisons", async (c) =>
  c.json(
    (
      await c.env.DB.prepare(
        "SELECT id,dog_id,input,result,created_at FROM comparisons WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
      )
        .bind(c.get("user").id)
        .all()
    ).results,
  ),
);
app.post("/api/v1/private/comparisons", async (c) => {
  const input = z
      .object({ dogId: z.string(), comparison: comparisonInput })
      .parse(await c.req.json()),
    user = c.get("user");
  if (
    !(await c.env.DB.prepare("SELECT id FROM dogs WHERE id=? AND user_id=?")
      .bind(input.dogId, user.id)
      .first())
  )
    return c.json({ error: "Dog not found" }, 404);
  const result = compare(
      input.comparison.triggering,
      input.comparison.safe,
      await ingredients(c.env),
      input.comparison.preferences,
    ),
    id = uid();
  await c.env.DB.prepare(
    "INSERT INTO comparisons(id,dog_id,user_id,input,result,engine_version) VALUES(?,?,?,?,?,?)",
  )
    .bind(
      id,
      input.dogId,
      user.id,
      JSON.stringify(input.comparison),
      JSON.stringify(result),
      ENGINE_VERSION,
    )
    .run();
  return c.json({ id, result }, 201);
});
app.post("/api/v1/private/explain", async (c) => {
  const limitKey = `explanation-${c.get("user").id}-${new Date().toISOString().slice(0, 10)}`;
  const allowance = await c.env.DB.prepare(
    "INSERT INTO request_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<5",
  )
    .bind(limitKey, Math.floor(Date.now() / 1000) + 86400)
    .run();
  if (!allowance.meta.changes)
    return c.json(
      { error: "Daily explanation limit reached. Please try again tomorrow." },
      429,
    );
  const input = comparisonInput.parse(await c.req.json()),
    result = compare(
      input.triggering,
      input.safe,
      await ingredients(c.env),
      input.preferences,
    );
  return c.json(await explain(c.env, result));
});
app.use("/api/v1/admin/*", async (c, next) => {
  const user = await currentUser(c.req.raw, c.env);
  if (
    !user ||
    !c.env.ADMIN_EMAILS.split(",")
      .map((x) => x.trim().toLowerCase())
      .includes(user.email.toLowerCase())
  )
    return c.json({ error: "Administrator access required" }, 403);
  c.set("user", user);
  await next();
});
app.get("/api/v1/admin/overview", async (c) => {
  const tables = [
    "sources",
    "jobs",
    "proposals",
    "comments",
    "alerts",
    "evidence",
  ];
  const values = await Promise.all(
    tables.map((t) =>
      c.env.DB.prepare(
        `SELECT * FROM ${t} ORDER BY ${t === "comments" ? "updated_at" : "created_at"} DESC LIMIT 100`,
      ).all(),
    ),
  );
  const usage = await c.env.DB.prepare(
    "SELECT category,SUM(reserved_usd) usd FROM usage WHERE month=? GROUP BY category",
  )
    .bind(new Date().toISOString().slice(0, 7))
    .all();
  return c.json({
    ...Object.fromEntries(tables.map((t, i) => [t, values[i].results])),
    usage: usage.results,
    settings: {
      agents: c.env.AGENTS_ENABLED === "true",
      autoPublish: c.env.AUTO_PUBLISH === "true",
      budget: c.env.MONTHLY_BUDGET_USD,
    },
  });
});
app.post("/api/v1/admin/sources", async (c) => {
  const d = z
    .object({
      name: z.string().min(1).max(100),
      kind: z.enum(["product", "science"]),
      url: z.url(),
      permissionBasis: z.string().min(10).max(1000),
      imagePermission: z.string().max(1000).default(""),
    })
    .parse(await c.req.json());
  const url = new URL(d.url);
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    !/[a-z]\.[a-z]{2,}$/i.test(url.hostname) ||
    /\.(local|internal|localhost)$/i.test(url.hostname)
  )
    return c.json({ error: "Public HTTPS hostname required" }, 400);
  if (
    d.kind === "science" &&
    !["eutils.ncbi.nlm.nih.gov", "api.crossref.org", "www.ebi.ac.uk"].includes(
      url.hostname,
    )
  )
    return c.json({ error: "Use an approved scientific API" }, 400);
  const id = uid();
  await c.env.DB.prepare(
    "INSERT INTO sources(id,name,kind,url,allowed_host,permission_basis,image_permission,enabled) VALUES(?,?,?,?,?,?,?,1)",
  )
    .bind(
      id,
      d.name,
      d.kind,
      d.url,
      url.hostname,
      d.permissionBasis,
      d.imagePermission,
    )
    .run();
  await audit(c.env, c.get("user").id, "create-source", id);
  return c.json({ id }, 201);
});
app.post("/api/v1/admin/run", async (c) => {
  if (c.env.AGENTS_ENABLED !== "true")
    return c.json(
      { error: "Agents are disabled in deployment configuration" },
      409,
    );
  const d = z
    .object({
      sourceId: z.string(),
      kind: z.enum(["refresh", "discover", "science", "retractions"]),
    })
    .parse(await c.req.json());
  if (
    !(await c.env.DB.prepare("SELECT id FROM sources WHERE id=? AND enabled=1")
      .bind(d.sourceId)
      .first())
  )
    return c.json({ error: "Source unavailable" }, 404);
  const id = uid();
  await c.env.DB.prepare("INSERT INTO jobs(id,kind,source_id) VALUES(?,?,?)")
    .bind(id, d.kind, d.sourceId)
    .run();
  await c.env.JOBS.send({ id, kind: d.kind, sourceId: d.sourceId });
  await audit(c.env, c.get("user").id, "enqueue", id);
  return c.json({ id }, 202);
});
app.post("/api/v1/admin/sources/:id/toggle", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("UPDATE sources SET enabled=1-enabled WHERE id=?")
    .bind(id)
    .run();
  await audit(c.env, c.get("user").id, "toggle-source", id);
  return c.json({ ok: true });
});
app.get("/api/v1/admin/proposals/:id/image", async (c) => {
  const p = await c.env.DB.prepare("SELECT payload FROM proposals WHERE id=?")
    .bind(c.req.param("id"))
    .first<{ payload: string }>();
  const key = p ? JSON.parse(p.payload).imageKey : null;
  if (typeof key !== "string" || !key.startsWith("review-images/"))
    return c.notFound();
  const image = await c.env.FILES.get(key);
  if (!image) return c.notFound();
  return new Response(image.body, {
    headers: {
      "Content-Type": image.httpMetadata?.contentType ?? "image/jpeg",
      "Cache-Control": "private,no-store",
    },
  });
});
app.post("/api/v1/admin/proposals/:id/:action", async (c) => {
  const action = z.enum(["approve", "reject"]).parse(c.req.param("action")),
    id = c.req.param("id");
  if (action === "approve") await approveProposal(c.env, id, c.get("user").id);
  else {
    await c.env.DB.prepare(
      "UPDATE proposals SET status='rejected',reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'",
    )
      .bind(c.get("user").id, id)
      .run();
    await audit(c.env, c.get("user").id, "reject-proposal", id);
  }
  return c.json({ ok: true });
});
app.post("/api/v1/admin/comments/:id/:action", async (c) => {
  const id = c.req.param("id"),
    action = z.enum(["approve", "reject"]).parse(c.req.param("action"));
  const row = await c.env.DB.prepare(
    "SELECT evidence_ids FROM comments WHERE id=?",
  )
    .bind(id)
    .first<{ evidence_ids: string }>();
  if (!row) return c.json({ error: "Comment unavailable" }, 404);
  if (action === "approve") {
    const ids = JSON.parse(row.evidence_ids) as string[];
    if (!ids.length) return c.json({ error: "Evidence required" }, 400);
    for (const evidenceId of ids) {
      if (
        !(await c.env.DB.prepare(
          "SELECT id FROM evidence WHERE id=? AND retracted=0 AND corrected=0",
        )
          .bind(evidenceId)
          .first())
      )
        return c.json({ error: "Evidence requires review" }, 409);
    }
  }
  await c.env.DB.prepare(
    "UPDATE comments SET status=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=?",
  )
    .bind(action === "approve" ? "approved" : "rejected", c.get("user").id, id)
    .run();
  await audit(c.env, c.get("user").id, `${action}-comment`, id);
  return c.json({ ok: true });
});
app.get("/media/*", async (c) => {
  const key = c.req.path.slice("/media/".length);
  if (!key.startsWith("products/")) return c.notFound();
  if (
    !(await c.env.DB.prepare(
      "SELECT id FROM products WHERE image_key=? AND status='published' AND image_permission IS NOT NULL",
    )
      .bind(key)
      .first())
  )
    return c.notFound();
  const file = await c.env.FILES.get(key);
  if (!file) return c.notFound();
  return new Response(file.body, {
    headers: {
      "Content-Type": file.httpMetadata?.contentType ?? "image/jpeg",
      "Cache-Control": "public,max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
app.all("/api/*", (c) => c.json({ error: "Endpoint not found" }, 404));
app.all("*", async (c) => {
  const asset = await c.env.ASSETS.fetch(c.req.raw);
  return new Response(asset.body, asset);
});
app.onError((e, c) => {
  if (e instanceof z.ZodError)
    return c.json(
      {
        error: "Invalid request",
        issues: e.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      400,
    );
  if (e instanceof SyntaxError) return c.json({ error: "Invalid JSON" }, 400);
  const reference = uid();
  console.error(
    JSON.stringify({
      event: "request_failed",
      reference,
      type: e.name,
      message: e.message.slice(0, 250),
    }),
  );
  return c.json({ error: "Request could not be completed", reference }, 500);
});
export default app;
