---
layout: default
title: Ritmo Backend Docs
---

# Ritmo Backend

Bienvenido a la documentación del backend de Ritmo. Este sitio resume los componentes principales, endpoints y flujos que la app Android consume. Usa el menú (o los enlaces siguientes) para navegar.

## Guías rápidas

- [Arquitectura general](architecture.md)
- [Contratos de endpoints](endpoints.md)
- [Flujos asincrónicos (RabbitMQ + workers)](workflows.md)
- [Guía para la app Android/Kotlin](android-ai-brief.md)
- [Setup local con Docker y scripts](setup-local.md)
- [Checklist de pruebas manuales del MVP](mvp-flow.http)

## Flujo MVP en un vistazo

1. **Onboarding** (`POST /users`) para obtener `userId`.
2. **Generación de ruta** (`POST /study-path` → polling `GET /study-path-requests/:id`).
3. **Consumo diario**: módulos, quizzes, TTS y progreso mediante los endpoints documentados.
4. **Búsqueda**: semántica (pgvector) y keyword (Typesense).

Cada sección detalla ejemplos JSON, colas de RabbitMQ implicadas y consideraciones para el cliente Android. Mantén estos documentos actualizados junto con el código para que el equipo pueda desplegar y probar rápidamente.

> ¿Nuevo en el proyecto? Empieza por [Setup local](setup-local.md) y luego revisa la guía de Android para entender el flujo completo.
