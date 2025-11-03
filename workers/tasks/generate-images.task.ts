import { logger as mainLogger } from "../../api/middlewares/logger";
import pool from "../../db";
import { generateImageFromGroq } from "../../services/grokService";

const taskLogger = mainLogger.child({ context: "GenerateImagesTask" });

interface TaskPayload {
  studyPathId: number;
}

export const handleGenerateImages = async (payload: TaskPayload) => {
  const { studyPathId } = payload;
  taskLogger.info({ studyPathId }, `Processing task: Generate images for study path`);

  const client = await pool.connect();
  try {
    taskLogger.info({ studyPathId }, "Fetching modules for image generation.");
    const modulesResult = await client.query(
      "SELECT * FROM study_path_modules WHERE study_path_id = $1",
      [studyPathId]
    );
    const modules = modulesResult.rows;
    taskLogger.info({ studyPathId, moduleCount: modules.length }, `Found ${modules.length} modules.`);

    for (const module of modules) {
      if (!module.image_url) {
        const imagePrompt = `Crea un ícono 3D moderno y tierno para un capítulo titulado "${module.title}". El ícono debe ser simple, limpio y representar el tema del capítulo.`;
        taskLogger.info(
          { moduleId: module.id, prompt: imagePrompt },
          `Generating image for module: "${module.title}"`
        );

        try {
          const imageUrl = await generateImageFromGroq(imagePrompt);
          taskLogger.info({ moduleId: module.id, imageUrl }, "Image generated successfully.");

          await client.query("UPDATE study_path_modules SET image_url = $1 WHERE id = $2", [
            imageUrl,
            module.id,
          ]);
          taskLogger.info({ moduleId: module.id }, "Database updated with new image URL.");

        } catch (e) {
            taskLogger.error({ err: e, moduleId: module.id }, `Failed to generate or save image for module.`);
            // Continue to the next module even if one fails
        }
      } else {
        taskLogger.info({ moduleId: module.id }, `Image for module "${module.title}" already exists. Skipping.`);
      }
    }
    taskLogger.info({ studyPathId }, "Finished image generation task for study path.");
  } catch (error) {
    taskLogger.error({ err: error, studyPathId }, `Failed to process image generation task.`);
    throw error; // Rethrow to let the consumer know the task failed
  } finally {
    client.release();
  }
};
