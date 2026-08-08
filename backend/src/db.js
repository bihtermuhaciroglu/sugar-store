import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const dbUrl = process.env.DB_URL || "file:./data/store.db";
if (dbUrl.startsWith("file:")) {
  fs.mkdirSync(path.dirname(dbUrl.slice("file:".length)), { recursive: true });
}

export const db = createClient({
  url: dbUrl,
  authToken: process.env.DB_AUTH_TOKEN,
});

await db.executeMultiple(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    barcode TEXT UNIQUE NOT NULL,
    size TEXT,
    color TEXT,
    price REAL NOT NULL,
    cost_price REAL,
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    type TEXT NOT NULL CHECK (type IN ('sale', 'adjustment', 'initial')),
    quantity_delta INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total REAL NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL REFERENCES sales(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL REFERENCES sales(id),
    total REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_id INTEGER NOT NULL REFERENCES returns(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL
  );
`);

const productColumns = await db.execute("PRAGMA table_info(products)");
const hasImageColumn = productColumns.rows.some((col) => col.name === "image");
if (!hasImageColumn) {
  await db.execute("ALTER TABLE products ADD COLUMN image TEXT");
}
