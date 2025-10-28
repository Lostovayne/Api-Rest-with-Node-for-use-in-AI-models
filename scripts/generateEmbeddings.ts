import pool from '../db';
import { generateEmbedding } from '../services/geminiService';

const generateEmbeddingsForAllModules = async () => {
  console.log('Starting embedding generation for existing modules...');
  const client = await pool.connect();
  try {
    // Get all modules that don't have an embedding
    const modulesResult = await client.query(
      'SELECT id, title, description, subtopics FROM study_path_modules WHERE embedding IS NULL'
    );

    if (modulesResult.rows.length === 0) {
      console.log('No modules found without embeddings. All set!');
      return;
    }

    console.log(`Found ${modulesResult.rows.length} modules to process.`);

    for (const module of modulesResult.rows) {
      console.log(`Processing module ID: ${module.id} - "${module.title}"`);

      // Create a single text block for embedding
      const textToEmbed = `Title: ${module.title}\nDescription: ${module.description}\nSubtopics: ${module.subtopics.join(', ')}`;

      // Generate the embedding
      const embedding = await generateEmbedding(textToEmbed);

      // Save the embedding to the database
      await client.query(
        'UPDATE study_path_modules SET embedding = $1 WHERE id = $2',
        [`[${embedding.join(',')}]`, module.id]
      );

      console.log(`Successfully generated and saved embedding for module ID: ${module.id}`);
    }

    console.log('Finished generating embeddings for all modules.');
  } catch (error) {
    console.error('An error occurred during embedding generation:', error);
  } finally {
    client.release();
    await pool.end(); // End the pool connection as this is a script
  }
};

generateEmbeddingsForAllModules();
