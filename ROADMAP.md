# 🛣️ Roadmap de Ritmo

Ritmo es la plataforma de bienestar y aprendizaje que combina rutas de estudio, habitos y soporte emocional. Este roadmap resume el estado actual del backend y el orden propuesto para avanzar el MVP.

---

## ✅ Fase 0: Fundacion del MVP (completado)

- [x] Levantar API Express con seguridad base (Helmet, CORS, rate limiting) y logging centralizado con Pino.
- [x] Definir esquema de PostgreSQL con pgvector para rutas, modulos, quizzes, logros y trabajos TTS.
- [x] Configurar RabbitMQ y el worker `tasks.consumer` para manejar trabajos asincronos.
- [x] Implementar generacion de rutas de estudio con Gemini + embeddings y persistencia en base de datos.
- [x] Implementar pipeline de quiz: generacion asincrona, almacenamiento y evaluacion de respuestas.
- [x] Implementar sistema de texto a voz usando Gemini y almacenamiento en Vercel Blob.
- [x] Implementar servicio de logros y rachas basico (asignacion de logros al completar modulos).
- [x] Integrar busqueda semantica con pgvector (`GET /search`).

---

## ✅ Fase 1: Fundamentos de produccion

- [x] Integracion con Vercel Blob para archivos de audio generados por TTS.
- [x] Revisar middleware de seguridad y logging para entornos productivos.
- [x] Revisar `Dockerfile` y pipeline de GitHub Actions (`docker-publish.yml`).
- [x] Documentacion tecnica inicial (`docs/`): arquitectura, endpoints, flujos y setup local.
- [x] Añadir servicio de Typesense al `docker-compose.yml` para desarrollo local y parseo automatico de variables de entorno (`config/typesense.config.ts`).

---

## 🟡 Fase 2: Flujo MVP Ritmo (en progreso)

- [x] **Onboarding de usuario**: exponer `POST /users` y endpoints de consulta para obtener `userId` y preferencias iniciales.
- [x] **Tracking de solicitudes asincronas**: crear tabla `study_path_requests` (u otra estructura) que devuelva `requestId` al llamar `POST /study-path` y permita poll con `GET /study-path-requests/:id`.
- [x] **Endpoints de consumo diario**:
  - [x] `GET /study-paths` (listar rutas disponibles por usuario/tema).
  - [x] `GET /modules/:id/quiz` o similar para saber si existe quiz generado.
  - [x] Endpoint para listar trabajos TTS por modulo o usuario.
- [x] **Resumen diario**: `GET /users/:id/timeline` con módulos pendientes, quizzes listos, audios generados y logros recientes.
- [x] **Documentacion del flujo end-to-end**: actualizar `docs/endpoints.md`, `docs/workflows.md`, `docs/mvp-flow.http` y guias para Android con pasos de polling y estados.
- [ ] **Mi Día asistido**: exponer `POST /users/:id/day-plan` y `GET /users/:id/day-plan` que invoquen la herramienta `get_daily_recommendations`, mezclen tareas abiertas, progreso de rutas y preferencias, y devuelvan un layout listo para la UI.
- [ ] **Sincronización con el asistente**: ampliar el agente para registrar estado de ánimo, energía, gustos y preocupaciones mediante nuevas herramientas (`log_mood_snapshot`, `log_user_fact`) y persistirlas.
- [ ] **Seed y pruebas del MVP**: script que cree usuario demo + ruta ejemplo y checklist/manual de pruebas (curl/Postman) para validar el recorrido completo.

---

## 🔷 Fase 3: Engagement y contexto personal

### Estado de animo y bienestar integral

- [ ] Capturar estado de animo, energia y estres via `POST /users/:id/mood` y almacenar un historial consultable.
- [ ] Generar analiticas sencillas (`GET /users/:id/mood/summary`) con promedios, rachas y alertas.
- [ ] Ajustar generacion de rutas y Mi Día para proponer descansos, ejercicio ligero o contenidos calmantes segun el estado del usuario.

### Diario personal y hechos relevantes

- [ ] Crear herramienta del agente `record_user_journal` que estructure eventos, preocupaciones y logros reportados en chat.
- [ ] Exponer `GET /users/:id/journal` para que el cliente muestre destacados diarios/semana y generar recordatorios de reflexion.

### Motor de busqueda de texto (Typesense)

- [x] Desplegar imagen de Typesense en Railway para produccion.
- [x] Habilitar instancia local via Docker Compose e indexar modulos desde los workers.
- [ ] Evaluar Typesense Cloud y definir estrategia de alta disponibilidad y backups.
- [ ] Completar endpoints de administracion (reindexacion manual, verificacion de estado) y documentar proceso de seed.

### Notificaciones push (Firebase Cloud Messaging)

- [ ] Crear proyecto Firebase y credenciales de Admin SDK.
- [ ] Implementar servicio en el backend para enviar notificaciones tras finalizar trabajos (quiz, TTS, rutas).
- [ ] Coordinar con el cliente Android para recibir tokens y manejar notificaciones en la UI.

### Gamificacion extendida

- [ ] Añadir Redis al stack (Docker en dev, servicio gestionado en prod).
- [ ] Implementar leaderboards con `Sorted Sets`.
- [ ] Implementar sistema de rachas diarias apoyado en Redis.
- [ ] Incorporar logros contextuales vinculados a bienestar (ej. "5 dias consecutivos equilibrando estudio y descanso").

### Generacion dinamica de imagenes

- [ ] Incorporar un extractor de entidades (PLN) en el pipeline de prompts para imagenes, de modo que los modulos cuenten con descripciones más ricas cuando se expanda a nuevos dominios.

---

## 🤖 Fase 4: IA conversacional y bienestar integral

- [ ] Persistir historiales de chat (Redis) para el tutor personalizado.
- [ ] Crear endpoint RAG (`POST /tutor/chat`) que combine pgvector + Gemini.
- [ ] Disenar y exponer endpoints para metas (`goals`) y habitos (`habits`).
- [ ] Ampliar herramientas del agente para gestionar metas/habitos y dar seguimiento emocional.

---

## 🚀 Fase 5: Infraestructura avanzada y monitoreo

- [ ] Evaluar migracion a base vectorial dedicada (Qdrant) conforme crezca el volumen.
- [ ] Integrar scheduler (Ofelia) para tareas recurrentes (limpieza, reportes, recordatorios).
- [ ] Integrar un API Gateway (Kong) para centralizar seguridad y rate limiting.
- [ ] Implementar stack de observabilidad: Prometheus + Grafana (metricas, logs, trazas).

---

## Seguimiento y proximos pasos

- Mantener la carpeta `docs/` alineada con cada entrega para que el equipo Android e IAs asistentes tengan contexto actualizado.
- Prioridad inmediata: completar la **Fase 2** y validar el flujo MVP de inicio a fin; despues avanzar con estado de animo/notificaciones segun la Fase 3.
