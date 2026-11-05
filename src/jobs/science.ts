import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import type { Env } from "../server/env";
import { uid, ingredients } from "../server/data";
import { generate, PROMPT_VERSION } from "./ai";
import { fullText } from "./pmc";
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});
const array = (v: any): any[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];
function text(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v !== "object") return String(v);
  if (Array.isArray(v)) return v.map(text).join(" ");
  return Object.entries(v)
    .filter(([k]) => !k.startsWith("@_"))
    .map(([, x]) => text(x))
    .join(" ");
}
async function ncbi(path: string, env: Env) {
  const url = new URL(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/${path}`);
  url.searchParams.set("tool", "dogallergycheck");
  if (env.NCBI_EMAIL) url.searchParams.set("email", env.NCBI_EMAIL);
  if (env.NCBI_API_KEY) url.searchParams.set("api_key", env.NCBI_API_KEY);
  const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`NCBI ${r.status}`);
  return r.text();
}
export async function discoverScience(env: Env) {
  const search = JSON.parse(
    await ncbi(
      "esearch.fcgi?db=pubmed&retmode=json&retmax=10&sort=pub_date&term=" +
        encodeURIComponent(
          '(dog OR canine) AND (food allergy OR adverse food reaction OR hydrolyzed protein) AND ("last 90 days"[dp])',
        ),
      env,
    ),
  );
  const ids = (search.esearchresult?.idlist as string[]) ?? [];
  if (!ids.length) return [];
  // Separate requests to remain below the unauthenticated NCBI rate limit.
  await new Promise((r) => setTimeout(r, 400));
  const xml = await ncbi(
    `efetch.fcgi?db=pubmed&retmode=xml&id=${ids.join(",")}`,
    env,
  );
  await env.FILES.put(
    `science/pubmed/${new Date().toISOString().slice(0, 10)}.xml`,
    xml,
    { httpMetadata: { contentType: "application/xml" } },
  );
  return array(parser.parse(xml).PubmedArticleSet?.PubmedArticle).map(
    (article) => JSON.stringify(article),
  );
}
export async function processArticle(env: Env, serialized: string) {
  const article = JSON.parse(serialized);
  const master = await ingredients(env);
  const citation = article.MedlineCitation,
    detail = citation?.Article;
  if (!detail) return;
  const pmid = text(citation.PMID),
    title = text(detail.ArticleTitle),
    abstract = text(detail.Abstract?.AbstractText),
    types = array(detail.PublicationTypeList?.PublicationType).map(text),
    doi = array(article.PubmedData?.ArticleIdList?.ArticleId).find(
      (x: any) => x["@_IdType"] === "doi",
    );
  const id = `pubmed:${pmid}`,
    retracted = types.some((t: string) =>
      /retracted publication|retraction of publication/i.test(t),
    );
  await env.DB.prepare(
    "INSERT INTO evidence(id,pmid,doi,title,abstract,url,published_at,study_type,retracted,checked_at) VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET title=excluded.title,abstract=excluded.abstract,retracted=excluded.retracted,checked_at=CURRENT_TIMESTAMP",
  )
    .bind(
      id,
      pmid,
      doi ? text(doi) : null,
      title,
      abstract,
      `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      text(detail.Journal?.JournalIssue?.PubDate),
      types.join(", "),
      retracted ? 1 : 0,
    )
    .run();
  const pmc = array(article.PubmedData?.ArticleIdList?.ArticleId).find(
    (x: any) => x["@_IdType"] === "pmc",
  );
  const full = pmc ? await fullText(text(pmc), env) : null;
  if (full)
    await env.DB.prepare(
      "UPDATE evidence SET full_text_key=?,license=?,access_level='full-text-excerpt' WHERE id=?",
    )
      .bind(full.key, full.license, id)
      .run();
  if (retracted || !abstract || env.AI_ENABLED !== "true") return;
  if (
    await env.DB.prepare(
      "SELECT id FROM comments WHERE EXISTS(SELECT 1 FROM json_each(evidence_ids) WHERE value=?)",
    )
      .bind(id)
      .first()
  )
    return;
  const out = await generate(
    env,
    "Classify only supplied evidence (abstract and, when provided, a licensed full-text excerpt). Never imply reviewing more than supplied. Return {species,studyType,ingredientIds:string[],comment:string,limitations:string}. Comment is a cautious draft for a veterinary reviewer. Use only ingredient IDs from the supplied list, or [].",
    {
      id,
      title,
      abstract,
      fullTextExcerpt: full?.text ?? null,
      accessLevel: full ? "full-text-excerpt" : "abstract",
      ingredients: master.map((i) => ({ id: i.id, name: i.name })),
    },
    z.object({
      species: z.string().max(100),
      studyType: z.string().max(250),
      ingredientIds: z.array(z.string()).max(20),
      comment: z.string().max(4000),
      limitations: z.string().max(2000),
    }),
  ).catch(async (error) => {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO alerts(id,level,message) VALUES(?,?,?)",
    )
      .bind(
        `ai-evidence-${id}`,
        "warning",
        `AI draft for ${id} failed validation (${error instanceof Error ? error.name : "unknown"}); evidence retained without publication.`,
      )
      .run();
    return null;
  });
  if (!out) return;
  await env.DB.prepare("UPDATE evidence SET species=?,study_type=? WHERE id=?")
    .bind(out.species, out.studyType, id)
    .run();
  for (const ingredientId of out.ingredientIds.filter((x) =>
    master.some((i) => i.id === x),
  )) {
    await env.DB.prepare(
      "INSERT INTO comments(id,ingredient_id,body,evidence_ids,model,prompt_version) VALUES(?,?,?,?,?,?)",
    )
      .bind(
        uid(),
        ingredientId,
        `${out.comment}\n\nLimitations (${full ? "licensed full-text excerpt" : "abstract only"}): ${out.limitations}`,
        JSON.stringify([id]),
        env.AI_MODEL,
        PROMPT_VERSION,
      )
      .run();
  }
}
export async function harvest(env: Env) {
  for (const article of await discoverScience(env))
    await processArticle(env, article);
}
export async function checkRetractions(env: Env, id?: string) {
  const statement = env.DB.prepare(
    id
      ? "SELECT id,doi,pmid FROM evidence WHERE id=?"
      : "SELECT id,doi,pmid FROM evidence ORDER BY checked_at ASC LIMIT 20",
  );
  const { results } = await (id ? statement.bind(id) : statement).all<{
    id: string;
    doi: string | null;
    pmid: string | null;
  }>();
  for (const e of results) {
    let retracted = false,
      corrected = false;
    if (e.doi) {
      const r = await fetch(
        `https://api.crossref.org/works/${encodeURIComponent(e.doi)}`,
        {
          headers: {
            "User-Agent": `DogAllergyCheck/1.0 (mailto:${env.NCBI_EMAIL ?? "contact@dogallergycheck.com"})`,
          },
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!r.ok && r.status !== 404) throw new Error(`Crossref ${r.status}`);
      if (r.ok) {
        const data = (await r.json()) as any;
        const relations = [
          ...(data.message?.["update-to"] ?? []),
          ...(data.message?.["updated-by"] ?? []),
        ];
        retracted = relations.some((u: any) => /retract/i.test(u.type ?? ""));
        corrected = relations.some((u: any) =>
          /correct|errat/i.test(u.type ?? ""),
        );
      }
    }
    if (e.pmid) {
      const xml = await ncbi(
        `efetch.fcgi?db=pubmed&retmode=xml&id=${encodeURIComponent(e.pmid)}`,
        env,
      );
      retracted ||= /RetractionIn|Retracted Publication/.test(xml);
      corrected ||= /ErratumIn|Corrected and Republished/.test(xml);
      await new Promise((r) => setTimeout(r, 400));
    }
    await env.DB.prepare(
      "UPDATE evidence SET retracted=MAX(retracted,?),corrected=MAX(corrected,?),checked_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(+retracted, +corrected, e.id)
      .run();
    if (retracted || corrected) {
      await env.DB.prepare(
        "UPDATE comments SET status='needs-review' WHERE EXISTS(SELECT 1 FROM json_each(evidence_ids) WHERE value=?)",
      )
        .bind(e.id)
        .run();
      await env.DB.prepare(
        "INSERT OR IGNORE INTO alerts(id,level,message) VALUES(?,?,?)",
      )
        .bind(
          `evidence-${e.id}`,
          "warning",
          `Evidence ${e.id} was corrected or retracted; linked comments need review.`,
        )
        .run();
    }
  }
}
