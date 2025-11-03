import pool from "../db";
import { generateStructuredText } from "./geminiService";
import { Type } from "@google/genai";

interface QuizQuestion {
  question_text: string;
  options: string[];
  correct_option_index: number;
}

interface GeneratedQuiz {
  title: string;
  questions: QuizQuestion[];
}

// Define the schema for the quiz response
const quizSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question_text: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          correct_option_index: { type: Type.NUMBER },
        },
        required: ["question_text", "options", "correct_option_index"],
      },
    },
  },
  required: ["title", "questions"],
};

export const generateQuizForModule = async (moduleId: number) => {
  // 1. Get Module Content
  const moduleResult = await pool.query(
    "SELECT title, description, subtopics FROM study_path_modules WHERE id = $1",
    [moduleId],
  );

  if (moduleResult.rows.length === 0) {
    throw new Error("Module not found");
  }

  const module = moduleResult.rows[0];

  // 2. Construct Prompt
  const prompt = `
    Eres un experto creando contenido educativo en español.
    Basado en el siguiente contenido de un módulo de estudio, DEBES generar un cuestionario de opción múltiple con EXACTAMENTE 5 preguntas en español.

    **Contenido del Módulo:**
    - **Título:** ${module.title}
    - **Descripción:** ${module.description}
    - **Subtemas:** ${module.subtopics.join(", ")}

    **Instrucciones:**
    1. El cuestionario debe evaluar los conceptos clave del módulo.
    2. Cada pregunta debe tener 4 opciones distintas.
    3. Todo el texto, incluyendo preguntas, opciones y el título del quiz, DEBE estar en español.
  `;

  // 3. Call Gemini with the structured schema
  const generatedJson = await generateStructuredText(prompt, quizSchema);

  // 4. Parse and Validate
  let quizData: GeneratedQuiz;
  try {
    quizData = JSON.parse(generatedJson);
  } catch (error) {
    console.error("Error parsing quiz JSON from Gemini:", error);
    console.error("Received JSON string:", generatedJson);
    throw new Error("Failed to parse quiz data from AI, despite schema enforcement.");
  }

  // Add a final validation check to ensure questions are not empty
  if (!quizData.questions || quizData.questions.length === 0) {
    throw new Error("AI returned a quiz with no questions.");
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 5. Save to DB
    const quizResult = await client.query(
      'INSERT INTO quizzes (module_id, title) VALUES ($1, $2) RETURNING id',
      [moduleId, quizData.title]
    );
    const quizId = quizResult.rows[0].id;

    for (const q of quizData.questions) {
      await client.query(
        'INSERT INTO questions (quiz_id, question_text, options, correct_option_index) VALUES ($1, $2, $3, $4)',
        [quizId, q.question_text, JSON.stringify(q.options), q.correct_option_index]
      );
    }

    await client.query('COMMIT');

    // 6. Return Quiz (without correct answers)
    const quizForUser = {
      quizId,
      title: quizData.title,
      questions: quizData.questions.map(({ correct_option_index, ...rest }) => rest),
    };

    return quizForUser;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving quiz to database:', error);
    throw new Error('Failed to save quiz to database.');
  } finally {
    client.release();
  }
};
