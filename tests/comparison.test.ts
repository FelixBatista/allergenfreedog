import { describe, it, expect } from "vitest";
import {
  compare,
  splitIngredients,
  normalize,
  assess,
  type Ingredient,
} from "../src/shared/comparison";
const master: Ingredient[] = [
  { id: "wheat", name: "wheat", aliases: ["wheat meal"], tags: ["gluten"] },
  { id: "buckwheat", name: "buckwheat", aliases: [], tags: [] },
  { id: "chicken", name: "chicken", aliases: [], tags: ["poultry"] },
  { id: "rice", name: "rice", aliases: ["brown rice"], tags: [] },
];
describe("ingredient comparison", () => {
  it("does not conflate buckwheat and wheat", () => {
    expect(normalize("buckwheat", master).key).toBe("buckwheat");
    expect(normalize("wheatgrass", master).recognized).toBe(false);
  });
  it("preserves parenthetical commas and percentages", () => {
    expect(
      splitIngredients("chicken (40%, liver), rice; oil [fish, algae]"),
    ).toEqual(["chicken (40%, liver)", "rice", "oil [fish, algae]"]);
    expect(normalize("chicken (40%, liver)", master)).toMatchObject({
      raw: "chicken (40%, liver)",
      key: "chicken",
      hasDetails: true,
    });
  });
  it("handles duplicate names without overwriting food columns", () => {
    const out = compare(
      [{ name: "Food", ingredients: "chicken, wheat" }],
      [{ name: "Food", ingredients: "brown rice, buckwheat" }],
      master,
    );
    expect(out.rows.find((r) => r.key === "wheat")?.presence).toEqual([
      true,
      false,
    ]);
    expect(out.nonSimilarIngredients).toEqual(["chicken", "wheat"]);
  });
  it("subtracts every tolerated food and retains unknowns as unknowns", () => {
    const out = compare(
      [{ name: "A", ingredients: "chicken, rice, mystery" }],
      [
        { name: "B", ingredients: "rice" },
        { name: "C", ingredients: "chicken" },
      ],
      master,
    );
    expect(out.nonSimilarIngredients).toEqual(["unknown:mystery"]);
    expect(out.unknownCount).toBe(1);
  });
  it("reports alias collisions instead of choosing whichever row is first", () => {
    expect(
      normalize("rice", [
        ...master,
        { id: "other", name: "other", aliases: ["rice"], tags: [] },
      ]),
    ).toMatchObject({ recognized: false, ambiguous: true });
  });
  it("never calls a candidate safe and never lets a hydrolysed preference erase suspects", () => {
    const out = compare(
      [{ name: "A", ingredients: "hydrolysed chicken, wheat" }],
      [{ name: "B", ingredients: "rice" }],
      master,
      { hydrolysedLow: true },
    );
    expect(out.nonSimilarIngredients).toContain("unknown:hydrolysed chicken");
    expect(
      assess({ name: "C", ingredients: "unknown ingredient" }, out, master),
    ).toMatchObject({ status: "no-known-matches", unknownCount: 1 });
  });
});
