FROM node:18-alpine as builder

WORKDIR /app

# Копируем файлы package.json и yarn.lock
COPY package.json yarn.lock ./

# Устанавливаем зависимости
RUN yarn install --frozen-lockfile

# Копируем исходный код
COPY . .

# Собираем приложение
RUN yarn build

FROM node:18-alpine

WORKDIR /app

# Копируем необходимые файлы из builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Создаем директорию для логов
RUN mkdir -p temp/logs

# Запускаем приложение
CMD ["yarn", "start"] 