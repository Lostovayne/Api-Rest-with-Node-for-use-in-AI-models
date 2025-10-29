import pool from '../../db';
import { generateText, generateEmbedding } from '../../services/geminiService';
import { logger as mainLogger } from '../../api/middlewares/logger';

const taskLogger = mainLogger.child({ context: 'GenerateStudyPathTask' });

interface TaskPayload {
  topic: string;
}

export const handleGenerateStudyPath = async (payload: TaskPayload) => {
  const { topic } = payload;
  taskLogger.info({ topic }, `Processing task: Generate study path`);

  try {
    const prompt = `Crea una ruta de estudio detallada, paso a paso, para aprender ${topic}. 
        La ruta debe ser adecuada para un principiante y debe incluir los temas principales, subtemas y una breve descripción de cada uno.
        Por favor, formatea la salida como un objeto JSON con una clave "studyPath", que es un array de objetos, cada uno con las claves "title", "description" y "subtopics" (un array de strings).`;

    const result = await generateText(prompt);

    const cleanedResult = result
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

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
        const textToEmbed = `Title: ${module.title}\nDescription: ${module.description}\nSubtopics: ${module.subtopics.join(', ')}`;
        const embedding = await generateEmbedding(textToEmbed);

        await client.query(
          "INSERT INTO study_path_modules (study_path_id, title, description, subtopics, embedding) VALUES ($1, $2, $3, $4, $5)",
          [studyPathId, module.title, module.description, module.subtopics, `[${embedding.join(',')}]`]
        );
      }

      await client.query("COMMIT");
      taskLogger.info({ topic, studyPathId }, `Successfully generated and saved study path.`);
      
      // TODO: Here we could trigger another task, e.g., to generate images for the new modules
      // queueService.sendToQueue('image_generation_queue', JSON.stringify({ studyPathId }));

    } catch (e) {
      await client.query("ROLLBACK");
      taskLogger.error({ err: e, topic }, `Failed to save study path to DB.`);
      throw e; // Re-throw to let the consumer know the task failed
    } finally {
      client.release();
    }
  } catch (error) {
    taskLogger.error({ err: error, topic }, `Failed to generate study path.`);
    throw error; // Re-throw to let the consumer know the task failed
  }
};
