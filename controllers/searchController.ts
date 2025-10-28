import { Request, Response } from 'express';
import { searchModules } from '../services/searchService';

export const search = async (req: Request, res: Response) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'A search query parameter "q" is required.' });
  }

  try {
    const results = await searchModules(q);
    res.status(200).json(results);
  } catch (error) {
    console.error(`Error during search for query "${q}":`, error);
    res.status(500).json({ error: 'Internal server error during search.' });
  }
};
