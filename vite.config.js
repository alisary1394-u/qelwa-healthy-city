import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
// import { VitePWA } from 'vite-plugin-pwa' // TODO: Uncomment after installing

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
    // VitePWA({ // TODO: Uncomment after installing
    //   registerType: 'autoUpdate',
    //   workbox: {
    //     globPatterns: ['**/*.{js,css,html,ico,png,svg}']
    //   },
    //   includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
    //   manifest: {
    //     name: 'المدينة الصحية - محافظة قلوة',
    //     short_name: 'المدينة الصحية',
    //     description: 'نظام إدارة متكامل للمدينة الصحية',
    //     theme_color: '#ffffff',
    //     icons: [
    //       {
    //         src: 'pwa-192x192.png',
    //         sizes: '192x192',
    //         type: 'image/png'
    //       },
    //       {
    //         src: 'pwa-512x512.png',
    //         sizes: '512x512',
    //         type: 'image/png'
    //       }
    //     ]
    //   }
    // })
  ]
})