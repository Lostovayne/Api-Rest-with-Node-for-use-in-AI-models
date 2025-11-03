import { Router } from 'express';
import { createTtsJob, getTtsJob } from '../controllers/ttsController';

const router = Router();

// Route to create a new TTS job
router.post('/text-to-speech', createTtsJob);

// Route to get the status and result of a TTS job
router.get('/text-to-speech/:jobId', getTtsJob);

export default router;