import pool from '../db';
import { generateText } from './geminiService';

interface QuizQuestion {
  question_text: string;
  options: string[];
  correct_option_index: number;
}

interface GeneratedQuiz {
  title: string;
  questions: QuizQuestion[];
}

export const generateQuizForModule = async (moduleId: number) => {
  // 1. Get Module Content
  const moduleResult = await pool.query(
    'SELECT title, description, subtopics FROM study_path_modules WHERE id = $1',
    [moduleId]
  );

  if (moduleResult.rows.length === 0) {
    throw new Error('Module not found');
  }

  const module = moduleResult.rows[0];

  // 2. Construct Prompt
  const prompt = `
    Based on the following study module content, generate a multiple-choice quiz with 5 questions.

    Module Title: ${module.title}
    Module Description: ${module.description}
    Module Subtopics: ${module.subtopics.join(', ')}

    The quiz should test the key concepts from the module.

    Please return the quiz in a single, minified JSON object with no extra text or explanations. The JSON object should have the following structure:
    {
      "title": "Quiz for ${module.title}",
      "questions": [
        {
          "question_text": "...",
          "options": ["...", "...", "...", "..."],
          "correct_option_index": 0
        },
        {
          "question_text": "...",
          "options": ["...", "...", "...", "..."],
          "correct_option_index": 1
        },
        {
          "question_text": "...",
          "options": ["...", "...", "...", "..."],
          "correct_option_index": 2
        },
        {
          "question_text": "...",
          "options": ["...", "...", "...", "..."],
          "correct_option_index": 3
        },
        {
          "question_text": "...",
          "options": ["...", "...", "...", "..."],
          "correct_option_index": 0
        }
      ]
    }
  `;

  // 3. Call Gemini
  const generatedJson = await generateText(prompt);

  // 4. Parse and Validate
  let quizData: GeneratedQuiz;
  try {
    // The response might have markdown backticks, remove them
    const cleanedJson = generatedJson.replace(/```json/g, '').replace(/```/g, '').trim();
    quizData = JSON.parse(cleanedJson);
  } catch (error) {
    console.error('Error parsing quiz JSON from Gemini:', error);
    console.error('Received JSON string:', generatedJson);
    throw new Error('Failed to parse quiz data from AI.');
  }

  // Basic validation
  if (!quizData.title || !quizData.questions || quizData.questions.length === 0) {
    throw new Error('Invalid quiz data structure from AI.');
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
