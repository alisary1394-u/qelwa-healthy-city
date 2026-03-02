import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * PageContainer wraps every page with:
 * - Consistent padding & max width
 * - Entrance animation (animate-in)
 * - Optional loading skeleton
 */
export function PageContainer({ children, className = '' }) {
  return (
    <div className={`page-container animate-in ${className}`}>
      {children}
    </div>
  );
}

/**
 * PageHeader renders a standard page title row.
 */
export function PageHeader({ title, description, icon: Icon, children }) {
  return (
    <div className="page-header">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </div>
      {children && <div className="flex items-center gap-2 flex-shrink-0">{children}</div>}
    </div>
  );
}

/**
 * PageLoading — full page centered spinner with skeleton effect
 */
export function PageLoading({ message = 'جاري التحميل...' }) {
  return (
    <div className="page-container">
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
    </div>
  );
}

/**
 * PageSkeleton — renders a skeleton loading placeholder
 */
export function PageSkeleton({ rows = 4 }) {
  return (
    <div className="page-container animate-in">
      {/* Title skeleton */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="skeleton w-10 h-10 rounded-xl" />
          <div className="space-y-2">
            <div className="skeleton h-6 w-48 rounded" />
            <div className="skeleton h-4 w-32 rounded" />
          </div>
        </div>
      </div>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border p-4 space-y-3" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="skeleton h-4 w-20 rounded" />
            <div className="skeleton h-8 w-16 rounded" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="bg-card rounded-xl border p-6 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="skeleton w-10 h-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 rounded" style={{ width: `${70 + Math.random() * 30}%` }} />
              <div className="skeleton h-3 rounded" style={{ width: `${40 + Math.random() * 30}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * EmptyState — consistent empty state across pages
 */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-muted-foreground/50" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
