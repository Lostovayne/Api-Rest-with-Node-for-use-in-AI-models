import { Type } from "@google/genai";
import pool from "../db";
import { generateStructuredText } from "./geminiService";

interface DayPlanContextTask {
  id: number;
  task: string;
  status: string;
  due_at: string | null;
  created_at: string;
}

interface DayPlanContextModule {
  id: number;
  study_path_id: number;
  title: string;
  topic: string;
  description: string;
}

interface DayPlanContextAchievement {
  id: number;
  name: string;
  earned_at: string;
}

interface DayPlanContextMood {
  mood: string;
  energy_level: number | null;
  stress_level: number | null;
  note: string | null;
  created_at: string;
}

interface DayPlanContextSummary {
  totalModules: number;
  completedModules: number;
  completionRate: number;
}

interface DayPlanContextSnapshot {
  planDate: string;
  timeOfDay: string;
  pendingTasks: DayPlanContextTask[];
  pendingModules: DayPlanContextModule[];
  progressSummary: DayPlanContextSummary;
  recentMood: DayPlanContextMood | null;
  recentAchievements: DayPlanContextAchievement[];
}

interface DayPlanTimelineItem {
  label: string;
  startTime?: string;
  endTime?: string;
  intent: string;
  actions: string[];
}

interface DayPlanWellnessBlock {
  checkIn: string;
  breaks: string[];
  energyTips: string[];
  gratitudePrompt: string;
}

interface DayPlanPayload {
  headline: string;
  summary: string;
  focusAreas: string[];
  timeline: DayPlanTimelineItem[];
  wellness: DayPlanWellnessBlock;
  motivation: string;
}

interface DayPlanRecord {
  id: number;
  user_id: number;
  plan_date: string;
  plan: DayPlanPayload;
  context: DayPlanContextSnapshot | null;
  created_at: string;
  updated_at: string;
}

interface GenerateDayPlanOptions {
  force?: boolean;
}

const dayPlanSchema = {
  type: Type.OBJECT,
  properties: {
    plan: {
      type: Type.OBJECT,
      properties: {
        headline: { type: Type.STRING },
        summary: { type: Type.STRING },
        focusAreas: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        timeline: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              startTime: { type: Type.STRING },
              endTime: { type: Type.STRING },
              intent: { type: Type.STRING },
              actions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["label", "intent", "actions"],
          },
        },
        wellness: {
          type: Type.OBJECT,
          properties: {
            checkIn: { type: Type.STRING },
            breaks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            energyTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            gratitudePrompt: { type: Type.STRING },
          },
          required: ["checkIn", "breaks", "energyTips", "gratitudePrompt"],
        },
        motivation: { type: Type.STRING },
      },
      required: [
        "headline",
        "summary",
        "focusAreas",
        "timeline",
        "wellness",
        "motivation",
      ],
    },
  },
  required: ["plan"],
};

export const normalizePlanDate = (date?: string): string => {
  if (!date) {
    return new Date().toISOString().split("T")[0];
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Fecha inválida para el plan diario");
  }
  return parsed.toISOString().split("T")[0];
};

const computeTimeOfDay = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return "mañana";
  }
  if (hour >= 12 && hour < 18) {
    return "tarde";
  }
  return "noche";
};

const cleanJsonString = (value: string): string => {
  let trimmed = value.trim();
  if (trimmed.startsWith("```")) {
    trimmed = trimmed.replace(/^```json\s*/i, "");
    trimmed = trimmed.replace(/^```\s*/i, "");
    if (trimmed.endsWith("```")) {
      trimmed = trimmed.slice(0, trimmed.lastIndexOf("```"));
    }
  }
  return trimmed;
};

const ensureJsonObject = <T>(value: any): T => {
  if (value === null || value === undefined) {
    return value as T;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      throw new Error(
        "No se pudo interpretar el contenido JSON almacenado en la base de datos."
      );
    }
  }

  return value as T;
};

const fetchPlanFromDb = async (
  userId: number,
  planDate: string
): Promise<DayPlanRecord | null> => {
  const result = await pool.query<DayPlanRecord>(
    `SELECT id, user_id, plan_date, plan, context, created_at, updated_at
     FROM user_day_plans
     WHERE user_id = $1 AND plan_date = $2`,
    [userId, planDate]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  return {
    ...row,
    plan: ensureJsonObject<DayPlanPayload>(row.plan as any),
    context: ensureJsonObject<DayPlanContextSnapshot | null>(row.context as any),
  };
};

const buildContextSnapshot = async (
  userId: number,
  planDate: string
): Promise<DayPlanContextSnapshot> => {
  const client = await pool.connect();
  try {
    const tasksResult = await client.query<DayPlanContextTask>(
      `SELECT id, task, status, due_at, created_at
       FROM user_tasks
       WHERE user_id = $1 OR user_id IS NULL
       ORDER BY status ASC, created_at ASC
       LIMIT 12`,
      [userId]
    );

    const modulesResult = await client.query<DayPlanContextModule>(
      `SELECT m.id, m.study_path_id, m.title, m.description, sp.topic
       FROM study_path_modules m
       INNER JOIN study_paths sp ON sp.id = m.study_path_id
       LEFT JOIN user_module_progress ump
         ON ump.module_id = m.id AND ump.user_id = $1
       WHERE sp.user_id = $1 AND ump.id IS NULL
       ORDER BY m.id ASC
       LIMIT 6`,
      [userId]
    );

    const progressResult = await client.query<{ total: string }>(
      `SELECT COUNT(*) AS total
       FROM study_path_modules m
       INNER JOIN study_paths sp ON sp.id = m.study_path_id
       WHERE sp.user_id = $1`,
      [userId]
    );

    const completedResult = await client.query<{ total: string }>(
      `SELECT COUNT(*) AS total
       FROM user_module_progress
       WHERE user_id = $1`,
      [userId]
    );

    const moodResult = await client.query<DayPlanContextMood>(
      `SELECT mood, energy_level, stress_level, note, created_at
       FROM user_mood_snapshots
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    const achievementsResult = await client.query<DayPlanContextAchievement>(
      `SELECT a.id, a.name, ua.earned_at
       FROM user_achievements ua
       INNER JOIN achievements a ON a.id = ua.achievement_id
       WHERE ua.user_id = $1
       ORDER BY ua.earned_at DESC
       LIMIT 3`,
      [userId]
    );

    const totalModules = Number.parseInt(progressResult.rows[0]?.total ?? "0", 10);
    const completedModules = Number.parseInt(completedResult.rows[0]?.total ?? "0", 10);
    const completionRate =
      totalModules === 0 ? 0 : Math.round((completedModules / totalModules) * 100);

    return {
      planDate,
      timeOfDay: computeTimeOfDay(),
      pendingTasks: tasksResult.rows,
      pendingModules: modulesResult.rows,
      progressSummary: {
        totalModules,
        completedModules,
        completionRate,
      },
      recentMood: moodResult.rows[0] ?? null,
      recentAchievements: achievementsResult.rows,
    };
  } finally {
    client.release();
  }
};

const buildPrompt = (context: DayPlanContextSnapshot): string => {
  const tasksSection = context.pendingTasks.length
    ? context.pendingTasks
        .map(
          (task, index) =>
            `  ${index + 1}. ${task.task}${
              task.status !== "pending" ? ` (estado: ${task.status})` : ""
            }`
        )
        .join("\n")
    : "  No hay tareas registradas.";
  const modulesSection = context.pendingModules.length
    ? context.pendingModules
        .map((module, index) => `  ${index + 1}. ${module.title} (ruta: ${module.topic})`)
        .join("\n")
    : "  No hay módulos pendientes asignados.";
  const moodSection = context.recentMood
    ? `Estado de ánimo reportado: ${context.recentMood.mood}. Nivel de energía: ${
        context.recentMood.energy_level ?? "no indicado"
      }. Nivel de estrés: ${context.recentMood.stress_level ?? "no indicado"}. Nota: ${
        context.recentMood.note ?? "sin comentario"
      }.`
    : "No hay un registro reciente de estado de ánimo.";

  const achievementsSection = context.recentAchievements.length
    ? context.recentAchievements
        .map(
          (achievement) =>
            `  • ${achievement.name} (obtenido ${new Date(
              achievement.earned_at
            ).toLocaleDateString("es-ES")})`
        )
        .join("\n")
    : "  Sin logros recientes registrados.";

  return `Eres Ritmo, un planificador de día en español para un usuario gamer/desarrollador autodidacta.
Fecha del plan: ${context.planDate}.
Momento del día al generar el plan: ${context.timeOfDay}.

Contexto del usuario:
- Tareas pendientes:
${tasksSection}
- Módulos de estudio pendientes:
${modulesSection}
- Progreso global: ${context.progressSummary.completedModules}/${context.progressSummary.totalModules} módulos completados (${context.progressSummary.completionRate}% completado).
- ${moodSection}
- Logros recientes:
${achievementsSection}

Objetivo: Producir un plan equilibrado que combine avance en rutas de estudio, tareas personales y autocuidado mental/físico. Mantén un tono afectuoso, motivador y realista.

Debes responder únicamente en formato JSON respetando exactamente el siguiente esquema:
{
  "plan": {
    "headline": string,
    "summary": string,
    "focusAreas": string[],
    "timeline": [
      {
        "label": string,
        "startTime": string opcional (HH:MM en formato 24h),
        "endTime": string opcional (HH:MM),
        "intent": string,
        "actions": string[]
      }
    ],
    "wellness": {
      "checkIn": string,
      "breaks": string[],
      "energyTips": string[],
      "gratitudePrompt": string
    },
    "motivation": string
  }
}

Limita la agenda a un máximo de 6 bloques y fomenta descansos breves entre actividades. Usa vocabulario cercano ("recarga energía", "celebra tus pequeños avances").`;
};

const upsertDayPlan = async (
  userId: number,
  planDate: string,
  plan: DayPlanPayload,
  context: DayPlanContextSnapshot
): Promise<DayPlanRecord> => {
  const result = await pool.query<DayPlanRecord>(
    `INSERT INTO user_day_plans (user_id, plan_date, plan, context)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, plan_date)
     DO UPDATE SET
       plan = EXCLUDED.plan,
       context = EXCLUDED.context,
       updated_at = CURRENT_TIMESTAMP
     RETURNING id, user_id, plan_date, plan, context, created_at, updated_at`,
    [userId, planDate, JSON.stringify(plan), JSON.stringify(context)]
  );

  return result.rows[0];
};

export const getDayPlan = async (
  userId: number,
  planDate: string
): Promise<DayPlanRecord | null> => {
  return fetchPlanFromDb(userId, planDate);
};

export const generateDayPlan = async (
  userId: number,
  rawPlanDate?: string,
  options: GenerateDayPlanOptions = {}
): Promise<{
  plan: DayPlanPayload;
  context: DayPlanContextSnapshot;
  metadata: {
    planDate: string;
    source: "stored" | "generated";
    createdAt: string;
    updatedAt: string;
  };
}> => {
  const planDate = normalizePlanDate(rawPlanDate);

  if (!options.force) {
    const existing = await fetchPlanFromDb(userId, planDate);
    if (existing) {
      return {
        plan: ensureJsonObject<DayPlanPayload>(existing.plan as any),
        context:
          ensureJsonObject<DayPlanContextSnapshot | null>(existing.context as any) ??
          (await buildContextSnapshot(userId, planDate)),
        metadata: {
          planDate: existing.plan_date,
          source: "stored",
          createdAt: existing.created_at,
          updatedAt: existing.updated_at,
        },
      };
    }
  }

  const contextSnapshot = await buildContextSnapshot(userId, planDate);
  const prompt = buildPrompt(contextSnapshot);
  const rawResponse = await generateStructuredText(prompt, dayPlanSchema);

  let parsed: { plan: DayPlanPayload };
  try {
    parsed = JSON.parse(cleanJsonString(rawResponse));
  } catch (error) {
    throw new Error("No se pudo parsear el plan diario devuelto por Gemini.");
  }

  const stored = await upsertDayPlan(userId, planDate, parsed.plan, contextSnapshot);

  return {
    plan: ensureJsonObject<DayPlanPayload>(stored.plan as any),
    context: contextSnapshot,
    metadata: {
      planDate: stored.plan_date,
      source: "generated",
      createdAt: stored.created_at,
      updatedAt: stored.updated_at,
    },
  };
};
