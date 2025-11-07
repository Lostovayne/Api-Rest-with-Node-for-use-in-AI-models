# Arquitectura de alto nivel

## Componentes principales

- **API Express** (carpeta `api/`): expone endpoints REST, aplica middleware de seguridad (Helmet, CORS, rate limiting) y logging con Pino.
- **PostgreSQL + pgvector** (`db.ts`): almacena usuarios, rutas de estudio, modulos, quizzes, logros y trabajos de TTS. Pgvector habilita busqueda semantica.
- **RabbitMQ** (`config/rabbitmq.config.ts` y `services/queueService.ts`): gestiona colas para trabajos asincronos.
- **Workers** (`workers/`): procesos independientes que consumen mensajes de RabbitMQ y ejecutan tareas largas.
- **Typesense** (`services/typesenseService.ts`): motor de busqueda por texto para modulos, disponible tanto en Railway (produccion) como local via Docker.
- **Gemini y Groq** (`services/geminiService.ts`, `services/grokService.ts`): modelos de IA usados para generar rutas, quizzes, TTS e imagenes.
- **Vercel Blob** (`services/blobService.ts`): almacenamiento de audio generado por TTS.

## Flujo de request basico

1. Cliente envia una peticion HTTP a la API Express.
2. La API valida y persiste datos en PostgreSQL usando `db.ts`.
3. Para tareas pesadas la API publica un mensaje en RabbitMQ mediante `queueService`.
4. `workers/consumers/tasks.consumer.ts` consume el mensaje y ejecuta la tarea especifica (ej. generar ruta, quiz, TTS).
5. Los workers pueden llamar servicios externos (Gemini, Groq, Vercel Blob, Typesense) y actualizar la base de datos con los resultados.
6. El cliente consulta endpoints de estado (ej. `GET /text-to-speech/:id`) para conocer el progreso.

## Servicios externos y credenciales

| Servicio    | Uso                                 | Variables clave                                                                                       |
| ----------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| PostgreSQL  | Persistencia                        | `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_DATABASE`, `DB_PORT`                                         |
| RabbitMQ    | Colas de tareas                     | `RABBITMQ_USER`, `RABBITMQ_PASS`, `RABBITMQ_URL` (opcional)                                           |
| Typesense   | Busqueda por texto                  | `TYPESENSE_HOST`, `TYPESENSE_PORT`, `TYPESENSE_PROTOCOL`, `TYPESENSE_API_KEY`, `TYPESENSE_PUBLIC_URL` |
| Gemini      | Generacion de texto, embedding, TTS | `API_KEY`                                                                                             |
| Groq        | Generacion de imagenes              | `XAI_API_KEY`                                                                                         |
| Vercel Blob | Almacenamiento de audio             | `BLOB_READ_WRITE_TOKEN`                                                                               |

## Procesos en ejecucion

- `npm run dev`: levanta API y worker en paralelo (usa `concurrently` con `developer` y `start:worker`).
- `npm run start:worker`: ejecuta solo el consumidor de RabbitMQ si deseas levantarlo aparte.
- `docker compose up`: levanta PostgreSQL, RabbitMQ y Typesense para desarrollo local.

Mantener tanto la API como el worker activos es necesario para que las tareas asincronas se completen.
