import { Router } from 'express';
import studyPathRoutes from './studyPathRoutes';
import agentRoutes from './agentRoutes';
import ttsRoutes from './ttsRoutes';
import progressRoutes from './progressRoutes';
import quizRoutes from './quizRoutes';

const router = Router();

router.use('/', studyPathRoutes);
router.use('/', agentRoutes);
router.use('/', ttsRoutes);
router.use('/', progressRoutes);
router.use('/', quizRoutes);

export default router;