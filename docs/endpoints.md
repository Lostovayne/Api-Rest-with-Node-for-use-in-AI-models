# Endpoints HTTP

Referencia de los endpoints expuestos por la API Express. Todos aceptan y devuelven JSON con errores estructurados `{ "error": "mensaje" }`.

## Usuarios

### POST /users

- **Descripción**: Registra o reutiliza un usuario según `username`.
- **Body**:
  ```json
  {
    "username": "ada"
  }
  ```
- **Respuestas**:
  - `201 Created` con `{ id, username, created_at }` cuando se crea.
  - `200 OK` con el mismo payload si ya existía.
  - `400 Bad Request` si falta `username`.

### GET /users/:userId

- **Descripción**: Obtiene la información básica del usuario.
- **Respuestas**:
  - `200 OK` con `{ id, username, created_at }`.
  - `404 Not Found` si el usuario no existe.

## Rutas de estudio

### POST /study-path

- **Descripción**: Encola la generación de una ruta de estudio personalizada.
- **Body**:
  ```json
  {
    "topic": "aprender redes neuronales",
    "userId": 1
  }
  ```
- **Respuestas**:
  - `202 Accepted` con `{ message, topic, requestId }` cuando la tarea fue encolada.
  - `400 Bad Request` si falta `topic` o `userId`.
- **Flujo**: crea un registro `study_path_requests` en estado `pending`, publica `generateStudyPath` y devuelve el `requestId` que se debe monitorear.

### GET /study-path-requests/:requestId

- **Descripción**: Devuelve el estado de la solicitud asincrona.
- **Respuestas**:
  - `200 OK` con `{ request, modules? }`. Cuando `request.study_path_id` está presente, incluye `modules` con `image_url`.
  - `404 Not Found` si el identificador no existe.

### GET /study-paths

- **Descripción**: Lista rutas disponibles, más recientes primero.
- **Query params**: `userId` (opcional) para filtrar.
- **Respuesta**: `200 OK` con un arreglo de `{ id, user_id, topic, created_at }`.

### GET /study-path/:id

- **Descripción**: Obtiene los módulos de una ruta específica.
- **Respuesta**: `200 OK` con un arreglo de módulos que incluyen `image_url` cuando ya fue generada.

### GET /study-path-modules/:id

- **Descripción**: Devuelve un módulo puntual.
- **Respuestas**: `200 OK` con el módulo o `404 Not Found`.

### POST /generate-images-for-path

- **Descripción**: Reencola manualmente la generación de imágenes (el flujo automático ya lo hace al crear la ruta).
- **Body**:
  ```json
  {
    "studyPathId": 5
  }
  ```
- **Respuestas**: `202 Accepted` si se encola, `400` si falta `studyPathId`.
- **Uso recomendado**: operaciones de soporte o reintentos manuales.

## Búsqueda

### GET /search?q=texto

- **Descripción**: Búsqueda semántica mediante pgvector.
- **Respuesta**: lista de módulos con su distancia `distance`.

### GET /search/typesense?q=texto

- **Descripción**: Búsqueda por keyword usando Typesense sobre `study_modules`.
- **Notas**: requiere que Typesense esté sincronizado (lo hace el worker al generar rutas).

## Texto a voz (TTS)

### POST /text-to-speech

- **Descripción**: Crea un trabajo TTS asincrono.
- **Body**:
  ```json
  {
    "text": "contenido del modulo",
    "userId": 1,
    "moduleId": 23
  }
  ```
- **Respuesta**: `202 Accepted` con `{ "jobId": "uuid" }`.
- **Flujo**: publica `generateTTS`; el worker genera audio con Gemini y guarda `audio_url` en Vercel Blob.

### GET /text-to-speech/:jobId

- **Descripción**: Consulta un trabajo puntual.
- **Respuestas**:
  - `200 OK` con `status`, y cuando concluye agrega `audioUrl`, `moduleId`, `userId`.
  - `404 Not Found` si no existe el ID.

### GET /text-to-speech

- **Descripción**: Lista los trabajos recientes.
- **Query params**: `userId`, `moduleId`, `status` (opcionales).
- **Respuesta**: `200 OK` con hasta 50 trabajos ordenados por `created_at` descendente.

## Quizzes y módulos

### POST /modules/:moduleId/quiz

- **Descripción**: Encola la generación de un quiz para el módulo.
- **Flujo**: publica `generateQuiz`; el worker usa `quizService` y llena `quizzes` y `questions`.

### GET /modules/:moduleId/quiz

- **Descripción**: Obtiene el último quiz generado con sus preguntas.
- **Respuestas**:
  - `200 OK` con `{ quiz, questions }`.
  - `404 Not Found` si aún no se generó.

### POST /quizzes/:quizId/submit

- **Descripción**: Registra respuestas del usuario y devuelve el puntaje.
- **Body**:
  ```json
  {
    "userId": 1,
    "answers": [{ "questionId": 10, "selectedOptionIndex": 2 }]
  }
  ```
- **Respuesta**: `200 OK` con `attemptId`, `score` y detalle de correcciones.

## Progreso, logros y timeline

### POST /progress/modules/complete

- **Descripción**: Marca un módulo como completado y evalúa logros.
- **Body**:
  ```json
  {
    "userId": 1,
    "moduleId": 23
  }
  ```
- **Respuestas**: `201 Created` con el progreso y logros otorgados, `409 Conflict` si ya estaba completado.

### GET /progress/users/:userId/progress

- **Descripción**: Devuelve módulos completados y logros.

### GET /progress/users/:userId/dashboard

- **Descripción**: Resumen rápido (conteos, siguiente módulo sugerido placeholder, racha placeholder).

### GET /progress/users/:userId/timeline

- **Descripción**: Agrega los eventos clave para el usuario (solicitudes, rutas, módulos pendientes, quizzes, TTS, logros, progreso reciente).
- **Respuesta**: `200 OK` con arreglos `requests`, `studyPaths`, `pendingModules`, `quizzes`, `ttsJobs`, `achievements`, `recentProgress`.

## Agente de productividad

### POST /agent

- **Descripción**: Envía un `prompt` a Gemini, que puede llamar herramientas para tareas.
- **Body**:
  ```json
  {
    "prompt": "Que deberia hacer hoy?",
    "userId": 1
  }
  ```
- **Respuestas**:
  - `200 OK` con `{ "text": "..." }` cuando Gemini responde directo.
  - `200 OK` con `{ "toolResult": { ... } }` cuando ejecuta funciones (`add_task`, `get_tasks`, `update_task_status`, `get_daily_recommendations`).
  - `400 Bad Request` si faltan argumentos.

## Mi Día asistido (Fase 2)

### POST /users/:userId/day-plan

- **Descripción**: Genera (o regenera) el plan diario personalizado del usuario combinando tareas, módulos pendientes, estado de ánimo y logros recientes.
- **Body** (opcional):
  ```json
  {
    "planDate": "2025-11-14",
    "force": true
  }
  ```
- **Respuestas**:
  - `201 Created` cuando se genera un nuevo plan.
  - `200 OK` cuando ya existía y se devuelve sin regenerar (a menos que `force` sea `true`).
  - `400 Bad Request` si `userId` no es válido.
- **Notas**: Devuelve `{ plan, context, metadata }`. El `context` incluye las tareas y módulos que se usaron para construir la recomendación.

### GET /users/:userId/day-plan

- **Descripción**: Recupera el plan diario previamente generado para la fecha indicada.
- **Query params**: `date` (opcional, formato `YYYY-MM-DD`; por defecto usa la fecha actual).
- **Respuestas**:
  - `200 OK` con el mismo payload `{ plan, context, metadata }`.
  - `404 Not Found` si aún no se ha generado un plan para esa fecha.
  - `400 Bad Request` si la fecha es inválida o el `userId` no corresponde.

## Notas generales

- Middleware de logging proporciona `req.log` para trazabilidad.
- Operaciones asincronas (ruta, imágenes, quiz, TTS) requieren polling mediante los endpoints indicados.
- Cada worker registra logs detallados en la consola con contexto (`context` en Pino) para depuración.
