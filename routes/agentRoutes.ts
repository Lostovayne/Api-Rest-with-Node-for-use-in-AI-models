import { Router } from 'express';
import { agentController } from '../controllers/agentController';

const router = Router();

router.post('/agent', agentController);

export default router;