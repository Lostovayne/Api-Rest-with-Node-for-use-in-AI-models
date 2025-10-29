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
    req.log.info(`Solicitud recibida para generar imágenes para studyPathId: ${studyPathId}`);

    if (!studyPathId) {
      return res.status(400).json({ error: "El studyPathId es requerido" });
    }

    const client = await pool.connect();
    try {
      req.log.info("Consultando módulos...");
      const modulesResult = await client.query(
        "SELECT * FROM study_path_modules WHERE study_path_id = $1",
        [studyPathId]
      );
      const modules = modulesResult.rows;
      req.log.info(`Se encontraron ${modules.length} módulos.`);

      for (const module of modules) {
        if (!module.image_url) {
          const imagePrompt = `Crea un ícono 3D moderno y tierno para un capítulo titulado "${module.title}". El ícono debe ser simple, limpio y representar el tema del capítulo.`;
          req.log.info(
            `Generando imagen para el módulo: "${module.title}" con el prompt: "${imagePrompt}"`
          );

          const imageUrl = await generateImageFromGroq(imagePrompt);
          req.log.info(`URL de la imagen generada: ${imageUrl}`);

          req.log.info(`Actualizando la base de datos para el módulo ID: ${module.id}`);
          await client.query("UPDATE study_path_modules SET image_url = $1 WHERE id = $2", [
            imageUrl,
            module.id,
          ]);
          req.log.info("Base de datos actualizada correctamente.");
        } else {
          req.log.info(`La imagen para el módulo "${module.title}" ya existe. Omitiendo.`);
        }
      }

      res.json({ message: "Imágenes generadas y actualizadas correctamente" });
    } finally {
      client.release();
    }
  } catch (error) {
    req.log.error(error, "Error en /generate-images-for-path:");
    res.status(500).json({ error: "Error al generar las imágenes para la ruta de estudio" });
  }
};
