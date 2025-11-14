# Flujos asincronos y servicios

## Generacion de rutas de estudio

1. `POST /study-path` recibe `topic` y `userId`, valida los campos y publica un mensaje `generateStudyPath` en RabbitMQ.
2. El worker `generate-study-path.task.ts` consulta Gemini:

- genera modulos estructurados
- genera embeddings por modulo con `generateEmbedding`

3. Persiste la ruta y los modulos en PostgreSQL dentro de una transaccion y actualiza `study_path_requests` con el `requestId` recibido.
4. Tras confirmar, indexa cada modulo en Typesense via `typesenseService.indexModule`.
5. Finalmente encola automaticamente una tarea `generateImages` para poblar `image_url` de cada modulo.
6. El cliente debe hacer polling con `GET /study-path-requests/:id` hasta que el estado sea `completed`. Cuando `study_path_id` exista puede listar modulos con `GET /study-paths` y `GET /study-paths/:id`.

## Generacion de imagenes para modulos

1. El worker de rutas (`generate-study-path.task.ts`) encola una tarea `generateImages` tan pronto termina de crear la ruta.
2. `generate-images.task.ts` recupera los modulos del path.
3. Para cada modulo sin `image_url` llama a `generateImageFromGemini`.
4. Actualiza la columna `image_url` con el link devuelto.
5. Loggea el resultado y continua aun si algun modulo falla.
6. El endpoint `POST /generate-images-for-path` permanece disponible para reenviar manualmente la tarea en caso de reintentos.

## Generacion de quizzes

1. `POST /modules/:moduleId/quiz` publica `generateQuiz`.
2. `generate-quiz.task.ts` invoca `quizService.generateQuizForModule(moduleId)` para crear preguntas, opciones y respuestas correctas.
3. Los registros se almacenan en las tablas `quizzes`, `questions` y asociadas.
4. Los usuarios contestan mediante `POST /quizzes/:quizId/submit`.

## Texto a voz (TTS)

1. `POST /text-to-speech` crea un registro `tts_jobs` con estado `pending` y encola `generateTTS`.
2. `tts.task.ts` llama `textToSpeech` de Gemini, genera un WAV (cabecera + datos PCM) y sube el archivo con `uploadAudioBlob` a Vercel Blob.
3. Actualiza `tts_jobs` con `audio_url`, `status = completed` y `completed_at`.
4. Si ocurre un error, marca `status = failed` y guarda `error_message`.
5. El cliente consulta `GET /text-to-speech/:jobId` para conocer el resultado.

## Logros y progreso

- `POST /modules/complete` inserta un registro en `user_module_progress` y luego ejecuta `checkModuleCompletionAchievements`.
- Ese servicio consulta cuantas unidades tiene el usuario, identifica logros pendientes, genera iconos en Gemini y registra el logro en `user_achievements`.

## Busqueda

- **Semantica**: `searchService.searchModules` genera embeddings para la query y usa el operador `<=>` de pgvector.
- **Typesense**:
  1. `typesenseService.initializeSchema()` asegura que exista la coleccion `study_modules`.
  2. Cada modulo se indexa con `indexModule` luego de generarse.
  3. `GET /search/typesense` ejecuta `documents().search` con `query_by` en `title`, `description` y `subtopics`.

## Agente

- `POST /agent` usa Gemini con herramientas registradas.
- Dependiendo del `functionCall`, ejecuta operaciones en la base de datos (`user_tasks`) o construye una recomendacion con `groundWithSearch`.
- Diseño pensado para extender con nuevas herramientas (ej. integracion con habitos o estado de animo).
