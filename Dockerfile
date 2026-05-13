FROM node:22-alpine AS deps

WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci

FROM deps AS builder

WORKDIR /app
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/be_02?schema=public
ENV DATABASE_URL=$DATABASE_URL
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]
