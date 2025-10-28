import { Router } from 'express';
import {
    createStudyPath,
    getStudyPath,
    getStudyPathModule,
    generateImagesForPath,
} from '../controllers/studyPathController';

const router = Router();

router.post('/study-path', createStudyPath);
router.get('/study-path/:id', getStudyPath);
router.get('/study-path-modules/:id', getStudyPathModule);
router.post('/generate-images-for-path', generateImagesForPath);

export default router;