FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY assets ./assets
RUN npm run build
ENV NODE_ENV=production
ENV AI_PROVIDER=fal
EXPOSE 4000
CMD ["node", "dist/server.js"]
