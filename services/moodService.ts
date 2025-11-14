import pool from "../db";

export interface MoodSnapshotInput {
  userId: number;
  mood: string;
  energyLevel?: number;
  stressLevel?: number;
  note?: string;
  tags?: string[];
}

export interface MoodSnapshot {
  id: number;
  user_id: number;
  mood: string;
  energy_level: number | null;
  stress_level: number | null;
  note: string | null;
  tags: string[] | null;
  created_at: string;
}

export interface MoodSummary {
  userId: number;
  sampleSize: number;
  averageEnergy: number | null;
  averageStress: number | null;
  moodDistribution: Record<string, number>;
  recentSnapshots: MoodSnapshot[];
  latestEntry: MoodSnapshot | null;
}

const clampScale = (value?: number): number | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (Number.isNaN(value)) {
    return null;
  }
  return Math.min(10, Math.max(1, Math.round(value)));
};

export const createMoodSnapshot = async (
  input: MoodSnapshotInput
): Promise<MoodSnapshot> => {
  const client = await pool.connect();
  try {
    const result = await client.query<MoodSnapshot>(
      `INSERT INTO user_mood_snapshots (user_id, mood, energy_level, stress_level, note, tags)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, mood, energy_level, stress_level, note, tags, created_at`,
      [
        input.userId,
        input.mood,
        clampScale(input.energyLevel),
        clampScale(input.stressLevel),
        input.note ?? null,
        input.tags ?? null,
      ]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
};

export const listMoodSnapshots = async (
  userId: number,
  limit = 30
): Promise<MoodSnapshot[]> => {
  const client = await pool.connect();
  try {
    const result = await client.query<MoodSnapshot>(
      `SELECT id, user_id, mood, energy_level, stress_level, note, tags, created_at
       FROM user_mood_snapshots
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  } finally {
    client.release();
  }
};

export const getMoodSummary = async (userId: number): Promise<MoodSummary> => {
  const client = await pool.connect();
  try {
    const recentSnapshots = await listMoodSnapshots(userId, 10);

    const aggResult = await client.query<{
      sample_size: string;
      avg_energy: string | null;
      avg_stress: string | null;
    }>(
      `SELECT
         COUNT(*) AS sample_size,
         AVG(energy_level)::TEXT AS avg_energy,
         AVG(stress_level)::TEXT AS avg_stress
       FROM user_mood_snapshots
       WHERE user_id = $1
         AND created_at >= NOW() - INTERVAL '30 days'`,
      [userId]
    );

    const distResult = await client.query<{ mood: string; count: string }>(
      `SELECT mood, COUNT(*)::TEXT AS count
       FROM user_mood_snapshots
       WHERE user_id = $1
         AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY mood`,
      [userId]
    );

    const moodDistribution: Record<string, number> = {};
    distResult.rows.forEach((row) => {
      moodDistribution[row.mood] = Number.parseInt(row.count, 10);
    });

    const sampleSize = Number.parseInt(aggResult.rows[0]?.sample_size ?? "0", 10);
    const averageEnergy = aggResult.rows[0]?.avg_energy
      ? Number.parseFloat(aggResult.rows[0].avg_energy)
      : null;
    const averageStress = aggResult.rows[0]?.avg_stress
      ? Number.parseFloat(aggResult.rows[0].avg_stress)
      : null;

    return {
      userId,
      sampleSize,
      averageEnergy,
      averageStress,
      moodDistribution,
      recentSnapshots,
      latestEntry: recentSnapshots[0] ?? null,
    };
  } finally {
    client.release();
  }
};
