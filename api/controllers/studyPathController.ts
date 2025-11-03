import { Request, Response } from "express";
import pool from "../../db";
import { queueService } from "../../services/queueService";
import { rabbitmqConfig } from "../../config/rabbitmq.config";
import { generateImageFromGroq } from "../../services/grokService";

export const createStudyPath = async (req: Request, res: Response) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "El tema es requerido" });
    }

    // Define the task payload
    const task = {
      taskType: 'generateStudyPath',
      payload: { topic },
    };

    // Send the task to the queue
    await queueService.sendToQueue(rabbitmqConfig.queues.taskQueue, JSON.stringify(task));

    // Respond immediately to the user
    res.status(202).json({ 
      message: "Solicitud para generar la ruta de estudio ha sido encolada.",
      topic: topic 
    });

  } catch (error) {
    req.log.error(error, "Error al encolar la generación de la ruta de estudio");
    res.status(500).json({ error: "Error al encolar la generación de la ruta de estudio" });
  }
};

export const getStudyPath = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      const result = await client.query("SELECT * FROM study_path_modules WHERE study_path_id = $1", [
        id,
      ]);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    req.log.error(error, "Error al obtener la ruta de estudio");
    res.status(500).json({ error: "Error al obtener la ruta de estudio" });
  }
};

export const getStudyPathModule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      const result = await client.query("SELECT * FROM study_path_modules WHERE id = $1", [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Módulo no encontrado" });
      }
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    req.log.error(error, "Error al obtener el módulo de la ruta de estudio");
    res.status(500).json({ error: "Error al obtener el módulo de la ruta de estudio" });
  }
};

export const generateImagesForPath = async (req: Request, res: Response) => {
  try {
    const { studyPathId } = req.body;
    req.log.info(`Request received to generate images for studyPathId: ${studyPathId}`);

    if (!studyPathId) {
      return res.status(400).json({ error: "studyPathId is required" });
    }

    const task = {
      taskType: "generateImages",
      payload: { studyPathId },
    };

    await queueService.sendToQueue(rabbitmqConfig.queues.taskQueue, JSON.stringify(task));

    res.status(202).json({ message: "Image generation task has been queued." });

  } catch (error) {
    req.log.error(error, "Error queueing image generation task");
    res.status(500).json({ error: "Error queueing image generation task" });
  }
};
