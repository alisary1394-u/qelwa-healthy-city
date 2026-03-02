import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import '@/index.css'
// import * as Sentry from "@sentry/react"; // TODO: Uncomment after installing Sentry
// import './lib/i18n'; // TODO: Uncomment after installing i18next

/*
// Sentry.init({
//   dsn: import.meta.env.VITE_SENTRY_DSN,
//   integrations: [
//     new Sentry.BrowserTracing({
//       tracePropagationTargets: ["localhost", /^https:\/\/your-site\.com/],
//     }),
//     new Sentry.Replay(),
//   ],
//   tracesSampleRate: 1.0,
//   replaysSessionSampleRate: 0.1,
//   replaysOnErrorSampleRate: 1.0,
// });
*/

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
