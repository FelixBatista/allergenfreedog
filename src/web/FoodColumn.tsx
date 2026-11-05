import React, { useState } from "react";
import type { Food } from "../shared/comparison";
import { type Product, emptyFood } from "./api";
export function FoodColumn({
  title,
  hint,
  foods,
  onChange,
  products,
  tone,
}: {
  title: string;
  hint: string;
  foods: Food[];
  onChange: (v: Food[]) => void;
  products: Product[];
  tone: string;
}) {
  const [brand, setBrand] = useState("");
  return (
    <section className={`food-column ${tone}`}>
      <div className="column-heading">
        <span className="number">{tone === "trigger" ? "01" : "02"}</span>
        <div>
          <h3>{title}</h3>
          <p>{hint}</p>
        </div>
      </div>
      <label>
        Filter by brand
        <select value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="">All brands</option>
          {[...new Set(products.map((p) => p.brand))].sort().map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </label>
      {foods.map((food, index) => (
        <div className="food-entry" key={index}>
          <label>
            Food {index + 1}
            <select
              aria-label={`${title} food ${index + 1}`}
              value={food.id ?? ""}
              onChange={(e) => {
                const p = products.find((p) => p.id === e.target.value);
                onChange(
                  foods.map((f, i) =>
                    i === index
                      ? p
                        ? {
                            id: p.id,
                            name: p.name,
                            ingredients: p.ingredients,
                            version: p.version,
                          }
                        : emptyFood()
                      : f,
                  ),
                );
              }}
            >
              <option value="">Custom — paste ingredients</option>
              {products
                .filter((p) => !brand || p.brand === brand || p.id === food.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.brand} · {p.name}
                  </option>
                ))}
            </select>
          </label>
          {!food.id && (
            <label>
              Food name
              <input
                value={food.name}
                onChange={(e) =>
                  onChange(
                    foods.map((f, i) =>
                      i === index ? { ...f, name: e.target.value } : f,
                    ),
                  )
                }
              />
            </label>
          )}
          <label>
            Ingredients
            <textarea
              rows={4}
              value={food.ingredients}
              placeholder="Paste the complete ingredient list from the label…"
              onChange={(e) =>
                onChange(
                  foods.map((f, i) =>
                    i === index
                      ? {
                          ...f,
                          id: undefined,
                          version: undefined,
                          ingredients: e.target.value,
                        }
                      : f,
                  ),
                )
              }
            />
          </label>
          {food.id && (
            <div className="product-provenance">
              {products.find((p) => p.id === food.id)?.image_key && (
                <img
                  width="55"
                  height="55"
                  alt={food.name}
                  src={`/media/${products.find((p) => p.id === food.id)!.image_key}`}
                />
              )}
              <small>
                Catalog entry · verify against your package label.
                {products.find((p) => p.id === food.id)?.source_url && (
                  <>
                    {" "}
                    <a
                      href={products.find((p) => p.id === food.id)!.source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View source ↗
                    </a>
                  </>
                )}
                {products.find((p) => p.id === food.id)?.source_id ===
                  "openpetfoodfacts-us" && (
                  <>
                    {" "}
                    · Open Pet Food Facts contributors, ODbL / image CC BY-SA.{" "}
                    <a href="/api/v1/datasets/openpetfoodfacts-us">
                      Source dataset
                    </a>
                  </>
                )}
              </small>
            </div>
          )}
          {foods.length > 1 && (
            <button
              className="text-button"
              onClick={() => onChange(foods.filter((_, i) => i !== index))}
            >
              Remove food
            </button>
          )}
        </div>
      ))}
      <button
        className="add-button"
        disabled={foods.length >= 10}
        onClick={() => onChange([...foods, emptyFood()])}
      >
        + Add another food
      </button>
    </section>
  );
}
