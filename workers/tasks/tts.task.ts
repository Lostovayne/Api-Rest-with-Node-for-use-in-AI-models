import { logger as mainLogger } from "../../api/middlewares/logger";
import pool from "../../db";
import { textToSpeech } from "../../services/geminiService";
import { uploadAudioBlob } from "../../services/blobService";

const taskLogger = mainLogger.child({ context: "TtsTask" });

// Function to create a WAV header
function createWavHeader(dataLength: number, sampleRate: number, channels: number, bitDepth: number): Buffer {
    const buffer = Buffer.alloc(44);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataLength, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * channels * (bitDepth / 8), 28);
    buffer.writeUInt16LE(channels * (bitDepth / 8), 32);
    buffer.writeUInt16LE(bitDepth, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataLength, 40);
    return buffer;
}

interface TaskPayload {
  text: string;
  jobId: string;
}

export const handleGenerateTts = async (payload: TaskPayload) => {
  const { text, jobId } = payload;
  taskLogger.info({ jobId }, `Processing task: Generate TTS`);

  try {
    const { audioBase64, mimeType } = await textToSpeech(text);

    // Decode base64 and create WAV file
    const audioData = Buffer.from(audioBase64, 'base64');
    const sampleRate = 24000; // From Gemini's mimeType: audio/L16;rate=24000
    const bitDepth = 16;       // From Gemini's mimeType: L16
    const channels = 1;        // Mono is standard for TTS

    const wavHeader = createWavHeader(audioData.length, sampleRate, channels, bitDepth);
    const wavBuffer = Buffer.concat([wavHeader, audioData]);

    const filename = `tts-${jobId}.wav`;
    const wavMimeType = 'audio/wav';

    const blob = await uploadAudioBlob(filename, wavBuffer, wavMimeType);
    const audioUrl = blob.url;

    await pool.query(
      "UPDATE tts_jobs SET status = 'completed', audio_url = $1, completed_at = NOW() WHERE id = $2",
      [audioUrl, jobId]
    );

    taskLogger.info({ jobId, audioUrl }, `Successfully generated and saved TTS audio to Vercel Blob.`);

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
