import { Request, Response } from 'express';
import pool from '../../db';
import { checkModuleCompletionAchievements } from '../../services/achievementService';

export const completeModule = async (req: Request, res: Response) => {
  const { userId, moduleId } = req.body; // Assuming userId and moduleId are sent in the body

  if (!userId || !moduleId) {
    return res.status(400).json({ error: 'userId and moduleId are required' });
  }

  try {
    // Insert into user_module_progress
    const result = await pool.query(
      'INSERT INTO user_module_progress (user_id, module_id) VALUES ($1, $2) RETURNING *',
      [userId, moduleId]
    );

    // Check for achievements and award them
    const newlyAwarded = await checkModuleCompletionAchievements(userId);

    res.status(201).json({
      message: 'Module marked as complete',
      progress: result.rows[0],
      newly_awarded_achievements: newlyAwarded,
    });
  } catch (e) {
    const error = e as any;
    console.error('Error completing module:', error);
    // Handle potential unique constraint violation if the user already completed the module
    if (error.code === '23505') { // unique_violation
        return res.status(409).json({ error: 'Module already marked as complete' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserProgress = async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // Get completed modules
    const completedModules = await pool.query(
      'SELECT module_id, completed_at FROM user_module_progress WHERE user_id = $1',
      [userId]
    );

    // Get earned achievements
    const earnedAchievements = await pool.query(
      `SELECT a.name, a.description, ua.earned_at, ua.generated_image_url
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1`,
      [userId]
    );

    res.status(200).json({
      completed_modules_count: completedModules.rows.length,
      completed_modules: completedModules.rows,
      achievements_count: earnedAchievements.rows.length,
      achievements: earnedAchievements.rows,
    });
  } catch (error) {
    console.error('Error getting user progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserDashboard = async (req: Request, res: Response) => {
    const { userId } = req.params;
  
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
  
    try {
      // Get completed modules count
      const completedModulesResult = await pool.query(
        'SELECT COUNT(*) FROM user_module_progress WHERE user_id = $1',
        [userId]
      );
      const completedModulesCount = parseInt(completedModulesResult.rows[0].count, 10);
  
      // Get earned achievements count
      const earnedAchievementsResult = await pool.query(
        'SELECT COUNT(*) FROM user_achievements WHERE user_id = $1',
        [userId]
      );
      const earnedAchievementsCount = parseInt(earnedAchievementsResult.rows[0].count, 10);
  
      // TODO: Add logic for suggested next module
      const suggestedNextModule = {
          id: null,
          title: "Coming soon!"
      };
  
      // TODO: Add logic for login/completion streaks
      const currentStreak = 0;
  
      res.status(200).json({
        completed_modules: completedModulesCount,
        earned_achievements: earnedAchievementsCount,
        suggested_next_module: suggestedNextModule,
        current_streak: currentStreak
      });
    } catch (error) {
      console.error('Error getting user dashboard:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };