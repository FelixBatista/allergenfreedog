import { describe, it, expect } from "vitest";
import {
  assertSourceUrl,
  validateExtraction,
  discoveryLinks,
  type Source,
} from "../src/jobs/collection";
const source = {
  id: "s",
  name: "Maker",
  kind: "product",
  url: "https://maker.example/catalog",
  allowed_host: "maker.example",
  permission_basis: "Written permission",
  image_permission: "",
  min_interval_seconds: 10,
} satisfies Source;
describe("source validation", () => {
  it("rejects other hosts, credentials, ports and insecure protocols", () => {
    for (const url of [
      "https://evil.example/a",
      "https://maker.example.evil.example/a",
      "http://maker.example/a",
      "https://x:pass@maker.example/a",
      "https://maker.example:8443/a",
    ])
      expect(() => assertSourceUrl(url, source)).toThrow();
  });
  it("requires a verifiable complete label regardless of AI confidence", () => {
    const errors = validateExtraction(
      {
        name: "Recipe",
        brand: "Maker",
        variant: "",
        ingredients: "chicken, rice",
        confidence: 1,
        imageUrl: null,
      },
      "Recipe has rice",
    );
    expect(errors).toContain(
      "Ingredient list cannot be verified verbatim in source",
    );
  });
  it("deduplicates product links and excludes unrelated domains", () => {
    expect(
      discoveryLinks(
        '<a href="/products/one?x=1">One</a><a href="/products/one">Again</a><a href="https://evil.example/products/two">No</a>',
        source,
      ),
    ).toEqual(["https://maker.example/products/one"]);
  });
});
