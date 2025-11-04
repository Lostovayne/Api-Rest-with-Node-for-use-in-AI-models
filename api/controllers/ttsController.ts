import { Request, Response } from 'express';
import { queueService } from '../../services/queueService';
import { rabbitmqConfig } from '../../config/rabbitmq.config';
import pool from '../../db';

export const createTtsJob = async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    // 1. Create a job entry in the database
    const newJob = await pool.query(
      'INSERT INTO tts_jobs (text_content, status) VALUES ($1, $2) RETURNING id',
      [text, 'pending']
    );
    const jobId = newJob.rows[0].id;

    // 2. Queue the task
    const task = {
      taskType: "generateTTS",
      payload: { text, jobId },
    };
    await queueService.sendToQueue(rabbitmqConfig.queues.taskQueue, JSON.stringify(task));

    // 3. Respond with the job ID
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

        const result = await pool.query('SELECT * FROM tts_jobs WHERE id = $1', [jobId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Job not found" });
        }

        const job = result.rows[0];

        // Do not send the full base64 string if not completed
        if (job.status !== 'completed') {
            return res.status(200).json({ 
                jobId: job.id, 
                status: job.status, 
                createdAt: job.created_at 
            });
        }

        res.status(200).json({
            jobId: job.id,
            status: job.status,
            createdAt: job.created_at,
            completedAt: job.completed_at,
            audioUrl: job.audio_url
        });

    } catch (error) {
        console.error(`Error getting TTS job ${req.params.jobId}:`, error);
        res.status(500).json({ error: "Error getting TTS job" });
    }
};