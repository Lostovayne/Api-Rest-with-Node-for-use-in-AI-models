import { logger as mainLogger } from "../../api/middlewares/logger";
import pool from "../../db";
import { generateEmbedding, generateStructuredText } from "../../services/geminiService";
import { Type } from "@google/genai";
import { typesenseService } from "../../services/typesenseService";

const taskLogger = mainLogger.child({ context: "GenerateStudyPathTask" });

// Define the schema for the study path response
const studyPathSchema = {
  type: Type.OBJECT,
  properties: {
    studyPath: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          subtopics: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["title", "description", "subtopics"],
      },
    },
  },
  required: ["studyPath"],
};

interface TaskPayload {
  topic: string;
}

export const handleGenerateStudyPath = async (payload: TaskPayload) => {
  const { topic } = payload;
  taskLogger.info({ topic }, `Processing task: Generate study path`);

  try {
    const prompt = `Crea una ruta de estudio detallada, paso a paso, para aprender ${topic}. 
        La ruta debe ser adecuada para un principiante y debe incluir los temas principales, subtemas y una breve descripción de cada uno.`;

    const result = await generateStructuredText(prompt, studyPathSchema);

    const jsonResponse = JSON.parse(result);

    const client = await pool.connect();
    const modulesToIndex = []; // Array to hold modules for indexing
    try {
      await client.query("BEGIN");
      const studyPathResult = await client.query(
        "INSERT INTO study_paths (topic) VALUES ($1) RETURNING id",
        [topic]
      );
      const studyPathId = studyPathResult.rows[0].id;

      for (const module of jsonResponse.studyPath) {
        const textToEmbed = `Title: ${module.title}\nDescription: ${
          module.description
        }\nSubtopics: ${module.subtopics.join(", ")}`;
        const embedding = await generateEmbedding(textToEmbed);

        const insertedModule = await client.query(
          "INSERT INTO study_path_modules (study_path_id, title, description, subtopics, embedding) VALUES ($1, $2, $3, $4, $5) RETURNING id, title, description, subtopics, image_url",
          [studyPathId, module.title, module.description, module.subtopics, `[${embedding.join(",")}]`]
        );

        modulesToIndex.push({
            ...insertedModule.rows[0],
            study_path_id: studyPathId,
        });
      }

      await client.query("COMMIT");
      taskLogger.info({ topic, studyPathId }, `Successfully generated and saved study path.`);

      // Index modules in Typesense after successful commit
      for (const module of modulesToIndex) {
        await typesenseService.indexModule(module as any);
      }

    } catch (e) {
      await client.query("ROLLBACK");
      taskLogger.error({ err: e, topic }, `Failed to save study path to DB.`);
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    taskLogger.error({ err: error, topic }, `Failed to generate study path.`);
    throw error;
  }
};