FROM node:25-alpine3.22

WORKDIR /app

# Install the requirements
# three.js, vite, ws, etc.
ARG FRONTEND=../dist # Location of prod output
COPY ./package.json ./package-lock.json ./entrypoint.sh ./dist/ .

RUN npm install

EXPOSE ${PORT:-3000}

RUN chmod +x entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]
