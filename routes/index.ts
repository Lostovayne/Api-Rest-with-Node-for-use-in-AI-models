import { Router } from 'express';
import studyPathRoutes from './studyPathRoutes';
import agentRoutes from './agentRoutes';
import ttsRoutes from './ttsRoutes';

const router = Router();

router.use('/', studyPathRoutes);
router.use('/', agentRoutes);
router.use('/', ttsRoutes);

export default router;