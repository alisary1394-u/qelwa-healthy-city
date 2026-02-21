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

# الدومين الرسمي (ليظهر qeelwah.com فقط) — أضف في Railway Variables: VITE_CANONICAL_URL=https://qeelwah.com
ARG VITE_CANONICAL_URL
ENV VITE_CANONICAL_URL=$VITE_CANONICAL_URL
ENV NODE_ENV=production
RUN npm run build

# Railway يضبط PORT تلقائياً (غالباً 8080)؛ التطبيق يستمع على 0.0.0.0
EXPOSE 8080

# Custom Start Command على Railway = npm start
CMD ["npm", "start"]
