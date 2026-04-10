FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci
RUN chmod +x node_modules/.bin/*

COPY prisma ./prisma
COPY src ./src

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push && npm run prisma:seed && npx tsx src/index.ts"]
