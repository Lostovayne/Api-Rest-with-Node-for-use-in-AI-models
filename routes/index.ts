import { Router } from 'express';
import studyPathRoutes from './studyPathRoutes';
import agentRoutes from './agentRoutes';
import ttsRoutes from './ttsRoutes';
import progressRoutes from './progressRoutes';
import quizRoutes from './quizRoutes';
import searchRoutes from './searchRoutes';

const router = Router();

router.use('/', studyPathRoutes);
router.use('/', agentRoutes);
router.use('/', ttsRoutes);
router.use('/', progressRoutes);
router.use('/', quizRoutes);
router.use('/', searchRoutes);

export default router;