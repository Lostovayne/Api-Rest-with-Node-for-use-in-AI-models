import { Router } from 'express';
import { getQuizForModule, submitQuiz, getUserPerformance } from '../controllers/quizController';

const router = Router();

// Route to generate and get a quiz for a module
router.get('/modules/:moduleId/quiz', getQuizForModule);

// Route to submit answers to a quiz
router.post('/quizzes/:quizId/submit', submitQuiz);

// Route to get user performance on quizzes
router.get('/users/:userId/performance', getUserPerformance);

export default router;
