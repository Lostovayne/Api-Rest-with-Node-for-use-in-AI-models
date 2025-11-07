import { Request, Response } from "express";
import pool from "../../db";
import { checkModuleCompletionAchievements } from "../../services/achievementService";

export const completeModule = async (req: Request, res: Response) => {
  const { userId, moduleId } = req.body; // Assuming userId and moduleId are sent in the body

  const numericUserId = Number(userId);
  const numericModuleId = Number(moduleId);

  if (Number.isNaN(numericUserId) || Number.isNaN(numericModuleId)) {
    return res.status(400).json({ error: "userId and moduleId are required" });
  }

  try {
    // Insert into user_module_progress
    const result = await pool.query(
      "INSERT INTO user_module_progress (user_id, module_id) VALUES ($1, $2) RETURNING *",
      [numericUserId, numericModuleId]
    );

    // Check for achievements and award them
    const newlyAwarded = await checkModuleCompletionAchievements(numericUserId);

    res.status(201).json({
      message: "Module marked as complete",
      progress: result.rows[0],
      newly_awarded_achievements: newlyAwarded,
    });
  } catch (e) {
    const error = e as any;
    console.error("Error completing module:", error);
    // Handle potential unique constraint violation if the user already completed the module
    if (error.code === "23505") {
      // unique_violation
      return res.status(409).json({ error: "Module already marked as complete" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserProgress = async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const numericUserId = Number(userId);
  if (Number.isNaN(numericUserId)) {
    return res.status(400).json({ error: "userId must be a number" });
  }

  try {
    // Get completed modules
    const completedModules = await pool.query(
      "SELECT module_id, completed_at FROM user_module_progress WHERE user_id = $1",
      [numericUserId]
    );

    // Get earned achievements
    const earnedAchievements = await pool.query(
      `SELECT a.name, a.description, ua.earned_at, ua.generated_image_url
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1`,
      [numericUserId]
    );

    res.status(200).json({
      completed_modules_count: completedModules.rows.length,
      completed_modules: completedModules.rows,
      achievements_count: earnedAchievements.rows.length,
      achievements: earnedAchievements.rows,
    });
  } catch (error) {
    console.error("Error getting user progress:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserDashboard = async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const numericUserId = Number(userId);
  if (Number.isNaN(numericUserId)) {
    return res.status(400).json({ error: "userId must be a number" });
  }

  try {
    // Get completed modules count
    const completedModulesResult = await pool.query(
      "SELECT COUNT(*) FROM user_module_progress WHERE user_id = $1",
      [numericUserId]
    );
    const completedModulesCount = parseInt(completedModulesResult.rows[0].count, 10);

    // Get earned achievements count
    const earnedAchievementsResult = await pool.query(
      "SELECT COUNT(*) FROM user_achievements WHERE user_id = $1",
      [numericUserId]
    );
    const earnedAchievementsCount = parseInt(earnedAchievementsResult.rows[0].count, 10);

    // TODO: Add logic for suggested next module
    const suggestedNextModule = {
      id: null,
      title: "Coming soon!",
    };

    // TODO: Add logic for login/completion streaks
    const currentStreak = 0;

    res.status(200).json({
      completed_modules: completedModulesCount,
      earned_achievements: earnedAchievementsCount,
      suggested_next_module: suggestedNextModule,
      current_streak: currentStreak,
    });
  } catch (error) {
    console.error("Error getting user dashboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserTimeline = async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const numericUserId = Number(userId);
  if (Number.isNaN(numericUserId)) {
    return res.status(400).json({ error: "userId must be a number" });
  }

  try {
    const [requests, studyPaths, pendingModules, quizzes, ttsJobs, achievements, recentProgress] =
      await Promise.all([
        pool.query(
          `SELECT id, topic, status, study_path_id, error_message, created_at, completed_at
         FROM study_path_requests
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
          [numericUserId]
        ),
        pool.query(
          `SELECT id, topic, created_at
         FROM study_paths
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
          [numericUserId]
        ),
        pool.query(
          `SELECT m.id, m.study_path_id, m.title, m.description, m.image_url
         FROM study_path_modules m
         JOIN study_paths sp ON sp.id = m.study_path_id
         LEFT JOIN user_module_progress ump ON ump.module_id = m.id AND ump.user_id = $1
         WHERE sp.user_id = $1 AND ump.id IS NULL
         ORDER BY m.id ASC
         LIMIT 20`,
          [numericUserId]
        ),
        pool.query(
          `SELECT q.id, q.module_id, q.title, q.created_at
         FROM quizzes q
         JOIN study_path_modules m ON m.id = q.module_id
         JOIN study_paths sp ON sp.id = m.study_path_id
         WHERE sp.user_id = $1
         ORDER BY q.created_at DESC
         LIMIT 10`,
          [numericUserId]
        ),
        pool.query(
          `SELECT id, module_id, status, audio_url, created_at, completed_at
         FROM tts_jobs
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
          [numericUserId]
        ),
        pool.query(
          `SELECT a.name, a.description, ua.generated_image_url, ua.earned_at
         FROM user_achievements ua
         JOIN achievements a ON a.id = ua.achievement_id
         WHERE ua.user_id = $1
         ORDER BY ua.earned_at DESC
         LIMIT 10`,
          [numericUserId]
        ),
        pool.query(
          `SELECT module_id, completed_at
         FROM user_module_progress
         WHERE user_id = $1
         ORDER BY completed_at DESC
         LIMIT 10`,
          [numericUserId]
        ),
      ]);

    res.status(200).json({
      requests: requests.rows,
      studyPaths: studyPaths.rows,
      pendingModules: pendingModules.rows,
      quizzes: quizzes.rows,
      ttsJobs: ttsJobs.rows,
      achievements: achievements.rows,
      recentProgress: recentProgress.rows,
    });
  } catch (error) {
    console.error("Error building user timeline:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
