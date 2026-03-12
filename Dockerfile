FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY . .

RUN npm install

RUN npx prisma generate

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && node src/index.js"]



