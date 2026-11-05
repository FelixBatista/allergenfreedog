import { readFile, mkdir, writeFile, readdir, cp } from "node:fs/promises";
import { resolve, join } from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import sanitize from "sanitize-html";
const legacy = resolve("dogallergycheck.com/htdocs"),
  output = resolve("public");
await mkdir(output, { recursive: true });
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const urls = [];
const layout = (title, body) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} — Dog Allergy Check</title><meta name="description" content="${escape(title)}"><link rel="stylesheet" href="/journal.css"><link rel="icon" href="/favicon.svg"></head><body><header><a href="/">🐾 Dog Allergy Check</a><nav><a href="/#compare">Compare foods</a> <a href="/blog/">Journal</a></nav></header><main><p class="eyebrow">The Dog Allergy Check journal</p><article>${body}</article></main><footer>For information only. Discuss individual dietary decisions with your veterinarian.</footer></body></html>`;
const pages = join(legacy, "blog/user/pages");
const articles = [];
async function walk(directory, segments = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory())
      await walk(join(directory, entry.name), [
        ...segments,
        entry.name.replace(/^\d+\./, ""),
      ]);
    else if (entry.name.endsWith(".md")) {
      if (entry.name === "formdata.md") continue;
      const file = await readFile(join(directory, entry.name), "utf8");
      // Grav accepts unquoted @self selectors that strict YAML rejects.
      const parsed = matter(file, {
        engines: {
          yaml: (header) => ({
            title: header
              .match(/^title:\s*(.+)$/m)?.[1]
              ?.trim()
              .replace(/^['"]|['"]$/g, ""),
            published: !/^published:\s*false\s*$/m.test(header),
          }),
        },
      });
      if (parsed.data.published === false) continue;
      const path = segments.join("/"),
        title = parsed.data.title ?? segments.at(-1) ?? "Journal";
      const route =
        path === "blog" ? "/blog/" : `/blog/${path.replace(/^blog\//, "")}/`;
      let content = parsed.content;
      // Grav frontmatter forms need an application handler; do not emit a nonfunctional form.
      if (entry.name === "form.md")
        content +=
          "\n\nThe former contact form is unavailable during migration. Please use your existing contact channel.";
      const html = sanitize(await marked.parse(content), {
        allowedTags: sanitize.defaults.allowedTags.concat(["img", "h1", "h2"]),
        allowedAttributes: {
          ...sanitize.defaults.allowedAttributes,
          img: ["src", "alt", "width", "height"],
        },
        allowedSchemes: ["http", "https", "mailto"],
        transformTags: {
          a: sanitize.simpleTransform("a", { rel: "noopener noreferrer" }),
        },
      });
      const outDir = join(output, route);
      await mkdir(outDir, { recursive: true });
      await writeFile(
        join(outDir, "index.html"),
        layout(
          title,
          `<p class="review-note">Migrated editorial content · scientific claims await review against the updated evidence library.</p>${html}`,
        ),
      );
      urls.push(route);
      if (route !== "/blog/") articles.push({ title, route });
      for (const asset of await readdir(directory, { withFileTypes: true })) {
        if (
          asset.isFile() &&
          /\.(png|jpe?g|webp|gif|svg|pdf)$/i.test(asset.name)
        )
          await cp(join(directory, asset.name), join(outDir, asset.name));
      }
    }
  }
}
await walk(pages);
await mkdir(join(output, "blog"), { recursive: true });
await writeFile(
  join(output, "blog/index.html"),
  layout(
    "Journal",
    `<h1>Food, health & the questions that matter.</h1><p>Guides from the existing journal. Scientific statements are being reviewed as the evidence library grows.</p><ul>${articles.map((a) => `<li><a href="${a.route}">${escape(a.title)}</a></li>`).join("")}</ul>`,
  ),
);
for (const page of ["allergy-testing.html", "dog-allergy-tests.html"]) {
  const legacyHtml = await readFile(join(legacy, page), "utf8");
  const body = legacyHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? "";
  const safe = sanitize(body, {
    allowedTags: sanitize.defaults.allowedTags.concat([
      "img",
      "h1",
      "h2",
      "section",
      "details",
      "summary",
    ]),
    allowedAttributes: {
      ...sanitize.defaults.allowedAttributes,
      img: ["src", "alt"],
      a: ["href", "target", "rel"],
      div: ["class", "id"],
    },
    allowedSchemes: ["https", "http"],
    transformTags: {
      a: sanitize.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
  await writeFile(
    join(output, page),
    layout(
      page === "allergy-testing.html"
        ? "Allergy testing guide"
        : "Compare allergy tests",
      `<p class="review-note">Legacy editorial page pending scientific review. Offers and prices may have changed. Links may be affiliate links.</p>${safe}`,
    ),
  );
  urls.push(`/${page}`);
}
await cp(join(legacy, "favicon.svg"), join(output, "favicon.svg"));
await cp(join(legacy, "images"), join(output, "images"), { recursive: true });
await writeFile(
  join(output, "robots.txt"),
  "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: https://dogallergycheck.com/sitemap.xml\n",
);
await writeFile(
  join(output, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/", ...new Set(urls)].map((u) => `<url><loc>https://dogallergycheck.com${escape(u)}</loc></url>`).join("")}</urlset>`,
);
console.log(
  `Prepared ${articles.length} journal pages and legacy landing pages; no PHP or private config copied.`,
);
