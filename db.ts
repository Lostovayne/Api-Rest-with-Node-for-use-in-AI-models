import * as dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
});

export const createTables = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
            CREATE TABLE IF NOT EXISTS study_paths (
                id SERIAL PRIMARY KEY,
                topic VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

    await client.query(`
            CREATE TABLE IF NOT EXISTS study_path_modules (
                id SERIAL PRIMARY KEY,
                study_path_id INTEGER NOT NULL REFERENCES study_paths(id),
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                subtopics TEXT[] NOT NULL,
                image_url TEXT
            );
        `);

    await client.query(`
            CREATE TABLE IF NOT EXISTS user_tasks (
                id SERIAL PRIMARY KEY,
                task TEXT NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
  } finally {
    client.release();
  }
};

export default pool;
