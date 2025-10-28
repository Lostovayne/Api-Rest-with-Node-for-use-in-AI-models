import OpenAI from "openai";

export const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

export const generateImageFromGroq = async (prompt: string): Promise<string> => {
  const response = await client.images.generate({
    model: "grok-2-image",
    prompt: `Un ícono 3D moderno y tierno, simple, limpio, de alta calidad, en formato PNG con fondo transparente. ${prompt}`,
    n: 1,
  });

  if (!response.data || response.data.length === 0) {
    throw new Error("No se generaron imágenes.");
  }

  const imageUrl = response.data[0].url;
  if (!imageUrl) {
    throw new Error("No se encontró URL de imagen en la respuesta");
  }
  return imageUrl;
};
