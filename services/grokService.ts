import { generateImageFromGemini } from "./imageGenerationService";

/**
 * @deprecated Este metodo mantiene compatibilidad con el nombre antiguo pero ahora usa Gemini.
 *             Migra tus importaciones a `generateImageFromGemini` para un control mas preciso.
 */
export const generateImageFromGroq = async (prompt: string): Promise<string> => {
  console.warn(
    "generateImageFromGroq esta deprecado y delega en Gemini. Actualiza el codigo para usar generateImageFromGemini."
  );
  return generateImageFromGemini(prompt, { filenamePrefix: "legacy-grok-image" });
};
