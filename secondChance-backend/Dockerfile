FROM node:22-slim

WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY . .
RUN chown -R node:node public/images

EXPOSE 3060
USER node

CMD ["node", "app.js"]
