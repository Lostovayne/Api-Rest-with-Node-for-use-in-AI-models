# Documentacion de Ritmo API

Bienvenido al paquete de documentacion tecnica del backend de Ritmo. Este backend expone servicios de productividad y bienestar para la aplicacion Android que se construira en Kotlin. Aqui encontraras:

- arquitectura general del sistema y dependencias externas
- listado completo de endpoints HTTP y como consumirlos
- descripcion de los flujos asincronos basados en RabbitMQ y workers
- guia rapida de ejecucion local con Docker Compose y variables de entorno

## Estructura de la documentacion

- [Arquitectura](architecture.md): componentes, servicios externos y dependencias.
- [Endpoints](endpoints.md): contratos HTTP con ejemplos.
- [Flujos y jobs](workflows.md): pasos, colas y workers involucrados en cada proceso.
- [Setup local](setup-local.md): como levantar la API, los workers y los servicios de apoyo en desarrollo.

Mantener estos archivos actualizados permite que nuevos servicios (por ejemplo el cliente Android o agentes de IA) comprendan el estado del backend y lo consuman correctamente.
