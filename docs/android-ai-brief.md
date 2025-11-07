# Guía para el asistente de Android (Kotlin)

Este documento resume cómo la app Android debe consumir el backend de Ritmo. Está pensado para ser utilizado por un modelo de IA en Android Studio que genere código Kotlin siguiendo nuestro flujo objetivo.

## Configuración base

- **Base URL**: `http://10.0.2.2:3000` para el emulador (o la IP local en dispositivos reales).
- **Formato**: todos los endpoints responden JSON con errores `{ "error": "mensaje" }`.
- **Headers**: usar `Content-Type: application/json` en peticiones con body.
- **Autenticación**: no existe todavía. El `userId` se gestiona desde la app tras crear o recuperar un usuario.

## Flujo principal de la app

1. **Onboarding / registro**

   - Vista inicial solicita `username` (y opcionalmente avatar/gusto inicial para personalizar UI).
   - Consumir `POST /users` y guardar `id` devuelto como `userId` persistente (SharedPreferences / DataStore).
   - Luego mostrar pantalla para ingresar objetivo/tema del día.

2. **Solicitud de ruta de estudio**

   - Botón principal “Crear ruta” envía `POST /study-path` con `topic` y `userId`.
   - Guardar `requestId` de la respuesta.
   - Mostrar pantalla de estado con mensaje “Generando ruta…” y realizar polling cada 5–8 segundos usando `GET /study-path-requests/:requestId` hasta que `status` sea `completed` o `failed`.
   - Cuando se reciba `modules`, almacenar `studyPathId` y navegar a la vista de ruta.

3. **Listado de rutas**

   - Home muestra el histórico con `GET /study-paths?userId={userId}` (orden descendente).
   - Cada tarjeta abre el detalle usando `GET /study-path/:id` para cargar módulos con `image_url`.

4. **Detalle de módulo**

   - Campos a mostrar: `title`, `description`, `subtopics`, `image_url`.
   - Acciones:
     - “Escuchar” → ejecutar `POST /text-to-speech` con `text`, `userId`, `moduleId` y luego mostrar estado usando `GET /text-to-speech/:jobId` o `GET /text-to-speech?userId=...`.
     - “Quiz” → consultar `GET /modules/:moduleId/quiz`. Si no hay quiz, mostrar mensaje y un botón para generar (`POST /modules/:moduleId/quiz`).
     - “Marcar completado” → `POST /progress/modules/complete` y refrescar timeline/progreso.

5. **Timeline diario**

   - Pantalla “Hoy” llama `GET /progress/users/{userId}/timeline` para mostrar:
     - Últimas solicitudes (`requests`), rutas (`studyPaths`), módulos pendientes (`pendingModules`), quizzes, trabajos TTS, logros, progreso reciente.
   - Cada sección puede desplegar tarjetas con CTA directas (ir al módulo, escuchar audio, etc.).

6. **Búsqueda**

   - Barra de búsqueda con dos pestañas:
     - “Recomendado” → `GET /search?q=` (pgvector, resultados semánticos).
     - “Rápido” → `GET /search/typesense?q=` (keyword).
   - Cada resultado enlaza al módulo correspondiente (requiere `study_path_id` y `module_id`).

7. **Gestión de trabajos TTS**

   - Mostrar lista de audios generados con `GET /text-to-speech?userId=...` (ordenados por creación).
   - Permitir reproducir `audioUrl` cuando `status == "completed"`.

8. **Progreso y logros**

   - Vista “Perfil” o “Progreso” usa `GET /progress/users/{userId}/progress` y `GET /progress/users/{userId}/dashboard`.
   - Mostrar logros con iconos (usar `generated_image_url` cuando exista).

9. **Estados y errores**
   - Manejar estados `pending`, `processing`, `failed`, `completed` en las respuestas.
   - Mostrar mensajes de error legibles usando `response.error` cuando el backend devuelva códigos 4xx/5xx.

## Esquema propuesto de pantallas

1. **Splash / Validación de sesión**: verifica si hay `userId` almacenado; redirige al onboarding si no.
2. **Onboarding**:
   - Paso 1: ingreso de username.
   - Paso 2: selección rápida de meta/estado del día (preparar para Fase 3, almacenar en local por ahora).
3. **Home / Timeline**: tarjetas con próximos pasos, rutas pendientes, audios recientes.
4. **Nueva ruta**: formulario simple con input de tema, botón para enviar, pantalla de progreso (polling).
5. **Lista de rutas**: historial con fecha y tema.
6. **Detalle de ruta**: lista de módulos con imágenes; acciones descritas antes.
7. **Detalle de módulo**: play audio, quiz, progreso.
8. **Búsqueda**: pestañas Semántica / Keyword, con chips de filtros futuros.
9. **Perfil / Progreso**: logros, estadísticas, botón para ver quizzes completados.

## Consideraciones técnicas para la IA

- Usar corrutinas (Kotlin) + Retrofit para peticiones HTTP.
- Implementar un servicio de polling reutilizable para solicitudes asincronas (`study-path` y TTS cuando se quiera actualizar automáticamente).
- Todas las peticiones deben incluir manejo de timeouts y reintentos suaves.
- Diseñar modelos de datos en Kotlin siguiendo los ejemplos de `docs/endpoints.md`.
- Preparar hooks para Fase 3 (mood / objetivos rápidos) guardando esos datos en el perfil local del usuario.

## Próximos pasos esperados en Android

1. Implementar capa de datos (Retrofit + modelos) basados en este documento.
2. Crear ViewModels que expongan estados (`Loading`, `Success`, `Error`) para cada flujo asincrono.
3. Diseñar UI en Jetpack Compose (recomendado) usando las pantallas listadas.
4. Preparar pruebas manuales siguiendo `docs/mvp-flow.http` y un emulador Pixel/Android 14.

Esta guía debe mantenerse sincronizada con los cambios del backend para que el asistente de Android genere código alineado con el MVP real.
