import { logger as mainLogger } from "../../api/middlewares/logger";
import { generateQuizForModule } from "../../services/quizService";

const taskLogger = mainLogger.child({ context: "GenerateQuizTask" });

interface TaskPayload {
  moduleId: number;
}

export const handleGenerateQuiz = async (payload: TaskPayload) => {
  const { moduleId } = payload;
  taskLogger.info({ moduleId }, `Processing task: Generate quiz`);

  try {
    const result = await generateQuizForModule(moduleId);
    taskLogger.info({ moduleId, quizId: result.quizId }, `Successfully generated and saved quiz.`);
    return result;
  } catch (error) {
    taskLogger.error({ err: error, moduleId }, `Failed to generate quiz.`);
    throw error;
  }
};
