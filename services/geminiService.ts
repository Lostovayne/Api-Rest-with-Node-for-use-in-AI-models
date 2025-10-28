import {
  Chat,
  FunctionDeclaration,
  GenerateContentResponse,
  GoogleGenAI,
  Modality,
  Type,
} from "@google/genai";

const getGenAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("La variable de entorno API_KEY no está configurada");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateText = async (prompt: string): Promise<string> => {
  const ai = getGenAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });
  return response.text ?? "";
};

export const generateEmbedding = async (text: string): Promise<number[]> => {
  const ai = getGenAI();
  const response = await ai.models.embedContent({
    model: "text-embedding-004",
    content: text,
  });
  return response.embedding.values;
};

export const analyzeImage = async (
  prompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> => {
  const ai = getGenAI();
  const imagePart = {
    inlineData: {
      mimeType,
      data: imageBase64,
    },
  };
  const textPart = { text: prompt };
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts: [imagePart, textPart] },
  });
  return response.text ?? "";
};

export const generateImage = async (prompt: string): Promise<string> => {
  const ai = getGenAI();
  const response = await ai.models.generateImages({
    model: "imagen-4.0-generate-001",
    prompt: `A modern and cute 3D icon, simple, clean, high quality. ${prompt}`,
    config: {
      numberOfImages: 1,
      outputMimeType: "image/png",
      aspectRatio: "1:1",
    },
  });
  const { generatedImages } = response;
  if (!generatedImages || generatedImages.length === 0) {
    throw new Error("No se generaron imágenes.");
  }
  const base64ImageBytes = (generatedImages[0].image as any).imageBytes;
  return `data:image/png;base64,${base64ImageBytes}`;
};

export const textToSpeech = async (prompt: string): Promise<{ audioBase64: string; mimeType: string }> => {
  const ai = getGenAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: "Kore" },
        },
      },
    },
  });
  const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!inlineData?.data || !inlineData?.mimeType) {
    throw new Error("No se recibieron datos de audio válidos de la API.");
  }
  return { audioBase64: inlineData.data, mimeType: inlineData.mimeType };
};

const taskToolDeclarations: FunctionDeclaration[] = [
  {
    name: "add_task",
    parameters: {
      type: Type.OBJECT,
      description: "Añade una nueva tarea a la lista de tareas del usuario.",
      properties: {
        task: { type: Type.STRING, description: "La tarea a añadir." },
      },
      required: ["task"],
    },
  },
  {
    name: "get_tasks",
    parameters: {
      type: Type.OBJECT,
      description: "Obtiene una lista de las tareas del usuario, opcionalmente filtrando por estado.",
      properties: {
        status: {
          type: Type.STRING,
          description: "El estado por el cual filtrar (por ejemplo, 'pendiente', 'completado').",
        },
      },
    },
  },
  {
    name: "update_task_status",
    parameters: {
      type: Type.OBJECT,
      description: "Actualiza el estado de una tarea específica.",
      properties: {
        taskId: { type: Type.NUMBER, description: "El ID de la tarea a actualizar." },
        status: { type: Type.STRING, description: "El nuevo estado para la tarea." },
      },
      required: ["taskId", "status"],
    },
  },
  {
    name: "get_daily_recommendations",
    parameters: {
      type: Type.OBJECT,
      description: "Obtiene recomendaciones sobre qué aprender o hacer hoy, basado en las tareas pendientes del usuario.",
      properties: {},
    },
  },
];

export const useTools = async (prompt: string): Promise<GenerateContentResponse> => {
  const ai = getGenAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      tools: [{ functionDeclarations: taskToolDeclarations }],
    },
  });
  return response;
};

export const createChat = (): Chat => {
  const ai = getGenAI();
  return ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: "Eres un chatbot útil y amigable.",
    },
  });
};

export const groundWithSearch = async (prompt: string): Promise<GenerateContentResponse> => {
  const ai = getGenAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
  return response;
};

export const generateVideo = async (prompt: string) => {
  const ai = getGenAI();
  const operation = await ai.models.generateVideos({
    model: "veo-3.1-fast-generate-preview",
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: "720p",
      aspectRatio: "16:9",
    },
  });
  return operation;
};

export const checkVideoOperation = async (operation: any) => {
  const ai = getGenAI();
  return await ai.operations.getVideosOperation({ operation });
};

export const connectLive = (callbacks: any): Promise<any> => {
  const ai = getGenAI();
  return ai.live.connect({
    model: "gemini-2.5-flash-native-audio-preview-09-2025",
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
      },
      systemInstruction:
        "Eres una IA conversacional amigable y útil. Mantén tus respuestas concisas.",
    },
  });
};
