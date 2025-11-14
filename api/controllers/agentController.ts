import { FunctionCall } from "@google/genai"; // Import FunctionCall
import { Request, Response } from "express";
import { groundWithSearch, useTools } from "../../services/geminiService"; // Import groundWithSearch
import {
  addTask,
  getDailyRecommendations,
  getTasks,
  updateTaskStatus,
} from "../../services/taskService"; // Import getDailyRecommendations

export const agentController = async (req: Request, res: Response) => {
  try {
    const { prompt, userId: rawUserId } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "El prompt es requerido" });
    }
    const numericUserId = typeof rawUserId === "number" ? rawUserId : Number(rawUserId);
    const validUserId =
      Number.isFinite(numericUserId) && numericUserId > 0 ? numericUserId : undefined;
    const result = await useTools(prompt);

    const candidate = result.candidates?.[0];
    const part = candidate?.content?.parts?.[0];

    if (!part) {
      return res
        .status(500)
        .json({ error: "No se recibió una respuesta válida del modelo" });
    }

    const { functionCall, text } = part;

    if (functionCall) {
      let toolResult;
      // Type assertion for functionCall to FunctionCall
      const call = functionCall as FunctionCall;

      switch (call.name) {
        case "add_task":
          // Ensure args and task property exist
          if (call.args && typeof call.args.task === "string") {
            toolResult = await addTask(call.args.task, validUserId);
          } else {
            req.log.error(call.args, "Argumentos inválidos para add_task");
            return res.status(400).json({ error: "Argumentos inválidos para add_task" });
          }
          break;
        case "get_tasks":
          // Ensure args and status property exist, or status is undefined
          if (
            call.args &&
            (typeof call.args.status === "string" || call.args.status === undefined)
          ) {
            toolResult = await getTasks(call.args.status, validUserId);
          } else {
            req.log.error(call.args, "Argumentos inválidos para get_tasks");
            return res.status(400).json({ error: "Argumentos inválidos para get_tasks" });
          }
          break;
        case "update_task_status":
          // Ensure args, taskId, and status properties exist
          if (
            call.args &&
            typeof call.args.taskId === "number" &&
            typeof call.args.status === "string"
          ) {
            toolResult = await updateTaskStatus(call.args.taskId, call.args.status);
          } else {
            req.log.error(call.args, "Argumentos inválidos para update_task_status");
            return res
              .status(400)
              .json({ error: "Argumentos inválidos para update_task_status" });
          }
          break;
        case "get_daily_recommendations": // New case for the new tool
          const { tasks, timeOfDay } = await getDailyRecommendations(validUserId);
          let recommendationPrompt: string;

          if (tasks.length === 0) {
            recommendationPrompt = `Eres un asistente de estudio. El usuario no tiene tareas pendientes. Recomiéndale que añada nuevas metas o que disfrute de su tiempo libre.`;
          } else {
            recommendationPrompt = `Eres un asistente de estudio y productividad. Es la ${timeOfDay}. El usuario tiene las siguientes tareas pendientes: ${tasks.join(
              ", "
            )}.\n            Basado en estas tareas, genera una recomendación detallada y motivadora para el día.\n            Considera la hora del día para dar consejos contextuales (ej. "es la mañana, empieza con esto").\n            Sugiere cómo abordar las tareas, si dividirlas, priorizar, o qué estudiar primero.\n            Si es relevante, usa la herramienta de búsqueda de Google para obtener información actualizada sobre los temas de las tareas (ej. "aprender Docker", "React 19.2") y menciona su relevancia actual o recomendaciones de estudio.\n            Mantén un tono amigable y alentador.`;
          }

          const recommendationResult = await groundWithSearch(recommendationPrompt);
          toolResult = recommendationResult.text; // Get the text response from the model
          break;
        default:
          return res.status(400).json({ error: `Herramienta desconocida: ${call.name}` });
      }
      res.json({ toolResult });
    } else if (text) {
      res.json({ text });
    } else {
      res.status(500).json({ error: "No se recibió una respuesta válida del modelo" });
    }
  } catch (error) {
    req.log.error(error, "El agente no pudo procesar la solicitud");
    res.status(500).json({ error: "El agente no pudo procesar la solicitud" });
  }
};
