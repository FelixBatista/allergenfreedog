# AllergenFreeDog

This repository contains a small PHP-based website for comparing dog foods.  All site files live in the `htdocs/` folder so it can be uploaded directly to InfinityFree hosting.

## Structure
- `htdocs/index.html` – main client-side comparison tool (looks unchanged from the original mockup).
- `htdocs/api/foods.php` – JSON API for listing and adding dog foods.
- `htdocs/lib/db.php` – PDO wrapper for SQLite/MySQL.
- `tests/` – simple CLI test using an in-memory SQLite database.

## Development
1. **Lint PHP files**
   ```bash
   php -l htdocs/lib/db.php htdocs/api/foods.php tests/test_db.php
   ```
2. **Run tests**
   ```bash
   php tests/test_db.php
   ```

The API defaults to a SQLite database at `htdocs/data/foods.db`. To use MySQL on InfinityFree, set environment variables `DB_DSN`, `DB_USER`, and `DB_PASS` with your MySQL credentials.
