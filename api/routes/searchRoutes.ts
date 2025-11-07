import { Router } from 'express';
import { search, searchWithTypesense } from '../controllers/searchController';

const router = Router();

// Route for semantic search (pgvector)
router.get('/search', search);

// Route for keyword search (Typesense)
router.get('/search/typesense', searchWithTypesense);

export default router;
