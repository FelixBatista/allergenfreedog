export const ENGINE_VERSION = "2.0.0";
export type Ingredient = {
  id: string;
  name: string;
  aliases: string[];
  tags: string[];
};
export type Food = {
  id?: string;
  name: string;
  ingredients: string;
  version?: number;
};
export type Preferences = {
  glutenFree?: boolean;
  chickenFree?: boolean;
  hydrolysedLow?: boolean;
};
export const clean = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\b\d+(?:[.,]\d+)?\s*%/g, "")
    .replace(/\s+/g, " ")
    .trim();
export function splitIngredients(text: string): string[] {
  const result: string[] = [];
  let depth = 0,
    current = "";
  for (const char of text) {
    if (char === "(" || char === "[") depth++;
    if (char === ")" || char === "]") depth = Math.max(0, depth - 1);
    if ((char === "," || char === ";" || char === "\n") && depth === 0) {
      if (current.trim()) result.push(current.trim());
      current = "";
    } else current += char;
  }
  if (current.trim()) result.push(current.trim());
  return result;
}
export function normalize(raw: string, master: Ingredient[]) {
  const text = clean(raw);
  const base = clean(text.replace(/\([^)]*\)|\[[^\]]*\]/g, ""));
  // Exact whole-label aliases only. Parenthetical components are retained, never silently discarded.
  const matches = master.filter((m) =>
    [m.name, ...m.aliases].some((t) => clean(t) === text || clean(t) === base),
  );
  const match = matches.length === 1 ? matches[0] : undefined;
  return {
    raw,
    key: match?.id ?? `unknown:${text}`,
    name: match?.name ?? raw,
    recognized: !!match,
    ambiguous: matches.length > 1,
    tags: match?.tags ?? [],
    hydrolysed: /\bhydrolys(?:ed|ate)|\bhydrolyz(?:ed|ate)/i.test(raw),
    hasDetails: /[([]/.test(raw),
  };
}
export function compare(
  triggering: Food[],
  safe: Food[],
  master: Ingredient[],
  preferences: Preferences = {},
) {
  const foods = [...triggering, ...safe].map((food, index) => ({
    ...food,
    index,
    group: index < triggering.length ? "triggering" : "tolerated",
    parsed: splitIngredients(food.ingredients).map((raw) =>
      normalize(raw, master),
    ),
  }));
  const safeKeys = new Set(
    foods.slice(triggering.length).flatMap((f) => f.parsed.map((i) => i.key)),
  );
  const triggerKeys = new Set(
    foods
      .slice(0, triggering.length)
      .flatMap((f) => f.parsed.map((i) => i.key)),
  );
  const rows = [
    ...new Set(foods.flatMap((f) => f.parsed.map((i) => i.key))),
  ].map((key) => {
    const entries = foods.flatMap((f) => f.parsed.filter((i) => i.key === key));
    const first = entries[0];
    return {
      ...first,
      originals: [...new Set(entries.map((e) => e.raw))],
      presence: foods.map((f) => f.parsed.some((i) => i.key === key)),
      suspect: triggerKeys.has(key) && !safeKeys.has(key),
      overlap: triggerKeys.has(key) && safeKeys.has(key),
      focus:
        (preferences.glutenFree && first.tags.includes("gluten")) ||
        (preferences.chickenFree && first.tags.includes("poultry")) ||
        false,
      hydrolysedLow:
        !!preferences.hydrolysedLow && entries.every((e) => e.hydrolysed),
      requiresReview: !first.recognized || entries.some((e) => e.hasDetails),
    };
  });
  return {
    engineVersion: ENGINE_VERSION,
    foods: foods.map(({ parsed, ...food }) => food),
    rows,
    nonSimilarIngredients: rows.filter((r) => r.suspect).map((r) => r.key),
    unknownCount: rows.filter((r) => !r.recognized).length,
    notice:
      "Patterns in food history suggest ingredients to investigate. They do not confirm an allergy or guarantee a food will be tolerated.",
  };
}
export function assess(
  candidate: Food,
  comparison: ReturnType<typeof compare>,
  master: Ingredient[],
) {
  const ingredients = splitIngredients(candidate.ingredients).map((raw) =>
    normalize(raw, master),
  );
  const matches = ingredients.filter((i) =>
    comparison.nonSimilarIngredients.includes(i.key),
  );
  return {
    food: candidate,
    ingredients,
    matches,
    unknownCount: ingredients.filter((i) => !i.recognized).length,
    status: matches.length ? "matches-found" : "no-known-matches",
    notice:
      "No known matches is not a safety guarantee. Unrecognized ingredients require review.",
  };
}
