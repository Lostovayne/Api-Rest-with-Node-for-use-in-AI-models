# 🛣️ Roadmap de Ritmo

Este documento describe la hoja de ruta para el desarrollo de **Ritmo**, una aplicación de bienestar integral enfocada en ayudar a los usuarios a gestionar sus vidas a su propio ritmo, abarcando aprendizaje, productividad, hábitos y salud física/emocional.

---

## ✅ Fase 1: Refactorización y Fundamentos de Producción

*Objetivo: Solidificar la arquitectura actual, optimizar el manejo de archivos y asegurar que el proyecto esté listo para producción.*

- [x] **Integración de Almacenamiento de Blobs (Vercel Blob)**
    - [x] **Investigación y Configuración:**
        - [x] El usuario creará una cuenta en Vercel y obtendrá las credenciales de la API para Vercel Blob.
        - [x] Añadir las credenciales al sistema de variables de entorno (`.env`).
    - [x] **Implementación del Servicio:**
        - [x] Instalar la librería cliente de Vercel Blob (`bun add @vercel/blob`).
        - [x] Crear un nuevo servicio `services/blobService.ts` que encapsule la lógica de subida de archivos.
    - [x] **Refactorización del Worker de TTS:**
        - [x] Modificar la tabla `tts_jobs` en `db.ts`: reemplazar `audio_base64 TEXT` y `mime_type VARCHAR` por una única columna `audio_url TEXT`.
        - [x] Modificar la tarea `workers/tasks/tts.task.ts` para que:
            1. Decodifique el audio de Base64 a un buffer.
            2. Llame al `blobService` para subir el buffer.
            3. Guarde la URL devuelta por el `blobService` en la columna `audio_url` de la tabla `tts_jobs`.
- [x] **Revisión de Estándares de Producción**
    - [x] Analizar la configuración de seguridad actual (Helmet, CORS, Rate Limiting) y proponer mejoras si es necesario.
    - [x] Verificar que el logging sea consistente y provea suficiente información en un entorno de producción.
    - [x] Revisar el `Dockerfile` y el workflow de GitHub Actions para asegurar que siguen las mejores prácticas.

---

## 🎮 Fase 2: Engagement del Usuario (Gamificación y Tiempo Real)

*Objetivo: Aumentar la interacción y retención del usuario mediante sistemas de recompensa y notificaciones instantáneas.*

- [ ] **Implementación de Notificaciones en Tiempo Real (WebSockets)**
    - [ ] Crear un nuevo servicio de WebSockets (ej. usando la librería `ws`).
    - [ ] El cliente se conectará y suscribirá a eventos usando los `jobId` de las tareas asíncronas.
    - [ ] Modificar los workers (`quiz`, `tts`, `images`) para que, al finalizar una tarea, publiquen un evento en RabbitMQ.
    - [ ] El servicio de WebSockets escuchará estos eventos y notificará al cliente correspondiente en tiempo real.
- [ ] **Expansión del Sistema de Gamificación**
    - [ ] **Integración de Redis:**
        - [ ] Añadir Redis al stack. Usar una instancia local en desarrollo (Docker) y un servicio gestionado en producción (Railway/Upstash).
        - [ ] Instalar la librería cliente de Redis (ej. `ioredis`).
    - [ ] **Implementación de Leaderboards:**
        - [ ] Usar `Sorted Sets` de Redis para implementar tablas de clasificación (ej. "módulos completados por semana").
        - [ ] Crear nuevos endpoints en la API para consultar estos leaderboards.
    - [ ] **Sistema de Rachas (Streaks):**
        - [ ] Usar Redis para almacenar la última fecha de actividad de un usuario y calcular las rachas de estudio diarias.

---

## 🤖 Fase 3: IA Conversacional y Bienestar Integral

*Objetivo: Implementar el núcleo de la propuesta de valor de Ritmo, un asistente de IA y funcionalidades de seguimiento de objetivos personales.*

- [ ] **Tutor de IA Especializado (Chat con Memoria)**
    - [ ] **Almacenamiento de Conversaciones:**
        - [ ] Usar Redis para almacenar el historial de chat de cada usuario, manteniendo el estado de la conversación con el tutor.
    - [ ] **Implementación de RAG (Retrieval-Augmented Generation):**
        - [ ] Crear un nuevo endpoint de chat (ej. `POST /tutor/chat`).
        - [ ] Al recibir una pregunta, usar `pgvector` para buscar el contenido más relevante dentro de los módulos de estudio del usuario.
        - [ ] Enviar el contexto relevante junto con la pregunta del usuario a Gemini para obtener una respuesta precisa y basada en el material.
- [ ] **Módulo de Bienestar y Objetivos (Expansión del MVP)**
    - [ ] **Diseño de la Base de Datos:**
        - [ ] Crear nuevas tablas para `goals` (metas, ej. "Ahorrar 100€") y `habits` (hábitos, ej. "Jugar menos de 1h al día").
    - [ ] **Nuevos Endpoints de la API:**
        - [ ] Desarrollar endpoints CRUD para que el usuario gestione sus metas y hábitos.
    - [ ] **Integración con el Agente de IA:**
        - [ ] Expandir las herramientas del `agentController` para que pueda interactuar con las metas y hábitos del usuario.
        - [ ] Crear prompts y lógica para que el agente pueda dar consejos motivacionales, registrar el progreso y sugerir acciones para el bienestar físico y emocional.

---

## 🚀 Fase 4: Expansión de Servicios Base

*Objetivo: Integrar servicios especializados para potenciar las capacidades de búsqueda, IA y tareas automatizadas.*

- [ ] **Motor de Búsqueda de Texto (Typesense)**
    - [ ] Investigar e integrar **Typesense** para ofrecer búsqueda por palabra clave instantánea y avanzada sobre los módulos de estudio y otros recursos.
- [ ] **Base de Datos Vectorial Dedicada (Qdrant)**
    - [ ] Migrar de `pgvector` a **Qdrant** para mejorar el rendimiento y la escalabilidad de las búsquedas semánticas para el tutor de IA.
- [ ] **Gestor de Tareas Programadas (Ofelia)**
    - [ ] Implementar **Ofelia** para manejar tareas recurrentes como la limpieza de datos, envío de informes o recálculos periódicos.

---

## 🏗️ Fase 5: Infraestructura y Monitoreo (Largo Plazo)

*Objetivo: Asegurar la escalabilidad, fiabilidad y observabilidad de la plataforma a medida que crece.*

- [ ] **Implementación de un API Gateway**
    - [ ] Investigar e integrar un API Gateway como **Kong** para centralizar el enrutamiento, la autenticación y la seguridad.
- [ ] **Stack de Observabilidad**
    - [ ] **Métricas:** Integrar **Prometheus** para la recolección de métricas de rendimiento de la aplicación y los servicios.
    - [ ] **Visualización:** Usar **Grafana** para crear dashboards y visualizar las métricas de Prometheus, así como logs y trazas.
