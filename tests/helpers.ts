import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
export function database() {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of readdirSync("migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    sqlite.exec(readFileSync(`migrations/${file}`, "utf8"));
  const wrap = (query: string, args: any[] = []) => ({
    bind: (...bound: any[]) => wrap(query, bound),
    first: async () => sqlite.prepare(query).get(...args) ?? null,
    all: async () => ({
      results: sqlite.prepare(query).all(...args),
      success: true,
    }),
    run: async () => {
      const result = sqlite.prepare(query).run(...args);
      return { success: true, meta: { changes: Number(result.changes) } };
    },
  });
  const db = {
    prepare: (q: string) => wrap(q),
    batch: async (statements: any[]) => {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const s of statements) results.push(await s.run());
        sqlite.exec("COMMIT");
        return results;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return { sqlite, db };
}
