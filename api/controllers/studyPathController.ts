import { Request, Response } from "express";
import pool from "../../db";
import { generateText, generateEmbedding } from "../../services/geminiService";
import { generateImageFromGroq } from "../../services/grokService";

export const createStudyPath = async (req: Request, res: Response) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "El tema es requerido" });
    }

    const prompt = `Crea una ruta de estudio detallada, paso a paso, para aprender ${topic}. 
        La ruta debe ser adecuada para un principiante y debe incluir los temas principales, subtemas y una breve descripción de cada uno.
        Por favor, formatea la salida como un objeto JSON con una clave "studyPath", que es un array de objetos, cada uno con las claves "title", "description" y "subtopics" (un array de strings).`;

    const result = await generateText(prompt);

    const cleanedResult = result
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      const jsonResponse = JSON.parse(cleanedResult);

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const studyPathResult = await client.query(
          "INSERT INTO study_paths (topic) VALUES ($1) RETURNING id",
          [topic]
        );
        const studyPathId = studyPathResult.rows[0].id;

        for (const module of jsonResponse.studyPath) {
          // Create a single text block for embedding
          const textToEmbed = `Title: ${module.title}\nDescription: ${module.description}\nSubtopics: ${module.subtopics.join(', ')}`;

          // Generate the embedding
          const embedding = await generateEmbedding(textToEmbed);

          await client.query(
            "INSERT INTO study_path_modules (study_path_id, title, description, subtopics, embedding) VALUES ($1, $2, $3, $4, $5)",
            [studyPathId, module.title, module.description, module.subtopics, `[${embedding.join(',')}]`]
          );
        }

        await client.query("COMMIT");
        res.status(201).json({ studyPathId });
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    } catch (e) {
      req.log.error(e, "Error al parsear JSON del modelo o guardar en DB:");
      res
        .status(500)
        .json({
          error: "Error al parsear la ruta de estudio del modelo o guardarla en la base de datos",
        });
    }
  } catch (error) {
    req.log.error(error, "Error al generar la ruta de estudio");
    res.status(500).json({ error: "Error al generar la ruta de estudio" });
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
