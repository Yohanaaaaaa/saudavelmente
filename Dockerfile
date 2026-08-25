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

# Aplica as migrations pendentes antes de subir a API. Sem isso a imagem nova
# sobe contra o schema antigo e as consultas quebram com erro 500.
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
