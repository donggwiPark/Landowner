# ---- Build & run the fullstack app (Express API + Vite-built static client) ----
FROM node:22-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build the client (dist/) + server bundle (dist/server.cjs)
COPY . .
RUN npm run build

# Cloud Run serves on the port given by the PORT env var (defaults to 8080)
ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "dist/server.cjs"]
