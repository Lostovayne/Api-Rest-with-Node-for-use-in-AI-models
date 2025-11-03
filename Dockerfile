# === Etapa 1: Build ===
# Se usa una imagen de Node completa para instalar dependencias y compilar el código.
FROM node:20 AS builder

WORKDIR /usr/src/app

# Copiar archivos de manifiesto del paquete.
COPY package.json package-lock.json ./

# Instalar todas las dependencias (incluyendo las de desarrollo para la compilación).
RUN npm install

# Copiar el resto del código fuente.
COPY . .

# Ejecutar el script de build para transpilar TypeScript a JavaScript.
RUN npm run build


# === Etapa 2: Producción ===
# Se usa una imagen 'slim' de Node para una imagen final más ligera.
FROM node:20-slim

WORKDIR /usr/src/app

# Copiar archivos de manifiesto del paquete.
COPY package.json package-lock.json ./

# Instalar únicamente las dependencias de producción.
RUN npm install --omit=dev

# Copiar la carpeta 'dist' con el código compilado desde la etapa de build.
COPY --from=builder /usr/src/app/dist ./dist

# Exponer el puerto en el que corre la aplicación.
EXPOSE 3000

# --- Comando de Inicio ---
# El comando por defecto inicia el servidor web.
# Para un servicio de worker (ej. en Railway), sobrescribe el comando de inicio con:
# ["node", "dist/workers/consumers/tasks.consumer.js"]
CMD ["node", "dist/api/server.js"]
