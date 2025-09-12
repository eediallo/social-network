# Frontend Dockerfile (stub)
FROM node:20-alpine AS deps
WORKDIR /app
COPY frontend/ ./
# placeholder; will replace with actual install/build when scaffolded

FROM node:20-alpine
WORKDIR /app
COPY --from=deps /app /app
EXPOSE 3000
CMD ["node", "server.js"]
