ALTER TABLE evidence ADD COLUMN full_text_key TEXT;
ALTER TABLE evidence ADD COLUMN license TEXT;
ALTER TABLE evidence ADD COLUMN access_level TEXT NOT NULL DEFAULT 'abstract';
ALTER TABLE sources ADD COLUMN connector TEXT NOT NULL DEFAULT 'html';
CREATE TABLE source_datasets (source_id TEXT NOT NULL REFERENCES sources(id), record_id TEXT NOT NULL, payload TEXT NOT NULL, attribution TEXT NOT NULL, license TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(source_id,record_id));
CREATE TABLE request_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
