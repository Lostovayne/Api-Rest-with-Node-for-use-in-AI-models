# Setup local de desarrollo

## Requisitos previos

- Node.js 20+
- Docker y Docker Compose
- Credenciales de servicios externos (Gemini, Groq, Vercel Blob)

## Pasos

1. Copia `.env.example` a `.env` y completa valores. Para desarrollo local recomienda:

   - `DB_HOST=localhost`
   - `DB_PORT=5432`
   - `RABBITMQ_USER=user` y `RABBITMQ_PASS=password`
   - `TYPESENSE_HOST=localhost`
   - `TYPESENSE_PORT=8108`
   - `TYPESENSE_PROTOCOL=http`
   - `TYPESENSE_API_KEY` igual al valor usado en `docker-compose.yml` (por defecto `changeme`).

2. Arranca los servicios de apoyo:

```
docker compose up -d db rabbitmq typesense
```

Esto crea volumenes persistentes para PostgreSQL, RabbitMQ y Typesense.

3. Instala dependencias Node:

```
npm install
```

4. Inicia la API y el worker en paralelo:

```
npm run dev
```

Este script usa `concurrently` para ejecutar `developer` (API Express) y `start:worker` (consumidor de RabbitMQ).

5. Si necesitas ejecutar el worker por separado:

```
npm run start:worker
```

6. Verifica salud:
   - API en `http://localhost:3000/health`
   - RabbitMQ UI en `http://localhost:15672`
   - Typesense en `http://localhost:8108/health`

## Datos iniciales

`createTables` y `seedDatabase` se ejecutan al iniciar la API. Crean tablas, habilitan `pgvector` y cargan logros base. No es necesario correr migraciones manuales.

## Variables para produccion

Mantener un archivo separado (ej. `.env.production`) con valores de Railway/servicios gestionados. Ajusta `TYPESENSE_PUBLIC_URL` y `TYPESENSE_PROTOCOL=https` para la instancia en la nube.
