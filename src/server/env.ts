export interface JobMessage {
  id: string;
  kind: "refresh" | "discover" | "science" | "retractions" | "backup" | "image";
  sourceId?: string;
  url?: string;
  productId?: string;
}
export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  ASSETS: Fetcher;
  JOBS: Queue<JobMessage>;
  INGESTION: Workflow<JobMessage>;
  APP_URL: string;
  ADMIN_EMAILS: string;
  BETTER_AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  AI_ACCOUNT_ID: string;
  AI_GATEWAY_ID: string;
  AI_GATEWAY_TOKEN?: string;
  AI_PROVIDER_KEY?: string;
  AI_MODEL: string;
  AI_ENABLED: string;
  AI_MAX_CALL_USD: string;
  AI_MONTHLY_USD: string;
  AGENTS_ENABLED: string;
  AUTO_PUBLISH: string;
  MONTHLY_BUDGET_USD: string;
  INFRA_RESERVE_USD: string;
  NCBI_EMAIL?: string;
  NCBI_API_KEY?: string;
  CF_BACKUP_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  CF_DATABASE_ID?: string;
  CF_BROWSER_TOKEN?: string;
  BROWSER_ENABLED?: string;
  AI?: Ai;
}
