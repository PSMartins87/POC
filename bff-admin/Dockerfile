# ==========================================
# ESTÁGIO 1: BUILD (Compilação)
# ==========================================
FROM node:24-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci 
COPY . .
RUN npm run build
# ==========================================
# ESTÁGIO 2: PRODUÇÃO (Runtime Seguro)
# ==========================================
FROM node:24-alpine AS production
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev  && npm cache clean --force
COPY --from=builder /usr/src/app/dist ./dist
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]