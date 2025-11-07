import { Request, Response } from "express";
import { rabbitmqConfig } from "../../config/rabbitmq.config";
import pool from "../../db";
import { queueService } from "../../services/queueService";

export const createStudyPath = async (req: Request, res: Response) => {
  try {
    const { topic, userId } = req.body;
    const numericUserId = Number(userId);

    if (!topic || Number.isNaN(numericUserId)) {
      return res.status(400).json({ error: "topic and userId are required" });
    }

    const client = await pool.connect();
    let requestId: string;
    try {
      const requestInsert = await client.query(
        "INSERT INTO study_path_requests (user_id, topic) VALUES ($1, $2) RETURNING id",
        [numericUserId, topic]
      );
      requestId = requestInsert.rows[0].id;
    } finally {
      client.release();
    }

    const task = {
      taskType: "generateStudyPath",
      payload: { topic, userId: numericUserId, requestId },
    };

    // Send the task to the queue
    await queueService.sendToQueue(rabbitmqConfig.queues.taskQueue, JSON.stringify(task));

    // Respond immediately to the user
    res.status(202).json({
      message: "Solicitud para generar la ruta de estudio ha sido encolada.",
      topic,
      requestId,
    });
  } catch (error) {
    req.log.error(error, "Error al encolar la generación de la ruta de estudio");
    res.status(500).json({ error: "Error al encolar la generación de la ruta de estudio" });
  }
};

export const getStudyPathRequest = async (req: Request, res: Response) => {
  const { requestId } = req.params;

  if (!requestId) {
    return res.status(400).json({ error: "requestId is required" });
  }

  const client = await pool.connect();
  try {
    const requestResult = await client.query(
      "SELECT id, user_id, topic, status, study_path_id, error_message, created_at, completed_at FROM study_path_requests WHERE id = $1",
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: "Request not found" });
    }

    const requestRow = requestResult.rows[0];

    if (!requestRow.study_path_id) {
      return res.status(200).json({ request: requestRow });
    }

    const modulesResult = await client.query(
      "SELECT id, study_path_id, title, description, subtopics, image_url FROM study_path_modules WHERE study_path_id = $1 ORDER BY id ASC",
      [requestRow.study_path_id]
    );

    return res.status(200).json({ request: requestRow, modules: modulesResult.rows });
  } catch (error) {
    req.log.error(error, "Error al obtener la solicitud de ruta de estudio");
    return res.status(500).json({ error: "Error al obtener la solicitud de ruta de estudio" });
  } finally {
    client.release();
  }
};

export const listStudyPaths = async (req: Request, res: Response) => {
  const { userId } = req.query;
  const parsedUserId = typeof userId === "string" ? Number(userId) : undefined;
  if (userId && (parsedUserId === undefined || Number.isNaN(parsedUserId))) {
    return res.status(400).json({ error: "userId must be a number" });
  }

  const client = await pool.connect();
  try {
    if (parsedUserId !== undefined) {
      const result = await client.query(
        "SELECT id, user_id, topic, created_at FROM study_paths WHERE user_id = $1 ORDER BY created_at DESC",
        [parsedUserId]
      );
      return res.status(200).json(result.rows);
    }

    const result = await client.query(
      "SELECT id, user_id, topic, created_at FROM study_paths ORDER BY created_at DESC"
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    req.log.error(error, "Error al listar rutas de estudio");
    return res.status(500).json({ error: "Error al listar rutas de estudio" });
  } finally {
    client.release();
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
