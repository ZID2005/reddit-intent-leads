import React from 'react';

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
  color?: string;
  shineColor?: string;
}

export function ShinyText({
  text,
  disabled = false,
  speed = 4,
  className = '',
  color = '#b5b5b5',
  shineColor = '#ffffff',
}: ShinyTextProps) {
  if (disabled) {
    return <span className={className} style={{ color }}>{text}</span>;
  }

  const style = {
    '--shimmer-base': color,
    '--shimmer-highlight': shineColor,
    '--shimmer-dur': `${speed}s`,
  } as React.CSSProperties;

  return (
    <span 
      className={`t-shimmer ${className}`} 
      style={style}
    >
      {text}
    </span>
  );
}

export default ShinyText;
