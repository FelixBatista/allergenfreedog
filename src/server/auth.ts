import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./auth-schema";
import type { Env } from "./env";
export const authConfigured = (env: Env) =>
  !!(
    env.BETTER_AUTH_SECRET &&
    env.GOOGLE_CLIENT_ID &&
    env.GOOGLE_CLIENT_SECRET
  );
export function auth(env: Env) {
  if (!authConfigured(env)) throw new Error("Authentication is not configured");
  return betterAuth({
    baseURL: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(drizzle(env.DB, { schema }), {
      provider: "sqlite",
      schema,
    }),
    trustedOrigins: [env.APP_URL],
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!,
      },
    },
    advanced: { useSecureCookies: new URL(env.APP_URL).protocol === "https:" },
  });
}
export async function currentUser(request: Request, env: Env) {
  if (!authConfigured(env)) return null;
  const data = await auth(env).api.getSession({ headers: request.headers });
  if (!data) return null;
  // Only the verified provider subject can claim legacy data; email alone is not sufficient.
  const identity = await env.DB.prepare(
    "SELECT accountId FROM account WHERE userId=? AND providerId='google'",
  )
    .bind(data.user.id)
    .first<{ accountId: string }>();
  if (identity) {
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE legacy_identities SET migrated_user_id=? WHERE google_subject=? AND (migrated_user_id IS NULL OR migrated_user_id=?)",
      ).bind(data.user.id, identity.accountId, data.user.id),
      env.DB.prepare(
        "UPDATE dogs SET user_id=? WHERE user_id IS NULL AND legacy_owner IN (SELECT legacy_id FROM legacy_identities WHERE migrated_user_id=?)",
      ).bind(data.user.id, data.user.id),
      env.DB.prepare(
        "UPDATE comparisons SET user_id=? WHERE user_id IS NULL AND dog_id IN (SELECT id FROM dogs WHERE user_id=?)",
      ).bind(data.user.id, data.user.id),
    ]);
  }
  return data.user;
}
