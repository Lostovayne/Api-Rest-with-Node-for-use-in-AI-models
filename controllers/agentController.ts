import { Request, Response } from "express";
import { useTools } from "../services/geminiService";
import { addTask, getTasks, updateTaskStatus } from "../services/taskService";
import { FunctionCall } from "@google/genai"; // Import FunctionCall

export const agentController = async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "El prompt es requerido" });
    }
    const result = await useTools(prompt);

    const candidate = result.candidates?.[0];
    const part = candidate?.content?.parts?.[0];

    if (!part) {
      return res.status(500).json({ error: "No se recibió una respuesta válida del modelo" });
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
            toolResult = await addTask(call.args.task);
          } else {
            req.log.error(call.args, "Invalid arguments for add_task");
            return res.status(400).json({ error: "Argumentos inválidos para add_task" });
          }
          break;
        case "get_tasks":
          // Ensure args and status property exist, or status is undefined
          if (call.args && (typeof call.args.status === "string" || call.args.status === undefined)) {
            toolResult = await getTasks(call.args.status);
          } else {
            req.log.error(call.args, "Invalid arguments for get_tasks");
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
            req.log.error(call.args, "Invalid arguments for update_task_status");
            return res.status(400).json({ error: "Argumentos inválidos para update_task_status" });
          }
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
    req.log.error(error);
    res.status(500).json({ error: "El agente no pudo procesar la solicitud" });
  }
};