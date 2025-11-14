import { FunctionCall } from "@google/genai";
import { Request, Response } from "express";
import { groundWithSearch, useTools } from "../../services/geminiService";
import { createJournalEntry } from "../../services/journalService";
import { createMoodSnapshot } from "../../services/moodService";
import {
  addTask,
  getDailyRecommendations,
  getTasks,
  updateTaskStatus,
} from "../../services/taskService";

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
      req.log.error({ candidate }, "Respuesta inválida del modelo");
      return res.status(500).json({ error: "El agente no generó respuesta" });
    }

    const { functionCall, text } = part;

    if (functionCall) {
      const call = functionCall as FunctionCall;
      const args = (call.args ?? {}) as Record<string, unknown>;
      let toolResult: unknown;

      switch (call.name) {
        case "add_task": {
          const task = typeof args.task === "string" ? args.task : undefined;
          if (!task) {
            return res.status(400).json({ error: "task requerido para add_task" });
          }
          toolResult = await addTask(task, validUserId);
          break;
        }
        case "get_tasks": {
          const status = typeof args.status === "string" ? args.status : undefined;
          toolResult = await getTasks(status, validUserId);
          break;
        }
        case "update_task_status": {
          const taskId = Number(args.taskId);
          const status = typeof args.status === "string" ? args.status : undefined;
          if (!Number.isFinite(taskId) || !status) {
            return res
              .status(400)
              .json({ error: "taskId y status requeridos para update_task_status" });
          }
          toolResult = await updateTaskStatus(taskId, status);
          break;
        }
        case "get_daily_recommendations": {
          const { tasks, timeOfDay } = await getDailyRecommendations(validUserId);
          const recommendationPrompt =
            tasks.length === 0
              ? "Eres un asistente de estudio. El usuario no tiene tareas pendientes. Ofrece recomendaciones para aprovechar el tiempo o planear nuevas metas."
              : `Eres un asistente de estudio. Es la ${timeOfDay}. El usuario tiene estas tareas: ${tasks.join(
                  ", "
                )}. Entrega una recomendación motivadora y accionable.`;

          const recommendationResult = await groundWithSearch(recommendationPrompt);
          toolResult = recommendationResult.text;
          break;
        }
        case "log_mood_snapshot": {
          const moodUserId =
            typeof args.userId === "number" ? (args.userId as number) : validUserId;
          const mood = typeof args.mood === "string" ? args.mood : undefined;
          if (!moodUserId || !mood) {
            return res
              .status(400)
              .json({ error: "userId y mood son requeridos para log_mood_snapshot" });
          }
          toolResult = await createMoodSnapshot({
            userId: moodUserId,
            mood,
            energyLevel: Number.isFinite(Number(args.energyLevel))
              ? Number(args.energyLevel)
              : undefined,
            stressLevel: Number.isFinite(Number(args.stressLevel))
              ? Number(args.stressLevel)
              : undefined,
            note: typeof args.note === "string" ? (args.note as string) : undefined,
            tags: Array.isArray(args.tags)
              ? (args.tags as unknown[]).map((tag) => String(tag))
              : undefined,
          });
          break;
        }
        case "record_user_fact": {
          const journalUserId =
            typeof args.userId === "number" ? (args.userId as number) : validUserId;
          const summary = typeof args.summary === "string" ? args.summary : undefined;
          if (!journalUserId || !summary) {
            return res
              .status(400)
              .json({ error: "userId y summary son requeridos para record_user_fact" });
          }
          toolResult = await createJournalEntry({
            userId: journalUserId,
            entryDate:
              typeof args.entryDate === "string" ? (args.entryDate as string) : undefined,
            title: typeof args.title === "string" ? (args.title as string) : undefined,
            summary,
            rawContent:
              typeof args.rawContent === "string"
                ? (args.rawContent as string)
                : undefined,
            metadata: Array.isArray(args.tags)
              ? { tags: (args.tags as unknown[]).map((tag) => String(tag)) }
              : undefined,
          });
          break;
        }
        default:
          return res.status(400).json({ error: `Herramienta desconocida: ${call.name}` });
      }

      return res.json({ toolResult });
    }

    if (text) {
      return res.json({ text });
    }

    req.log.error({ part }, "Respuesta sin texto ni llamada a herramienta");
    return res.status(500).json({ error: "El agente no generó respuesta utilizable" });
  } catch (error) {
    req.log.error(error, "El agente no pudo procesar la solicitud");
    return res.status(500).json({ error: "El agente no pudo procesar la solicitud" });
  }
};
