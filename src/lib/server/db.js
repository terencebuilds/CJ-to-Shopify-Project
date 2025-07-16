// src/lib/server/db.js 

//(SQLite using better-sqlite3)
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//Get the path to the database file
const dbPath = path.join(process.cwd(), 'products.db');


//Create database instance
const db = new Database(dbPath);

// Initialize the database schema (create table if it doesn't exist)
db.exec(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL,
        imageUrl TEXT,
        sourceUrl TEXT NOT NULL,
        dateAdded TEXT NOT NULL,
        isSelected INTEGER DEFAULT 0,
        isAISelected INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS shopify_destinations (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       nickname TEXT NOT NULL,
       url TEXT NOT NULL,
       encryptedKey TEXT NOT NULL
    );

   CREATE TABLE IF NOT EXISTS llm_keys (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      encryptedKey TEXT NOT NULL
    );
`);

export default db; // Export the database instance