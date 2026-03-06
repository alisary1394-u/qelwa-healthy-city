import React from 'react';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';

/**
 * <T> – Inline auto-translation component.
 * Translates dynamic text (user-entered data) to the current app language.
 *
 * Usage:
 *   <T>{member.full_name}</T>
 *   <T text={initiative.name} />
 *   <T className="font-bold">{committee.description}</T>
 *
 * Props:
 *   text     – text to translate (alternative to children)
 *   children – text to translate
 *   as       – wrapper element (default: React.Fragment, use 'span' for inline styling)
 *   className, style – forwarded to wrapper when as != Fragment
 *   fallback – shown while translating (default: original text)
 */
export default function T({ text, children, as: Wrapper, className, style, fallback }) {
  const original = text || (typeof children === 'string' ? children : (Array.isArray(children) ? children.filter(c => c != null && c !== false && c !== '').join('') : null));
  const { translated, isTranslating } = useAutoTranslate(original);

  if (!original) return children || null;

  const display = isTranslating ? (fallback || original) : translated;

  if (Wrapper) {
    return <Wrapper className={className} style={style}>{display}</Wrapper>;
  }

  if (className || style) {
    return <span className={className} style={style}>{display}</span>;
  }

  return <>{display}</>;
}

/**
 * <TBlock> – Block-level auto-translation with loading indicator.
 * Shows a subtle shimmer while translating.
 */
export function TBlock({ text, children, className = '' }) {
  const original = text || (typeof children === 'string' ? children : null);
  const { translated, isTranslating } = useAutoTranslate(original);

  if (!original) return children || null;

  return (
    <span className={`${className} ${isTranslating ? 'animate-pulse opacity-70' : ''}`}>
      {translated}
    </span>
  );
}
