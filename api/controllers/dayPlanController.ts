import { Request, Response } from "express";
import {
  generateDayPlan,
  getDayPlan,
  normalizePlanDate,
} from "../../services/dayPlanService";

const parseUserId = (value: string): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

export const createOrUpdateDayPlan = async (req: Request, res: Response) => {
  const userIdParam = req.params.userId;
  const numericUserId = parseUserId(userIdParam);

  if (numericUserId === null) {
    return res.status(400).json({ error: "userId inválido" });
  }

  const { planDate, force } = req.body ?? {};

  try {
    const result = await generateDayPlan(numericUserId, planDate, {
      force: Boolean(force),
    });

    const statusCode = result.metadata.source === "generated" ? 201 : 200;
    return res.status(statusCode).json(result);
  } catch (error) {
    req.log.error(
      { err: error, userId: numericUserId },
      "No se pudo generar el plan diario"
    );
    return res.status(500).json({ error: "No se pudo generar el plan diario" });
  }
};

export const getDayPlanHandler = async (req: Request, res: Response) => {
  const userIdParam = req.params.userId;
  const numericUserId = parseUserId(userIdParam);

  if (numericUserId === null) {
    return res.status(400).json({ error: "userId inválido" });
  }

  const rawDate = typeof req.query.date === "string" ? req.query.date : undefined;

  try {
    const planDate = normalizePlanDate(rawDate);
    const stored = await getDayPlan(numericUserId, planDate);

    if (!stored) {
      return res
        .status(404)
        .json({ error: "No existe un plan diario generado para esa fecha" });
    }

    return res.status(200).json({
      plan: stored.plan,
      context: stored.context,
      metadata: {
        planDate: stored.plan_date,
        createdAt: stored.created_at,
        updatedAt: stored.updated_at,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Fecha inválida")) {
      return res.status(400).json({ error: error.message });
    }

    req.log.error(
      { err: error, userId: numericUserId },
      "No se pudo recuperar el plan diario"
    );
    return res.status(500).json({ error: "No se pudo recuperar el plan diario" });
  }
};
