import { Router } from 'express';
import { generateQuizForModuleController, submitQuiz, getUserPerformance } from '../controllers/quizController';

const router = Router();

// Route to trigger quiz generation for a module
router.post('/modules/:moduleId/quiz', generateQuizForModuleController);

// Route to submit answers to a quiz
router.post('/quizzes/:quizId/submit', submitQuiz);

// Route to get user performance on quizzes
router.get('/users/:userId/performance', getUserPerformance);

export default router;