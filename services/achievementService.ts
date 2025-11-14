import pool from "../db";
import { generateImageFromGemini } from "./imageGenerationService";

// Function to check for and award achievements based on module completions
export const checkModuleCompletionAchievements = async (userId: number) => {
  try {
    // 1. Get user's completed module count
    const progressResult = await pool.query(
      "SELECT COUNT(*) FROM user_module_progress WHERE user_id = $1",
      [userId]
    );
    const completedCount = parseInt(progressResult.rows[0].count, 10);

    // 2. Get module completion achievements the user hasn't earned yet
    const achievementsToAward = await pool.query(
      `SELECT a.id, a.name, a.icon_prompt, a.milestone_value
       FROM achievements a
       LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
       WHERE a.milestone_type = 'MODULE_COMPLETION' AND ua.id IS NULL`,
      [userId]
    );

    const newlyAwarded = [];

    for (const achievement of achievementsToAward.rows) {
      if (completedCount >= achievement.milestone_value) {
        // User has earned this achievement

        // Generate image with grokService
        const imageUrl = await generateImageFromGemini(achievement.icon_prompt, {
          filenamePrefix: `achievement-${achievement.id}-user-${userId}`,
        });

        // 3. Insert into user_achievements
        const newUserAchievement = await pool.query(
          "INSERT INTO user_achievements (user_id, achievement_id, generated_image_url) VALUES ($1, $2, $3) RETURNING *",
          [userId, achievement.id, imageUrl]
        );

        newlyAwarded.push({
          name: achievement.name,
          imageUrl: imageUrl,
        });
      }
    }

    return newlyAwarded;
  } catch (error) {
    console.error("Error checking for achievements:", error);
    return [];
  }
};
