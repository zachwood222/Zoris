FROM node:20
WORKDIR /workspace/app/web
COPY app/web/package.json app/web/package-lock.json* ./
RUN npm install || true
COPY app/web .
