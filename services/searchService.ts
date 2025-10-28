import pool from '../db';
import { generateEmbedding } from './geminiService';

export const searchModules = async (query: string, limit: number = 10) => {
  try {
    // 1. Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);

    // 2. Perform similarity search
    // The <=> operator calculates the cosine distance (0 = exact match, 1 = opposite, 2 = orthogonal)
    const searchResult = await pool.query(
      `SELECT id, title, description, subtopics, image_url, embedding <=> $1 AS distance
       FROM study_path_modules
       ORDER BY distance ASC
       LIMIT $2`,
      [`[${queryEmbedding.join(',')}]`, limit]
    );

    return searchResult.rows;
  } catch (error) {
    console.error('Error performing semantic search:', error);
    throw new Error('Failed to perform semantic search.');
  }
};
