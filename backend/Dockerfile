FROM node:20-alpine

WORKDIR /app

# Install build dependencies for sqlite3 native compilation if needed
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

CMD ["node", "server.js"]
