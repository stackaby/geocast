FROM node:25-alpine3.22

WORKDIR /app

# Install the requirements
# three.js, vite, ws, etc.
ARG DEV
ARG BACKEND=./assets/scripts/server.js
COPY ./package.json ./package-lock.json ${BACKEND} .

RUN npm install

EXPOSE 8080

CMD ["node", "server.js"]
