import type { Env } from "../server/env";
import { assertSourceUrl, type Source } from "./collection";
export async function downloadImage(
  env: Env,
  url: string,
  source: Source,
  key: string,
) {
  if (!source.image_permission)
    throw new Error("Image permission is not recorded");
  const imageUrl = new URL(url);
  if (!(
    source.connector === "openpetfoodfacts" &&
    imageUrl.hostname === "images.openpetfoodfacts.org" &&
    imageUrl.protocol === "https:" &&
    !imageUrl.username &&
    !imageUrl.password &&
    !imageUrl.port
  ))
    assertSourceUrl(url, source);
  const response = await fetch(url, {
    redirect: "manual",
    headers: {
      "User-Agent": "DogAllergyCheck/1.0 (https://dogallergycheck.com)",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok || !response.body) throw new Error("Image unavailable");
  const mime = response.headers.get("content-type")?.split(";")[0] ?? "";
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(mime))
    throw new Error("Unsupported image format");
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 5000000) {
      await reader.cancel();
      throw new Error("Image exceeds size limit");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  await env.FILES.put(key, bytes, {
    httpMetadata: { contentType: mime },
    customMetadata: {
      source: url,
      permission: source.image_permission.slice(0, 1000),
    },
  });
  return key;
}
