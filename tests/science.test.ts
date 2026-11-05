import { describe, it, expect, vi, afterEach } from "vitest";
import { z } from "zod";
import { reusableLicense } from "../src/jobs/pmc";
import { harvest, checkRetractions } from "../src/jobs/science";
import { parseModelOutput, explain } from "../src/jobs/ai";
import { database } from "./helpers";
afterEach(() => vi.unstubAllGlobals());
describe("scientific provenance and model output", () => {
  it("permits only explicitly supported reusable licenses", () => {
    expect(reusableLicense("CC BY 4.0")).toBe(true);
    expect(reusableLicense("CC0")).toBe(true);
    for (const l of ["CC BY-NC 4.0", "CC BY-NC-ND", "all rights reserved", ""])
      expect(reusableLicense(l)).toBe(false);
  });
  it("validates string, fenced and structured model outputs", () => {
    const schema = z.object({ name: z.string() });
    expect(parseModelOutput('```json\n{"name":"Recipe"}\n```', schema)).toEqual(
      { name: "Recipe" },
    );
    expect(parseModelOutput({ name: "Recipe" }, schema)).toEqual({
      name: "Recipe",
    });
    expect(() => parseModelOutput({ name: 123 }, schema)).toThrow();
  });
  it("keeps evidence without publishing unreviewed scientific claims", async () => {
    const { db } = database();
    const stored: string[] = [];
    const env: any = {
      DB: db,
      AI_ENABLED: "false",
      FILES: { put: async (key: string) => stored.push(key) },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).includes("esearch")
          ? new Response(JSON.stringify({ esearchresult: { idlist: ["123"] } }))
          : new Response(
              "<PubmedArticleSet><PubmedArticle><MedlineCitation><PMID>123</PMID><Article><ArticleTitle>A canine study</ArticleTitle><Abstract><AbstractText>Limited findings in dogs.</AbstractText></Abstract><PublicationTypeList><PublicationType>Clinical Trial</PublicationType></PublicationTypeList></Article></MedlineCitation></PubmedArticle></PubmedArticleSet>",
            ),
      ),
    );
    await harvest(env);
    const evidence = await db
      .prepare("SELECT title,access_level FROM evidence")
      .first();
    expect(evidence).toMatchObject({
      title: "A canine study",
      access_level: "abstract",
    });
    expect(
      ((await db.prepare("SELECT COUNT(*) n FROM comments").first()) as any).n,
    ).toBe(0);
    expect(stored[0]).toContain("science/pubmed/");
  });
  it("withdraws every comment linked to retracted evidence", async () => {
    const { db } = database();
    await db
      .prepare("INSERT INTO evidence(id,doi,title,url) VALUES(?,?,?,?)")
      .bind("e", "10.1/example", "Study", "https://example.org/study")
      .run();
    await db
      .prepare(
        "INSERT INTO comments(id,body,evidence_ids,status) VALUES(?,?,?,?)",
      )
      .bind("c", "Draft", '["e"]', "approved")
      .run();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              message: { "updated-by": [{ type: "retraction" }] },
            }),
          ),
      ),
    );
    await checkRetractions({ DB: db } as any);
    expect(
      await db
        .prepare("SELECT status FROM comments WHERE id=?")
        .bind("c")
        .first(),
    ).toMatchObject({ status: "needs-review" });
  });
  it("does not call a model without relevant reviewed evidence", async () => {
    const { db } = database();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const result = await explain({ DB: db } as any, { rows: [] } as any);
    expect(result.generated).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
