FROM node:20-alpine

WORKDIR /app

# Copiar package files primero (cache de capas)
COPY package*.json ./

# Instalar dependencias de producción
RUN npm install --production

# Copiar el resto del proyecto
COPY . .

# Crear directorio de uploads
RUN mkdir -p uploads/actos uploads/mesa-partes tmp

# Exponer puerto
EXPOSE 3002

# Comando de inicio
CMD ["node", "server.js"]
