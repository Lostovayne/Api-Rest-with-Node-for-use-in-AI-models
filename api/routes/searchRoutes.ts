import { Router } from 'express';
import { search } from '../controllers/searchController';

const router = Router();

// Route for semantic search
router.get('/search', search);

export default router;