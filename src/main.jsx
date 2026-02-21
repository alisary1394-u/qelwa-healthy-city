import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import '@/index.css'

// الدومين الرسمي: qeelwah.com فقط (بدون www وبدون رابط Railway)
const canonicalFromEnv = (import.meta.env.VITE_CANONICAL_URL || '').replace(/\/$/, '')
const canonical = canonicalFromEnv || 'https://qeelwah.com'
const host = (typeof window !== 'undefined' && window.location.hostname) || ''
let redirectToCanonical = false
if (import.meta.env.PROD && typeof window !== 'undefined') {
  try {
    const canonicalHost = new URL(canonical).hostname
    const isRailway = host.includes('railway.app')
    const isWwwOfCanonical = host === `www.${canonicalHost}`
    redirectToCanonical = (isRailway || isWwwOfCanonical) && canonicalHost
  } catch (_) {
    redirectToCanonical = host.includes('railway.app') || host.startsWith('www.')
  }
}

if (redirectToCanonical) {
  const target = canonical + window.location.pathname + window.location.search + window.location.hash
  window.location.replace(target)
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
}
