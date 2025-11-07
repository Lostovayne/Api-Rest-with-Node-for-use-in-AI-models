import { Request, Response } from "express";
import { rabbitmqConfig } from "../../config/rabbitmq.config";
import pool from "../../db";
import { queueService } from "../../services/queueService";

export const createTtsJob = async (req: Request, res: Response) => {
  try {
    const { text, userId, moduleId } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const numericUserId = userId !== undefined && userId !== null ? Number(userId) : null;
    const numericModuleId = moduleId !== undefined && moduleId !== null ? Number(moduleId) : null;

    if (
      (userId !== undefined && userId !== null && Number.isNaN(numericUserId)) ||
      (moduleId !== undefined && moduleId !== null && Number.isNaN(numericModuleId))
    ) {
      return res.status(400).json({ error: "userId and moduleId must be numbers" });
    }

    const newJob = await pool.query(
      "INSERT INTO tts_jobs (text_content, status, user_id, module_id) VALUES ($1, $2, $3, $4) RETURNING id",
      [text, "pending", numericUserId, numericModuleId]
    );
    const jobId = newJob.rows[0].id;

    const task = {
      taskType: "generateTTS",
      payload: { text, jobId, userId: numericUserId, moduleId: numericModuleId },
    };
    await queueService.sendToQueue(rabbitmqConfig.queues.taskQueue, JSON.stringify(task));

    res.status(202).json({ jobId });
  } catch (error) {
    console.error("Error creating TTS job:", error);
    res.status(500).json({ error: "Error creating TTS job" });
  }
};

export const getTtsJob = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    if (!jobId) {
      return res.status(400).json({ error: "Job ID is required" });
    }

    const result = await pool.query("SELECT * FROM tts_jobs WHERE id = $1", [jobId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    const job = result.rows[0];

    // Do not send the full base64 string if not completed
    if (job.status !== "completed") {
      return res.status(200).json({
        jobId: job.id,
        status: job.status,
        createdAt: job.created_at,
      });
    }

    res.status(200).json({
      jobId: job.id,
      status: job.status,
      createdAt: job.created_at,
      completedAt: job.completed_at,
      audioUrl: job.audio_url,
      moduleId: job.module_id,
      userId: job.user_id,
    });
  } catch (error) {
    console.error(`Error getting TTS job ${req.params.jobId}:`, error);
    res.status(500).json({ error: "Error getting TTS job" });
  }
};

export const listTtsJobs = async (req: Request, res: Response) => {
  const { userId, moduleId, status } = req.query;

  const numericUserId = typeof userId === "string" ? Number(userId) : undefined;
  if (userId && (numericUserId === undefined || Number.isNaN(numericUserId))) {
    return res.status(400).json({ error: "userId must be a number" });
  }

  const numericModuleId = typeof moduleId === "string" ? Number(moduleId) : undefined;
  if (moduleId && (numericModuleId === undefined || Number.isNaN(numericModuleId))) {
    return res.status(400).json({ error: "moduleId must be a number" });
  }

  const filters: string[] = [];
  const values: any[] = [];

  if (numericUserId !== undefined) {
    values.push(numericUserId);
    filters.push(`user_id = $${values.length}`);
  }

  if (numericModuleId !== undefined) {
    values.push(numericModuleId);
    filters.push(`module_id = $${values.length}`);
  }

  if (status) {
    values.push(status);
    filters.push(`status = $${values.length}`);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

  try {
    const result = await pool.query(
      `SELECT id, status, text_content, user_id, module_id, audio_url, error_message, created_at, completed_at
       FROM tts_jobs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT 50`,
      values
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error listing TTS jobs:", error);
    res.status(500).json({ error: "Error listing TTS jobs" });
  }
};
