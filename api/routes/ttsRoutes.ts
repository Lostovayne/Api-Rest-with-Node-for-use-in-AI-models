import { Router } from 'express';
import { ttsController } from '../controllers/ttsController';

const router = Router();

router.post('/text-to-speech', ttsController);

export default router;