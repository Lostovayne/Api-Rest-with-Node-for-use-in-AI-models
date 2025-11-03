import { logger as mainLogger } from "../../api/middlewares/logger";
import pool from "../../db";
import { textToSpeech } from "../../services/geminiService";

const taskLogger = mainLogger.child({ context: "TtsTask" });

interface TaskPayload {
  text: string;
  jobId: string;
}

export const handleGenerateTts = async (payload: TaskPayload) => {
  const { text, jobId } = payload;
  taskLogger.info({ jobId }, `Processing task: Generate TTS`);

  try {
    const { audioBase64, mimeType } = await textToSpeech(text);

    await pool.query(
      "UPDATE tts_jobs SET status = 'completed', audio_base64 = $1, mime_type = $2, completed_at = NOW() WHERE id = $3",
      [audioBase64, mimeType, jobId]
    );

    taskLogger.info({ jobId }, `Successfully generated and saved TTS audio.`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    taskLogger.error({ err: error, jobId }, `Failed to generate TTS audio.`);
    
    try {
        await pool.query(
            "UPDATE tts_jobs SET status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2",
            [errorMessage, jobId]
        );
    } catch (dbError) {
        taskLogger.error({ err: dbError, jobId }, `Failed to even update TTS job status to failed.`);
    }

    throw error; // Rethrow original error to let consumer know
  }
};
