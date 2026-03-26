FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Diagnostic: list files and show tsconfig before building (temporary)
RUN echo "=== /app listing ===" && ls -la
RUN echo "=== src listing ===" && ls -la src
RUN echo "=== tsconfig.json ===" && cat tsconfig.json
RUN echo "=== tsconfig.build.json ===" && cat tsconfig.build.json
RUN node -v || true && npm -v || true && npx -v || true

RUN npm run build

CMD ["node", "dist/main.js"]