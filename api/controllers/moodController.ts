import { Request, Response } from "express";
import {
  MoodSnapshotInput,
  createMoodSnapshot,
  getMoodSummary,
  listMoodSnapshots,
} from "../../services/moodService";

const parseUserId = (value: string): number | null => {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
};

export const addMoodSnapshot = async (req: Request, res: Response) => {
  const userIdParam = req.params.userId;
  const userId = parseUserId(userIdParam);

  if (!userId) {
    return res.status(400).json({ error: "userId inválido" });
  }

  const { mood, energyLevel, stressLevel, note, tags } = req.body ?? {};

  if (!mood || typeof mood !== "string") {
    return res.status(400).json({ error: "mood es obligatorio" });
  }

  const payload: MoodSnapshotInput = {
    userId,
    mood,
    energyLevel: typeof energyLevel === "number" ? energyLevel : undefined,
    stressLevel: typeof stressLevel === "number" ? stressLevel : undefined,
    note: typeof note === "string" ? note : undefined,
    tags: Array.isArray(tags) ? tags.map(String) : undefined,
  };

  try {
    const snapshot = await createMoodSnapshot(payload);
    return res.status(201).json(snapshot);
  } catch (error) {
    req.log.error({ err: error, userId }, "No se pudo guardar el estado de ánimo");
    return res.status(500).json({ error: "No se pudo guardar el estado de ánimo" });
  }
};

export const listMoodHistory = async (req: Request, res: Response) => {
  const userIdParam = req.params.userId;
  const userId = parseUserId(userIdParam);

  if (!userId) {
    return res.status(400).json({ error: "userId inválido" });
  }

  const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 30;

  try {
    const snapshots = await listMoodSnapshots(userId, limit);
    return res.status(200).json({ snapshots });
  } catch (error) {
    req.log.error(
      { err: error, userId },
      "No se pudo recuperar el historial de estado de ánimo"
    );
    return res.status(500).json({ error: "No se pudo recuperar el historial" });
  }
};

export const getMoodSummaryHandler = async (req: Request, res: Response) => {
  const userIdParam = req.params.userId;
  const userId = parseUserId(userIdParam);

  if (!userId) {
    return res.status(400).json({ error: "userId inválido" });
  }

  try {
    const summary = await getMoodSummary(userId);
    return res.status(200).json(summary);
  } catch (error) {
    req.log.error(
      { err: error, userId },
      "No se pudo generar el resumen de estado de ánimo"
    );
    return res.status(500).json({ error: "No se pudo generar el resumen" });
  }
};
