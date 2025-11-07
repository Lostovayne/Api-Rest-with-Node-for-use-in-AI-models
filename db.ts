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
    await client.query("CREATE EXTENSION IF NOT EXISTS vector;");
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    await client.query(`
            CREATE TABLE IF NOT EXISTS study_paths (
                id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
                topic VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

    await client.query(`
        CREATE TABLE IF NOT EXISTS study_path_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id INTEGER REFERENCES users(id),
          topic VARCHAR(255) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          study_path_id INTEGER REFERENCES study_paths(id),
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP WITH TIME ZONE
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
      CREATE TABLE IF NOT EXISTS tts_jobs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          text_content TEXT NOT NULL,
          user_id INTEGER REFERENCES users(id),
          module_id INTEGER REFERENCES study_path_modules(id),
          audio_url TEXT,
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP WITH TIME ZONE
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

    await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

    await client.query(`
            CREATE TABLE IF NOT EXISTS achievements (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                icon_prompt TEXT NOT NULL,
                milestone_type VARCHAR(50) NOT NULL,
                milestone_value INTEGER NOT NULL
            );
        `);

    await client.query(`
            CREATE TABLE IF NOT EXISTS user_achievements (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                achievement_id INTEGER NOT NULL REFERENCES achievements(id),
                earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                generated_image_url TEXT
            );
        `);

    await client.query(`
            CREATE TABLE IF NOT EXISTS user_module_progress (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                module_id INTEGER NOT NULL REFERENCES study_path_modules(id),
                completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (user_id, module_id)
            );
        `);

    await client.query(`
            CREATE TABLE IF NOT EXISTS quizzes (
                id SERIAL PRIMARY KEY,
                module_id INTEGER NOT NULL REFERENCES study_path_modules(id),
                title VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

    await client.query(`
            CREATE TABLE IF NOT EXISTS questions (
                id SERIAL PRIMARY KEY,
                quiz_id INTEGER NOT NULL REFERENCES quizzes(id),
                question_text TEXT NOT NULL,
                options JSONB NOT NULL,
                correct_option_index INTEGER NOT NULL
            );
        `);

    await client.query(`
            CREATE TABLE IF NOT EXISTS user_quiz_attempts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                quiz_id INTEGER NOT NULL REFERENCES quizzes(id),
                score INTEGER NOT NULL,
                started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP WITH TIME ZONE
            );
        `);

    await client.query(`
            CREATE TABLE IF NOT EXISTS user_answers (
                id SERIAL PRIMARY KEY,
                attempt_id INTEGER NOT NULL REFERENCES user_quiz_attempts(id),
                question_id INTEGER NOT NULL REFERENCES questions(id),
                selected_option_index INTEGER NOT NULL,
                is_correct BOOLEAN NOT NULL
            );
        `);

    // Alter table after it has been created
    await client.query(
      "ALTER TABLE study_path_modules ADD COLUMN IF NOT EXISTS embedding vector(3072);"
    );
    await client.query(
      "ALTER TABLE study_paths ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);"
    );
    await client.query("ALTER TABLE study_path_requests ADD COLUMN IF NOT EXISTS error_message TEXT;");
    await client.query(
      "ALTER TABLE study_path_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;"
    );

    // Migration for tts_jobs table to use Vercel Blob
    await client.query("ALTER TABLE tts_jobs ADD COLUMN IF NOT EXISTS audio_url TEXT;");
    await client.query("ALTER TABLE tts_jobs DROP COLUMN IF EXISTS audio_base64;");
    await client.query("ALTER TABLE tts_jobs DROP COLUMN IF EXISTS mime_type;");
    await client.query(
      "ALTER TABLE tts_jobs ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);"
    );
    await client.query(
      "ALTER TABLE tts_jobs ADD COLUMN IF NOT EXISTS module_id INTEGER REFERENCES study_path_modules(id);"
    );
  } finally {
    client.release();
  }
};

export const seedDatabase = async () => {
  const client = await pool.connect();
  try {
    // Check if achievements table is empty
    const result = await client.query("SELECT COUNT(*) FROM achievements");
    if (parseInt(result.rows[0].count, 10) > 0) {
      console.log("Achievements table already seeded.");
      return;
    }

    const achievements = [
      {
        name: "First Step",
        description: "Complete your first module.",
        icon_prompt: "a cute 3D bronze medal for a first achievement, clean background, shiny, award",
        milestone_type: "MODULE_COMPLETION",
        milestone_value: 1,
      },
      {
        name: "Apprentice",
        description: "Complete 5 modules.",
        icon_prompt: "a cute 3D silver medal for an apprentice learner, clean background, shiny, award",
        milestone_type: "MODULE_COMPLETION",
        milestone_value: 5,
      },
      {
        name: "Journeyman",
        description: "Complete 10 modules.",
        icon_prompt:
          "a cute 3D gold medal for a journeyman learner, clean background, shiny, award, intricate design",
        milestone_type: "MODULE_COMPLETION",
        milestone_value: 10,
      },
      {
        name: "Scholar",
        description: "Complete 25 modules.",
        icon_prompt:
          "a cute 3D platinum trophy cup for a scholar, clean background, shiny, award, elegant design, gems",
        milestone_type: "MODULE_COMPLETION",
        milestone_value: 25,
      },
    ];

    for (const ach of achievements) {
      await client.query(
        "INSERT INTO achievements (name, description, icon_prompt, milestone_type, milestone_value) VALUES ($1, $2, $3, $4, $5)",
        [ach.name, ach.description, ach.icon_prompt, ach.milestone_type, ach.milestone_value]
      );
    }

    console.log("Achievements table seeded successfully.");
  } finally {
    client.release();
  }
};

export default pool;
