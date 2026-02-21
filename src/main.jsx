import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import '@/index.css'

// من يفتح عبر railway.app يُوجّه مرة واحدة إلى qeelwah.com (ليظهر العنوان الصحيح)
const host = typeof window !== 'undefined' ? window.location.hostname || '' : ''
const canonical = 'https://qeelwah.com'
if (import.meta.env.PROD && host.includes('railway.app')) {
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
