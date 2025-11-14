import pool from "../db";

export interface JournalEntryInput {
  userId: number;
  entryDate?: string;
  title?: string;
  summary?: string;
  rawContent?: string;
  metadata?: Record<string, unknown>;
}

export interface JournalEntry {
  id: number;
  user_id: number;
  entry_date: string;
  title: string | null;
  summary: string | null;
  raw_content: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const normalizeDate = (date?: string): string => {
  if (!date) {
    return new Date().toISOString().split("T")[0];
  }
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Fecha inválida para la entrada del diario");
  }
  return parsed.toISOString().split("T")[0];
};

export const createJournalEntry = async (
  input: JournalEntryInput
): Promise<JournalEntry> => {
  const client = await pool.connect();
  try {
    const entryDate = normalizeDate(input.entryDate);
    const result = await client.query<JournalEntry>(
      `INSERT INTO user_journal_entries (user_id, entry_date, title, summary, raw_content, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, entry_date, title, summary, raw_content, metadata, created_at`,
      [
        input.userId,
        entryDate,
        input.title ?? null,
        input.summary ?? null,
        input.rawContent ?? null,
        input.metadata ?? null,
      ]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
};

export const listJournalEntries = async (
  userId: number,
  limit = 20
): Promise<JournalEntry[]> => {
  const client = await pool.connect();
  try {
    const result = await client.query<JournalEntry>(
      `SELECT id, user_id, entry_date, title, summary, raw_content, metadata, created_at
       FROM user_journal_entries
       WHERE user_id = $1
       ORDER BY entry_date DESC, created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  } finally {
    client.release();
  }
};

export const getJournalEntry = async (
  userId: number,
  entryId: number
): Promise<JournalEntry | null> => {
  const client = await pool.connect();
  try {
    const result = await client.query<JournalEntry>(
      `SELECT id, user_id, entry_date, title, summary, raw_content, metadata, created_at
       FROM user_journal_entries
       WHERE user_id = $1 AND id = $2`,
      [userId, entryId]
    );
    return result.rows[0] ?? null;
  } finally {
    client.release();
  }
};
