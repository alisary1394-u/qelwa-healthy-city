import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// إضافة Base44 إن وُجد (اختياري للتشغيل المحلي)
let base44Plugin = []
try {
  const base44 = require('@base44/vite-plugin')
  base44Plugin = [base44({
    legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
    hmrNotifier: true,
    navigationNotifier: true,
    visualEditAgent: true
  })]
} catch (_) {
  // التطبيق يعمل بدون الإضافة إذا لم تكن مثبتة
}

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    ...base44Plugin,
    react(),
  ]
})