import { randomUUID } from "crypto";
import { uploadImageBlob } from "./blobService";
import { getGenAI } from "./geminiService";

const IMAGE_MODELS = ["imagen-4.0-generate-001", "gemini-2.5-flash-image"];
const BASE_PROMPT_PREFIX =
  "Genera un icono 3D moderno y tierno en PNG, con alto detalle, bordes suaves, acabado tipo vinilo y fondo blanco puro (#FFFFFF) sin degradados ni elementos adicionales. ";

const sanitizeFilenamePart = (value?: string | null) =>
  value
    ? value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    : null;

interface GenerateImageOptions {
  filenamePrefix?: string;
  aspectRatio?: string;
}

export const generateImageFromGemini = async (
  prompt: string,
  options: GenerateImageOptions = {}
): Promise<string> => {
  const ai = getGenAI();
  const aspectRatio = options.aspectRatio ?? "1:1";
  const finalPrompt = `${BASE_PROMPT_PREFIX}${prompt}`;

  let lastError: unknown = null;

  for (const model of IMAGE_MODELS) {
    try {
      const response = await ai.models.generateImages({
        model,
        prompt: finalPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/png",
          aspectRatio,
        },
      });

      const generatedImage = response.generatedImages?.[0];
      const imageBytes = (generatedImage?.image as any)?.imageBytes as string | undefined;
      if (!imageBytes) {
        throw new Error("La respuesta de Gemini no incluyó datos de imagen.");
      }

      const buffer = Buffer.from(imageBytes, "base64");
      const prefix = sanitizeFilenamePart(options.filenamePrefix) ?? "ai-image";
      const filename = `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}.png`;
      const blob = await uploadImageBlob(filename, buffer, "image/png");
      return blob.url;
    } catch (error) {
      lastError = error;
      console.warn(`Fallo al generar imagen con el modelo ${model}:`, error);
    }
  }

  const errorMessage =
    lastError instanceof Error
      ? `No se pudo generar imagen con Gemini: ${lastError.message}`
      : "No se pudo generar imagen con Gemini.";
  throw new Error(errorMessage);
};
