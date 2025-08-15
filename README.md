# AllergenFreeDog

A simple maintainable website for comparing dog foods. This implementation uses a small Python web server and an SQLite database to store dog food entries. The front end communicates with the server via JSON endpoints.

## Getting Started

1. **Run the server**
   ```bash
   python app.py
   ```
   The site will be available at `http://localhost:8000`.

2. **Run tests**
   ```bash
   python -m unittest
   ```

The application stores data in `allergenfreedog.db` by default. Set the `DB_PATH` environment variable to change the database location.
