# 🧠 Study Path AI API

Backend para una plataforma de aprendizaje inteligente que genera rutas de estudio personalizadas, quizzes autogenerados, gamificación y búsqueda semántica.  
**Stack:** Express.js, TypeScript, RabbitMQ, PostgreSQL + pgvector, Docker.

---

## 🚀 Tecnologías Principales

- **Express.js**: API REST principal.
- **TypeScript**: Tipado estático y desarrollo moderno.
- **RabbitMQ**: Broker de mensajes para tareas asíncronas.
- **PostgreSQL + pgvector**: Base de datos relacional y búsqueda semántica.
- **Docker & Docker Compose**: Entorno reproducible y fácil de levantar.
- **amqplib**: Cliente Node para RabbitMQ.
- **OpenAI / Gemini / Groq**: Integración con modelos de IA.

---

## 📦 Arquitectura General

El sistema desacopla la API de las tareas pesadas usando RabbitMQ y workers.  
**Flujo resumido:**

```mermaid
graph TD
    A[Usuario] -->|HTTP Request| B(API Express)
    B -->|Publica tarea| C(RabbitMQ Exchange)
    C --> D(Queue: task_queue)
    E(Worker) -->|Consume tarea| D
    E -->|Procesa| F[Gemini/Groq/DB]
    F -->|Guarda resultado| G[PostgreSQL + pgvector]
    B <--|Consulta resultado| G
```

---

## 🗂️ Estructura del Proyecto

```
├── api/                # Lógica de la API Express
│   ├── controllers/
│   ├── routes/
│   └── server.ts
├── config/             # Configuración (RabbitMQ, etc.)
├── services/           # Lógica de negocio y workers
├── scripts/            # Scripts utilitarios (ej. embeddings)
├── utils/              # Helpers y utilidades
├── db.ts               # Conexión a la base de datos
├── docker-compose.yml  # Orquestación de servicios
├── .env.example        # Variables de entorno
├── tsconfig.json       # Configuración TypeScript
└── README.md
```

---

## 🐇 Flujo de RabbitMQ

```mermaid
sequenceDiagram
    participant API as Express API
    participant MQ as RabbitMQ
    participant Worker as Worker Node.js
    participant DB as PostgreSQL

    API->>MQ: Publica mensaje (tarea)
    MQ->>Worker: Entrega mensaje (consume)
    Worker->>DB: Procesa y guarda resultado
    API->>DB: Consulta resultado para el usuario
```

- **Exchange:** `task_exchange`
- **Queue:** `task_queue`
- **Routing Key:** `task_routing_key`
- **Config:** Ver `config/rabbitmq.config.ts`

---

## 🛠️ Instalación y Uso

### 1. Prerrequisitos

- Docker y Docker Compose
- Node.js v18+
- npm

### 2. Configuración

1. Clona el repositorio:
   ```bash
   git clone <repo-url>
   cd <nombre-del-proyecto>
   ```
2. Copia `.env.example` a `.env` y completa las variables necesarias.
3. Instala dependencias:
   ```bash
   npm install
   ```

### 3. Levantar el entorno

1. Inicia los servicios con Docker:

   ```bash
   docker-compose up -d --build
   ```

   - Levanta PostgreSQL (con pgvector) y RabbitMQ (con UI de gestión).

2. Inicia la API en modo desarrollo:

   ```bash
   npm run dev
   ```

3. (Opcional) Genera embeddings para búsqueda semántica:
   ```bash
   npm run generate-embeddings
   ```

---

## 🧩 Endpoints de la API

| Método | Endpoint                      | Descripción                                                 | Body / Parámetros de Ejemplo                                 |
| :---   | :---                          | :---                                                        | :---                                                         |
| `POST` | `/study-path`                 | **(Asíncrono)** Encola una tarea para generar una ruta de estudio. | `Body: { "topic": "string" }`                                |
| `GET`  | `/study-path/:id`             | Obtiene todos los módulos de una ruta de estudio específica. | `Parámetro: id` (ID de la ruta)                              |
| `GET`  | `/study-path-modules/:id`     | Obtiene un módulo de estudio específico por su ID.          | `Parámetro: id` (ID del módulo)                              |
| `POST` | `/generate-images-for-path`   | Genera las imágenes para todos los módulos de una ruta.     | `Body: { "studyPathId": number }`                           |
| `POST` | `/agent`                      | Interactúa con el agente inteligente para tareas y recom.   | `Body: { "prompt": "string" }`                               |
| `POST` | `/text-to-speech`             | **(Asíncrono)** Encola una tarea para convertir texto a voz. | `Body: { "text": "string" }`                                 |
| `POST` | `/modules/:moduleId/quiz`     | **(Asíncrono)** Encola una tarea para generar un quiz.      | `Parámetro: moduleId`                                        |
| `POST` | `/quizzes/:quizId/submit`     | Envía las respuestas de un quiz y obtiene el resultado.     | `Parámetro: quizId`, `Body: { "userId": number, "answers": [...] }` |
| `GET`  | `/users/:userId/performance`  | Obtiene el historial de rendimiento en quizzes de un usuario. | `Parámetro: userId`                                          |
| `POST` | `/modules/complete`           | Marca un módulo como completado por un usuario.             | `Body: { "userId": number, "moduleId": number }`             |
| `GET`  | `/users/:userId/progress`     | Obtiene el progreso de un usuario (módulos y logros).       | `Parámetro: userId`                                          |
| `GET`  | `/users/:userId/dashboard`    | Obtiene un resumen del dashboard de un usuario.             | `Parámetro: userId`                                          |
| `GET`  | `/search`                     | Realiza una búsqueda semántica en los módulos.              | `Query: ?q=tu-busqueda`                                      |
| `GET`  | `/health`                     | Verifica el estado de salud de la API.                      | N/A                                                          |

---

## 🌊 Flujo de Datos y Entidades

Este diagrama ilustra cómo los flujos de la aplicación se traducen en operaciones en la base de datos.

```mermaid
graph TD
    subgraph "1. Generar Ruta de Estudio"
        A[POST /study-path] --> B{RabbitMQ Task: generateStudyPath};
        B --> C[Worker];
        C --> D[IA Gemini];
        D --> E[Datos de la Ruta];
        C --> F1[DB: Inserta en 'study_paths'];
        F1 --> F2[DB: Inserta en 'study_path_modules'];
    end

    subgraph "2. Generar Quiz para un Módulo"
        G[POST /modules/:moduleId/quiz] --> H{RabbitMQ Task: generateQuiz};
        H --> I[Worker];
        I --> J[DB: Lee 'study_path_modules'];
        J --> K[IA Gemini];
        K --> L[Datos del Quiz];
        I --> M1[DB: Inserta en 'quizzes'];
        M1 --> M2[DB: Inserta en 'questions'];
    end

    subgraph "3. Enviar Respuestas del Quiz"
        N[POST /quizzes/:quizId/submit] --> O[API Server];
        O --> P[DB: Lee 'questions'];
        O --> Q1[DB: Inserta en 'user_quiz_attempts'];
        Q1 --> Q2[DB: Inserta en 'user_answers'];
    end

    %% Estilos para las operaciones de BD
    style F1 fill:#D6EAF8,stroke:#5DADE2
    style F2 fill:#D6EAF8,stroke:#5DADE2
    style M1 fill:#D1F2EB,stroke:#48C9B0
    style M2 fill:#D1F2EB,stroke:#48C9B0
    style Q1 fill:#FDEDEC,stroke:#F1948A
    style Q2 fill:#FDEDEC,stroke:#F1948A
```

---

## 🗺️ Roadmap

- [ ] Refactorizar workers para tareas pesadas (rutas, imágenes, quizzes).
- [ ] Notificaciones en tiempo real (WebSockets).
- [ ] Mejorar seguridad y validaciones.
- [ ] Documentar endpoints con Swagger.

---

## 📝 Notas para Desarrolladores Nuevos

- **RabbitMQ** se usa para desacoplar la API de las tareas pesadas. Consulta y modifica la configuración en `config/rabbitmq.config.ts`.
- **pgvector** permite búsquedas semánticas avanzadas en PostgreSQL.
- **Docker Compose** facilita levantar todo el entorno con un solo comando.
- **TypeScript** mejora la mantenibilidad y escalabilidad del código.

---

¿Dudas? Revisa los archivos de configuración y scripts, y consulta este README para entender el flujo y cómo contribuir.
