FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

COPY . .

ARG DATABASE_URL=postgresql://build:build@localhost:5432/build?schema=public

RUN npm ci

RUN npx prisma generate --config prisma7.config.ts

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]