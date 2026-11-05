import { readFile, writeFile, mkdir } from "node:fs/promises";
const source = await readFile(
  "dogallergycheck.com/htdocs/database/schema.sql",
  "utf8",
);
const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
// Parse quoted fields as data. Never execute the legacy MySQL dump against D1.
const tuples = (part) =>
  [...part.matchAll(/^\((.*)\)[,;]?\s*$/gm)].map((m) =>
    [...m[1].matchAll(/'((?:''|[^'])*)'/g)].map((s) =>
      s[1].replaceAll("''", "'"),
    ),
  );
const section = (name) =>
  source.split(`INSERT INTO ${name}`)[1]?.split("-- ")[0] ?? "";
const ingredientRows = tuples(section("ingredient_master")),
  foodRows = tuples(section("food_catalog"));
const aliases = {
  maize: ["corn"],
  soya: ["soy"],
  pea: ["peas", "yellow peas"],
  rice: ["brown rice", "white rice", "brewers rice"],
  oats: ["oatmeal", "oat groats"],
  linseed: ["flaxseed"],
  lentils: ["lentil", "red lentils", "green lentils"],
  chickpeas: ["garbanzo beans"],
  "canola oil": ["rapeseed oil"],
};
const statements = [
  "-- Imported legacy catalog. Labels and scientific notes require review.",
];
for (const [name] of ingredientRows) {
  const id = name.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const tags = ["wheat", "wheat gluten", "barley", "rye", "spelt"].includes(
    name,
  )
    ? ["gluten"]
    : ["poultry", "chicken", "chicken fat", "turkey", "duck"].includes(name)
      ? ["poultry"]
      : [];
  statements.push(
    `INSERT OR IGNORE INTO ingredients(id,name,aliases,tags) VALUES(${[id, name, JSON.stringify(aliases[name] ?? []), JSON.stringify(tags)].map(quote).join(",")});`,
  );
}
let i = 0;
for (const row of foodRows) {
  const [name, brand, ingredients] = row;
  const id = `legacy-${++i}`;
  statements.push(
    `INSERT OR IGNORE INTO products(id,legacy_id,name,brand,ingredients,market) VALUES(${[id, String(i), name, brand, ingredients, "unverified"].map(quote).join(",")});`,
  );
  statements.push(
    `INSERT OR IGNORE INTO product_versions(product_id,version,snapshot) VALUES(${quote(id)},1,${quote(JSON.stringify({ id, name, brand, ingredients, origin: "legacy-schema", labelVerified: false }))});`,
  );
}
await mkdir("database", { recursive: true });
await writeFile("database/seed.sql", statements.join("\n") + "\n");
console.log(
  `Prepared ${ingredientRows.length} ingredient names and ${foodRows.length} legacy products. Unsafe aliases and unreviewed risk claims excluded.`,
);
