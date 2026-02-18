FROM --platform=linux/amd64 node:18.20.4
USER root
WORKDIR /app

RUN apt-get update && apt-get install -y python3 python3-pip git curl && \
    pip3 install --break-system-packages requests unidecode openai && \
    rm -rf /var/lib/apt/lists/*

COPY package.json tsconfig.json ./
RUN npm install

COPY src/ ./src/

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npx", "tsx", "src/index.ts"]
