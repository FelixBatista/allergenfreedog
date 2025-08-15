import os
import sqlite3
from pathlib import Path

DB_PATH = Path(os.getenv("DB_PATH", "allergenfreedog.db"))

def get_conn():
    return sqlite3.connect(DB_PATH)

def init_db():
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS foods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                ingredients TEXT NOT NULL
            )
            """
        )
        conn.commit()

def fetch_foods():
    with get_conn() as conn:
        cur = conn.execute("SELECT id, name, ingredients FROM foods")
        rows = cur.fetchall()
    return [
        {"id": row[0], "name": row[1], "ingredients": row[2]}
        for row in rows
    ]

def insert_food(name: str, ingredients: str) -> None:
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO foods (name, ingredients) VALUES (?, ?)",
            (name, ingredients),
        )
        conn.commit()
