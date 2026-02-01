FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

# Copia schema do prisma antes (pra aproveitar cache)
COPY prisma ./prisma

# Gera o Prisma Client dentro da imagem
RUN npx prisma generate

# Agora copia o resto do projeto
COPY . .

EXPOSE 3007
CMD ["node", "server.js"]
