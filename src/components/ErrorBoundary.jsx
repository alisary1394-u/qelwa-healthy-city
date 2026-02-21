import React from 'react';

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
      return (
        <div dir="rtl" className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-6 border border-red-200">
            <h1 className="text-xl font-bold text-red-700 mb-2">حدث خطأ في التطبيق</h1>
            <p className="text-gray-800 font-mono text-sm mb-3 break-all">{e?.message || String(e)}</p>
            {e?.stack && (
              <pre className="text-xs text-gray-600 bg-gray-100 p-3 rounded overflow-auto max-h-48">
                {e.stack}
              </pre>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
