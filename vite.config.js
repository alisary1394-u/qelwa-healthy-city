import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// إضافة إضافية إن وُجدت (اختياري للتشغيل المحلي)
let extraPlugin = []
try {
  const pkg = require('@base44/vite-plugin')
  extraPlugin = [pkg({
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
    ...extraPlugin,
    react(),
  ]
})