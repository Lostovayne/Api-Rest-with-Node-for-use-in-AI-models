# Endpoints HTTP

Referencia de los endpoints expuestos por la API Express. Todos aceptan y devuelven JSON.

## Estudio y modulos

### POST /study-path

- **Descripcion**: Encola la generacion de una nueva ruta de estudio en base a un tema.
- **Body**:

```json
{
  "topic": "aprender redes neuronales"
}
```

- **Respuestas**:
  - `202 Accepted` si la tarea fue encolada.
  - `400 Bad Request` si falta `topic`.
- **Flujo**: publica un mensaje `generateStudyPath` en RabbitMQ. El worker genera modulos, los guarda en PostgreSQL e indexa cada modulo en Typesense.

### GET /study-path/:id

- **Descripcion**: Obtiene todos los modulos pertenecientes a una ruta de estudio.
- **Parametros**: `id` numerico del registro en `study_paths`.
- **Respuesta** `200 OK`:

```json
[
  {
    "id": 12,
    "study_path_id": 5,
    "title": "Introduccion",
    "description": "...",
    "subtopics": ["conceptos basicos"],
    "image_url": "https://..."
  }
]
```

- **Errores**: `500` si ocurre un problema de base de datos.

### GET /study-path-modules/:id

- **Descripcion**: Devuelve un modulo especifico por `id`.
- **Respuesta**: `200 OK` con el modulo o `404 Not Found` si no existe.

### POST /generate-images-for-path

- **Descripcion**: Encola la generacion de imagenes para todos los modulos de una ruta.
- **Body**:

```json
{
  "studyPathId": 5
}
```

- **Respuestas**: `202 Accepted` si la tarea se encolo, `400` si falta `studyPathId`.
- **Flujo**: publica `generateImages`; el worker consulta cada modulo y usa Groq para crear imagenes, actualizando la columna `image_url`.

## Busqueda

### GET /search?q=texto

- **Descripcion**: Busqueda semantica mediante pgvector.
- **Parametros**: query string `q`.
- **Respuesta**: lista de modulos ordenados por afinidad con su distancia `distance`.

### GET /search/typesense?q=texto

- **Descripcion**: Busqueda por palabra clave usando Typesense.
- **Nota**: requiere tener Typesense en ejecucion y la coleccion `study_modules` sincronizada.

## Agente de productividad

### POST /agent

- **Descripcion**: Pasa un `prompt` a Gemini, que puede llamar herramientas para gestionar tareas.
- **Body**:

```json
{
  "prompt": "Que deberia hacer hoy?"
}
```

- **Respuestas**:
  - `200 OK` con `{ "text": "..." }` cuando Gemini responde directamente.
  - `200 OK` con `{ "toolResult": {...} }` cuando se ejecuta una funcion:
    - `add_task`, `get_tasks`, `update_task_status`, `get_daily_recommendations`.
  - `400` si faltan argumentos requeridos por la herramienta.

## Texto a voz (TTS)

### POST /text-to-speech

- **Descripcion**: Crea un trabajo TTS asincrono.
- **Body**:

```json
{
  "text": "contenido del modulo"
}
```

- **Respuesta** `202 Accepted` con `{ "jobId": "uuid" }`.
- **Flujo**: publica `generateTTS`; el worker genera audio con Gemini, lo sube a Vercel Blob y actualiza la fila `tts_jobs`.

### GET /text-to-speech/:jobId

- **Descripcion**: Consulta el estado del trabajo.
- **Respuestas**:
  - `200` con `status` (`pending`, `completed`, `failed`).
  - Cuando `status == "completed"`, incluye `audioUrl`.
  - `404` si el `jobId` no existe.

## Progreso y logros

### POST /modules/complete

- **Descripcion**: Marca un modulo como completado por un usuario.
- **Body**:

```json
{
  "userId": 1,
  "moduleId": 23
}
```

- **Respuesta** `201 Created` con la fila de progreso y logros otorgados.
- **Errores**: `409` si ya estaba completado.

### GET /users/:userId/progress

- **Descripcion**: Retorna modulos completados y logros conseguidos por el usuario.

### GET /users/:userId/dashboard

- **Descripcion**: Resumen rapido (modulos completados, logros, proximo modulo, racha). Algunos campos son placeholders todavia.

## Quizzes

### POST /modules/:moduleId/quiz

- **Descripcion**: Encola la generacion de un quiz para un modulo.
- **Flujo**: publica `generateQuiz`; el worker usa `quizService` para crear preguntas y opciones.

### POST /quizzes/:quizId/submit

- **Descripcion**: Registra respuestas a un quiz y calcula puntaje.
- **Body** ejemplo:

```json
{
  "userId": 1,
  "answers": [{ "questionId": 10, "selectedOptionIndex": 2 }]
}
```

- **Respuesta**: `200` con `attemptId`, `score` y el detalle de cada pregunta.

### GET /users/:userId/performance

- **Descripcion**: Estadisticas de quizzes rendidos por un usuario (puntajes, fechas, promedio).

## Notas generales

- Todos los endpoints devuelven errores estructurados `{ "error": "mensaje" }`.
- Middleware de logging agrega `req.log`, lo cual permite trazar acciones en Pino.
- Para operaciones asincronas (study path, quiz, imagenes, TTS) el cliente debe consultar el estado mediante endpoints dedicados o actualizar la UI tras recibir un webhook (no implementado aun).
