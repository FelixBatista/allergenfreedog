import type { Food } from "../shared/comparison";
export type Product = Food & {
  id: string;
  brand: string;
  image_key?: string;
  source_url?: string;
  verified_at?: string;
  source_id?: string;
};
export async function api<T = any>(path: string, data?: unknown): Promise<T> {
  const r = await fetch(`/api/${path}`, {
    method: data === undefined ? "GET" : "POST",
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const body = (await r.json()) as any;
  if (!r.ok) throw new Error(body.error ?? "Request failed");
  return body as T;
}
export const emptyFood = (): Food => ({ name: "Custom food", ingredients: "" });
