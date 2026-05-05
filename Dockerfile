FROM node:22-slim
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY src/ src/
COPY tsconfig.json ./

EXPOSE 3000
CMD ["node", "--import", "tsx", "src/index.ts"]
