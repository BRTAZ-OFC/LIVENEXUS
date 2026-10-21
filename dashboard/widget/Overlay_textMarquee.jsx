import React from 'react';

export function TextMarquee({ text = '', isMainChat = false, forceMarquee = false, className = '', style = {} }) {
  if (isMainChat) {
    return <div className={className} style={style}>{text}</div>;
  }

  const str = String(text || '');
  if (!forceMarquee && str.length <= 35) {
    return (
      <div className={className} style={{ ...style, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {str}
      </div>
    );
  }

  return (
    <div className={`overflow-hidden whitespace-nowrap relative min-w-0 ${className}`} style={{ ...style, overflow: 'hidden', whiteSpace: 'nowrap' }}>
      <div
        className="flex w-max"
        style={{ animation: 'livenexus-text-marquee 15s linear infinite' }}
      >
        <span className="shrink-0 pr-8">{str}</span>
        <span className="shrink-0 pr-8" aria-hidden="true">{str}</span>
      </div>
      <style>{`
        @keyframes livenexus-text-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
