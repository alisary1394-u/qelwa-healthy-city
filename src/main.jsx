import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import '@/index.css'

// إعادة توجيه من رابط Railway فقط إلى الدومين الرسمي (بدون لمس www لتجنب حلقة التوجيه)
const canonical = (import.meta.env.VITE_CANONICAL_URL || 'https://qeelwah.com').replace(/\/$/, '')
const host = (typeof window !== 'undefined' && window.location.hostname) || ''
const isRailway = host.includes('railway.app')
const redirectToCanonical = import.meta.env.PROD && typeof window !== 'undefined' && isRailway && canonical

if (redirectToCanonical) {
  window.location.replace(
    canonical + window.location.pathname + window.location.search + window.location.hash
  )
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
}
