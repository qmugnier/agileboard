FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN npm run build

FROM node:18-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=0 /app/build ./build

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]
