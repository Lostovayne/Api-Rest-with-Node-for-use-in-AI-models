import type { Request, Response } from "express";
import { rabbitmqConfig } from "../../config/rabbitmq.config";
import pool from "../../db";
import { queueService } from "../../services/queueService";

interface UserAnswer {
  questionId: number;
  selectedOptionIndex: number;
}

export const generateQuizForModuleController = async (req: Request, res: Response) => {
  const { moduleId } = req.params;

  if (!moduleId) {
    return res.status(400).json({ error: "moduleId is required" });
  }

  try {
    const payload = { moduleId: parseInt(moduleId, 10) };

    if (isNaN(payload.moduleId)) {
      return res.status(400).json({ error: "Invalid moduleId" });
    }

    const task = { taskType: "generateQuiz", payload };
    await queueService.sendToQueue(rabbitmqConfig.queues.taskQueue, JSON.stringify(task));

    res.status(202).json({
      message: "Quiz generation started. The quiz will be available shortly.",
    });
  } catch (error) {
    console.error(`Error publishing quiz generation task for module ${moduleId}:`, error);
    res.status(500).json({ error: "Internal server error while starting quiz generation" });
  }
};

export const submitQuiz = async (req: Request, res: Response) => {
  const { quizId } = req.params;
  const { userId, answers }: { userId: number; answers: UserAnswer[] } = req.body;

  if (!userId || !answers || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: "userId and a non-empty answers array are required" });
  }

  const client = await pool.connect();
  try {
    // 1. Fetch correct answers for the quiz
    const questionsResult = await client.query(
      "SELECT id, correct_option_index FROM questions WHERE quiz_id = $1",
      [quizId]
    );
    const correctAnswers = new Map<number, number>();
    questionsResult.rows.forEach((q) => {
      correctAnswers.set(q.id, q.correct_option_index);
    });

    if (questionsResult.rows.length !== answers.length) {
      return res.status(400).json({
        error: "Number of answers does not match number of questions in the quiz.",
      });
    }

    // 2. Calculate score and prepare results
    let correctCount = 0;
    const results = answers.map((answer) => {
      const isCorrect = correctAnswers.get(answer.questionId) === answer.selectedOptionIndex;
      if (isCorrect) {
        correctCount++;
      }
      return {
        ...answer,
        is_correct: isCorrect,
        correct_option_index: correctAnswers.get(answer.questionId),
      };
    });

    const score = Math.round((correctCount / questionsResult.rows.length) * 100);

    // 3. Save attempt and answers to DB in a transaction
    await client.query("BEGIN");

    const attemptResult = await client.query(
      "INSERT INTO user_quiz_attempts (user_id, quiz_id, score, completed_at) VALUES ($1, $2, $3, NOW()) RETURNING id",
      [userId, quizId, score]
    );
    const attemptId = attemptResult.rows[0].id;

    for (const result of results) {
      await client.query(
        "INSERT INTO user_answers (attempt_id, question_id, selected_option_index, is_correct) VALUES ($1, $2, $3, $4)",
        [attemptId, result.questionId, result.selectedOptionIndex, result.is_correct]
      );
    }

    await client.query("COMMIT");

    // 4. Return results
    res.status(200).json({
      message: "Quiz submitted successfully",
      attemptId,
      score,
      results,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`Error submitting quiz ${quizId}:`, error);
    res.status(500).json({ error: "Internal server error while submitting quiz" });
  } finally {
    client.release();
  }
};

export const getUserPerformance = async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
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
    const scores = performanceResult.rows.map((row) => row.score);
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    res.status(200).json({
      total_quizzes_taken: performanceResult.rows.length,
      average_score: Math.round(averageScore),
      attempts: performanceResult.rows,
    });
  } catch (error) {
    console.error(`Error getting performance for user ${userId}:`, error);
    res.status(500).json({ error: "Internal server error while getting user performance" });
  }
};

export const getQuizByModule = async (req: Request, res: Response) => {
  const { moduleId } = req.params;

  if (!moduleId) {
    return res.status(400).json({ error: "moduleId is required" });
  }

  try {
    const quizResult = await pool.query(
      `SELECT id, module_id, title, created_at
       FROM quizzes
       WHERE module_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [moduleId]
    );

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const quiz = quizResult.rows[0];

    const questionsResult = await pool.query(
      `SELECT id, question_text, options
       FROM questions
       WHERE quiz_id = $1
       ORDER BY id ASC`,
      [quiz.id]
    );

    return res.status(200).json({ quiz, questions: questionsResult.rows });
  } catch (error) {
    console.error(`Error retrieving quiz for module ${moduleId}:`, error);
    return res.status(500).json({ error: "Internal server error while retrieving quiz" });
  }
};
