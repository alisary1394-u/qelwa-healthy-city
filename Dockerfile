# بناء وتشغيل تطبيق المدينة الصحية على Railway
FROM node:20-bookworm-slim

WORKDIR /app

# تثبيت أدوات البناء للمكتبات الأصلية (better-sqlite3)
RUN apt-get update -y && apt-get install -y build-essential python3 && rm -rf /var/lib/apt/lists/*

# نسخ ملفات الاعتماديات
COPY package.json package-lock.json* ./
COPY server/package.json server/

# تثبيت كل الاعتماديات (بما فيها dev للبناء)
RUN npm ci 2>/dev/null || npm install
RUN cd server && npm ci 2>/dev/null || npm install

# نسخ الكود المصدري
COPY . .

# بناء الواجهة الأمامية
ENV NODE_ENV=production
RUN npm run build

# Railway يضبط PORT تلقائياً؛ التطبيق يستمع على 0.0.0.0
EXPOSE 3000

CMD ["node", "server/index.js"]
