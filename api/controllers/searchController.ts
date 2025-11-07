import { Request, Response } from "express";
import { searchModules as searchModulesWithPgvector } from "../../services/searchService"; // Renamed for clarity
import { typesenseService } from "../../services/typesenseService"; // Import typesenseService
import { logger } from "../middlewares/logger";

export const search = async (req: Request, res: Response) => {
  const { q } = req.query;

  if (!q || typeof q !== "string") {
    return res.status(400).json({ error: 'A search query parameter "q" is required.' });
  }

  try {
    const results = await searchModulesWithPgvector(q);
    res.status(200).json(results);
  } catch (error) {
    logger.error({ err: error, query: q }, "Error during semantic search");
    res.status(500).json({ error: "Internal server error during semantic search." });
  }
};

export const searchWithTypesense = async (req: Request, res: Response) => {
  const { q } = req.query;

  if (!q || typeof q !== "string") {
    return res.status(400).json({ error: 'A search query parameter "q" is required.' });
  }

  try {
    const results = await typesenseService.searchModules(q);
    res.status(200).json(results);
  } catch (error) {
    logger.error({ err: error, query: q }, "Error during Typesense search");
    res.status(500).json({ error: "Internal server error during Typesense search." });
  }
};
