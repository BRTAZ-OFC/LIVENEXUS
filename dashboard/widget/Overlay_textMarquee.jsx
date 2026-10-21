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
        className="inline-block"
        style={{ display: 'inline-block', width: 'max-content', minWidth: '100%', whiteSpace: 'nowrap', animation: 'livenexus-text-marquee 12s linear infinite' }}
      >
        {str}
      </div>
      <style>{`
        @keyframes livenexus-text-marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
