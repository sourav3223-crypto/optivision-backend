FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
COPY src ./src

RUN mkdir -p uploads

EXPOSE 5000

CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && node prisma/seed.js && node src/index.js"]

