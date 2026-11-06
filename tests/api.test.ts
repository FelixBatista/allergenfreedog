import { describe, it, expect, vi, beforeEach } from "vitest";
import { database } from "./helpers";
vi.mock("../src/server/auth", () => ({
  authConfigured: () => false,
  currentUser: async (request: Request) => {
    const id = request.headers.get("x-test-user");
    return id ? { id, name: "Tester", email: `${id}@example.com` } : null;
  },
}));
import app from "../src/server/index";
import { reserve } from "../src/jobs/ai";
import { approveProposal } from "../src/server/data";
let env: any;
beforeEach(() => {
  const { db } = database();
  env = {
    DB: db,
    APP_URL: "https://dogallergycheck.com",
    ADMIN_EMAILS: "admin@example.com",
    AI_MODEL: "test",
    MONTHLY_BUDGET_USD: "20",
    INFRA_RESERVE_USD: "0",
    AI_MONTHLY_USD: "20",
    ASSETS: { fetch: () => new Response("asset") },
  };
});
const request = (
  path: string,
  body?: unknown,
  user?: string,
  origin?: string,
) =>
  app.request(
    `https://dogallergycheck.com/api/v1/${path}`,
    {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(user ? { "x-test-user": user } : {}),
        ...(origin ? { Origin: origin } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    env,
  );
async function user(id: string) {
  await env.DB.prepare(
    "INSERT INTO user(id,name,email,createdAt,updatedAt) VALUES(?,?,?,?,?)",
  )
    .bind(id, id, `${id}@example.com`, Date.now(), Date.now())
    .run();
}
describe("API security and storage", () => {
  it("redirects alternate production hosts to HTTPS apex with path and query intact", async () => {
    for (const origin of [
      "http://dogallergycheck.com",
      "https://www.dogallergycheck.com",
      "https://dogallergycheck-staging-web.felixb-neto.workers.dev",
    ]) {
      const r = await app.request(`${origin}/blog/?page=2`, {}, env);
      expect(r.status).toBe(308);
      expect(r.headers.get("location")).toBe(
        "https://dogallergycheck.com/blog/?page=2",
      );
    }
    env.APP_URL = "https://dogallergycheck-staging-web.felixb-neto.workers.dev";
    const staging = await app.request(`${env.APP_URL}/api/v1/health`, {}, env);
    expect(staging.status).toBe(200);
  });
  it("serves immutable static responses with security headers", async () => {
    env.ASSETS.fetch = () =>
      Response.redirect("https://example.com/journal", 301);
    const r = await app.request("https://dogallergycheck.com/blog/", {}, env);
    expect(r.status).toBe(301);
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
  });
  it("limits costly explanations per signed-in user", async () => {
    await user("alice");
    const input = {
      triggering: [{ name: "A", ingredients: "chicken" }],
      safe: [{ name: "B", ingredients: "rice" }],
    };
    for (let i = 0; i < 5; i++)
      expect((await request("private/explain", input, "alice")).status).toBe(
        200,
      );
    expect((await request("private/explain", input, "alice")).status).toBe(429);
  });
  it("validates comparison requests and rejects cross-origin writes", async () => {
    expect((await request("compare", {})).status).toBe(400);
    expect(
      (await request("compare", {}, undefined, "https://evil.example")).status,
    ).toBe(403);
    expect((await request("private/dogs")).status).toBe(401);
    expect((await request("admin/overview")).status).toBe(403);
  });
  it("enforces dog ownership and keeps input snapshots", async () => {
    await user("alice");
    await user("bob");
    const dog = (await (
      await request("private/dogs", { name: "Milo" }, "alice")
    ).json()) as any;
    const comparison = {
      triggering: [{ name: "A", ingredients: "chicken" }],
      safe: [{ name: "B", ingredients: "rice" }],
    };
    expect(
      (
        await request(
          "private/comparisons",
          { dogId: dog.id, comparison },
          "bob",
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await request(
          "private/comparisons",
          { dogId: dog.id, comparison },
          "alice",
        )
      ).status,
    ).toBe(201);
    expect(
      await (await request("private/comparisons", undefined, "bob")).json(),
    ).toEqual([]);
    const saved = (await (
      await request("private/comparisons", undefined, "alice")
    ).json()) as any[];
    expect(JSON.parse(saved[0].input).triggering[0].ingredients).toBe(
      "chicken",
    );
  });
  it("does not serve private R2 source documents", async () => {
    expect(
      (
        await app.request(
          "https://dogallergycheck.com/media/backups/private.sql",
          {},
          env,
        )
      ).status,
    ).toBe(404);
  });
  it("reserves budgets atomically and never exceeds category limits", async () => {
    await reserve(env, "ai", 19.95);
    await expect(reserve(env, "ai", 0.1)).rejects.toThrow("budget");
    const usage = await env.DB.prepare(
      "SELECT SUM(reserved_usd) total FROM usage",
    ).first();
    expect(usage.total).toBe(19.95);
  });
  it("publishes a proposal once and versions its product snapshot", async () => {
    await env.DB.prepare(
      "INSERT INTO sources(id,name,kind,url,allowed_host) VALUES(?,?,?,?,?)",
    )
      .bind("s", "Maker", "product", "https://maker.example", "maker.example")
      .run();
    await env.DB.prepare("INSERT INTO proposals(id,kind,payload) VALUES(?,?,?)")
      .bind(
        "p",
        "product",
        JSON.stringify({
          name: "Recipe",
          brand: "Maker",
          ingredients: "rice",
          sourceId: "s",
          sourceUrl: "https://maker.example/recipe",
        }),
      )
      .run();
    await approveProposal(env, "p", "reviewer");
    await expect(approveProposal(env, "p", "reviewer")).rejects.toThrow();
    expect(
      (
        await env.DB.prepare(
          "SELECT COUNT(*) count FROM product_versions",
        ).first()
      ).count,
    ).toBe(1);
  });
});
