import { Request, Response } from "express";
import {
  JournalEntryInput,
  createJournalEntry,
  getJournalEntry,
  listJournalEntries,
} from "../../services/journalService";

const parseUserId = (value: string): number | null => {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
};

export const addJournalEntry = async (req: Request, res: Response) => {
  const userIdParam = req.params.userId;
  const userId = parseUserId(userIdParam);

  if (!userId) {
    return res.status(400).json({ error: "userId inválido" });
  }

  const { entryDate, title, summary, rawContent, metadata } = req.body ?? {};

  const payload: JournalEntryInput = {
    userId,
    entryDate: typeof entryDate === "string" ? entryDate : undefined,
    title: typeof title === "string" ? title : undefined,
    summary: typeof summary === "string" ? summary : undefined,
    rawContent: typeof rawContent === "string" ? rawContent : undefined,
    metadata: metadata && typeof metadata === "object" ? metadata : undefined,
  };

  try {
    const entry = await createJournalEntry(payload);
    return res.status(201).json(entry);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Fecha inválida")) {
      return res.status(400).json({ error: error.message });
    }
    req.log.error({ err: error, userId }, "No se pudo registrar la entrada de diario");
    return res.status(500).json({ error: "No se pudo registrar la entrada de diario" });
  }
};

export const listJournal = async (req: Request, res: Response) => {
  const userIdParam = req.params.userId;
  const userId = parseUserId(userIdParam);

  if (!userId) {
    return res.status(400).json({ error: "userId inválido" });
  }

  const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 20;

  try {
    const entries = await listJournalEntries(userId, limit);
    return res.status(200).json({ entries });
  } catch (error) {
    req.log.error({ err: error, userId }, "No se pudo obtener el diario");
    return res.status(500).json({ error: "No se pudo obtener el diario" });
  }
};

export const getJournalEntryHandler = async (req: Request, res: Response) => {
  const userIdParam = req.params.userId;
  const entryIdParam = req.params.entryId;
  const userId = parseUserId(userIdParam);
  const entryId = Number(entryIdParam);

  if (!userId || !Number.isInteger(entryId) || entryId <= 0) {
    return res.status(400).json({ error: "Parámetros inválidos" });
  }

  try {
    const entry = await getJournalEntry(userId, entryId);
    if (!entry) {
      return res.status(404).json({ error: "Entrada no encontrada" });
    }
    return res.status(200).json(entry);
  } catch (error) {
    req.log.error(
      { err: error, userId, entryId },
      "No se pudo obtener la entrada de diario"
    );
    return res.status(500).json({ error: "No se pudo obtener la entrada de diario" });
  }
};
