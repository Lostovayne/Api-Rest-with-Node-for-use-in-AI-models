import { Router } from 'express';
import { completeModule, getUserProgress, getUserDashboard } from '../controllers/progressController';

const router = Router();

// Route to mark a module as complete
router.post('/modules/complete', completeModule);

// Route to get user progress
router.get('/users/:userId/progress', getUserProgress);

// Route to get user dashboard
router.get('/users/:userId/dashboard', getUserDashboard);

export default router;
