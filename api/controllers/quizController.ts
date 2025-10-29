import { Request, Response } from 'express';
import { generateQuizForModule } from '../../services/quizService';
import pool from '../../db';

interface UserAnswer {
    questionId: number;
    selectedOptionIndex: number;
}

export const getQuizForModule = async (req: Request, res: Response) => {
  const { moduleId } = req.params;

  if (!moduleId) {
    return res.status(400).json({ error: 'moduleId is required' });
  }

  try {
    const quiz = await generateQuizForModule(parseInt(moduleId, 10));
    res.status(200).json(quiz);
  } catch (error) {
    console.error(`Error generating quiz for module ${moduleId}:`, error);
    // Send a more specific error message if the module is not found
    if (error.message === 'Module not found') {
        return res.status(404).json({ error: 'Module not found' });
    }
    res.status(500).json({ error: 'Internal server error while generating quiz' });
  }
};

export const submitQuiz = async (req: Request, res: Response) => {
    const { quizId } = req.params;
    const { userId, answers }: { userId: number; answers: UserAnswer[] } = req.body;
  
    if (!userId || !answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'userId and a non-empty answers array are required' });
    }
  
    const client = await pool.connect();
    try {
      // 1. Fetch correct answers for the quiz
      const questionsResult = await client.query(
        'SELECT id, correct_option_index FROM questions WHERE quiz_id = $1',
        [quizId]
      );
      const correctAnswers = new Map<number, number>();
      questionsResult.rows.forEach(q => correctAnswers.set(q.id, q.correct_option_index));
  
      if (questionsResult.rows.length !== answers.length) {
          return res.status(400).json({ error: 'Number of answers does not match number of questions in the quiz.' });
      }
  
      // 2. Calculate score and prepare results
      let correctCount = 0;
      const results = answers.map(answer => {
        const isCorrect = correctAnswers.get(answer.questionId) === answer.selectedOptionIndex;
        if (isCorrect) {
          correctCount++;
        }
        return {
          ...answer,
          is_correct: isCorrect,
          correct_option_index: correctAnswers.get(answer.questionId)
        };
      });
  
      const score = Math.round((correctCount / questionsResult.rows.length) * 100);
  
      // 3. Save attempt and answers to DB in a transaction
      await client.query('BEGIN');
  
      const attemptResult = await client.query(
        'INSERT INTO user_quiz_attempts (user_id, quiz_id, score, completed_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
        [userId, quizId, score]
      );
      const attemptId = attemptResult.rows[0].id;
  
      for (const result of results) {
        await client.query(
          'INSERT INTO user_answers (attempt_id, question_id, selected_option_index, is_correct) VALUES ($1, $2, $3, $4)',
          [attemptId, result.questionId, result.selectedOptionIndex, result.is_correct]
        );
      }
  
      await client.query('COMMIT');
  
      // 4. Return results
      res.status(200).json({
        message: 'Quiz submitted successfully',
        attemptId,
        score,
        results,
      });
  
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Error submitting quiz ${quizId}:`, error);
      res.status(500).json({ error: 'Internal server error while submitting quiz' });
    } finally {
      client.release();
    }
  };

  export const getUserPerformance = async (req: Request, res: Response) => {
    const { userId } = req.params;
  
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
  
    try {
      const performanceResult = await pool.query(
        `SELECT 
          q.title,
          uqa.score,
          uqa.completed_at
         FROM user_quiz_attempts uqa
         JOIN quizzes q ON uqa.quiz_id = q.id
         WHERE uqa.user_id = $1
         ORDER BY uqa.completed_at DESC`,
        [userId]
      );
  
      // Optional: Calculate aggregate stats
      const scores = performanceResult.rows.map(row => row.score);
      const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  
      res.status(200).json({
        total_quizzes_taken: performanceResult.rows.length,
        average_score: Math.round(averageScore),
        attempts: performanceResult.rows,
      });
    } catch (error) {
      console.error(`Error getting performance for user ${userId}:`, error);
      res.status(500).json({ error: 'Internal server error while getting user performance' });
    }
  };