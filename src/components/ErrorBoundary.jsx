import React from 'react';
import i18n from 'i18next';
import { translateTextSync } from '@/utils/translationService';

function tErr(text) {
  if (i18n.language === 'ar') return text;
  return translateTextSync(text) || text;
}

export class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (typeof console !== 'undefined') console.error('App error:', error, info);
  }

  render() {
    if (this.state.error) {
      const e = this.state.error;
      const rtl = i18n.language === 'ar';
      return (
        <div dir={rtl ? 'rtl' : 'ltr'} className="min-h-screen bg-muted p-6 flex items-center justify-center">
          <div className="max-w-2xl w-full bg-card rounded-lg shadow-lg p-6 border border-red-200">
            <h1 className="text-xl font-bold text-red-700 mb-2">{tErr('حدث خطأ في التطبيق')}</h1>
            <p className="text-foreground font-mono text-sm mb-3 break-all">{e?.message || String(e)}</p>
            {e?.stack && (
              <pre className="text-xs text-muted-foreground bg-muted p-3 rounded overflow-auto max-h-48">
                {e.stack}
              </pre>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              {tErr('إعادة تحميل الصفحة')}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
