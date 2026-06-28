import React from 'react';
import { Home, ArrowLeft } from 'lucide-react';

export interface ErrorAction {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: React.ComponentType<any>;
}

export interface ErrorOneProps {
  code?: string;
  title?: string;
  description?: string;
  action?: ErrorAction;
  children?: React.ReactNode;
}

export const defaultErrorOneAction: ErrorAction = {
  label: 'Go Back Home',
  onClick: () => {
    window.location.href = '/';
  },
  icon: Home
};

export default function ErrorOne({
  code = '404',
  title = "No, no, that's right.",
  description = "This is a 404 page. And this page exists, no matter what anyone says.",
  action = defaultErrorOneAction,
  children
}: ErrorOneProps) {
  const ActionIcon = action.icon || Home;

  const handleActionClick = () => {
    if (action.onClick) {
      action.onClick();
    } else if (action.href) {
      window.location.href = action.href;
    }
  };

  // Render hand-crafted blocky SVG paths for standard error codes (404, 500)
  // Fall back to SVG text rendering for other codes to maintain high visual quality dynamically.
  const renderDigits = () => {
    if (code === '404') {
      return (
        <>
          {/* Digit 1: '4' at center 170 */}
          <path 
            d="M 105,150 L 175,50 L 205,50 L 205,150 L 235,150 L 235,170 L 205,170 L 205,210 L 185,210 L 185,170 L 105,170 Z M 185,150 L 185,80 L 135,150 Z"
            fill="#050505"
            fillOpacity="0.85"
            stroke="#22c55e"
            strokeWidth="2.5"
            strokeLinejoin="miter"
            fillRule="evenodd"
          />
          <path 
            d="M 105,150 L 175,50 L 205,50 L 205,150 L 235,150 L 235,170 L 205,170 L 205,210 L 185,210 L 185,170 L 105,170 Z M 185,150 L 185,80 L 135,150 Z"
            fill="url(#digit-grid)"
            fillRule="evenodd"
          />

          {/* Digit 2: '0' at center 350 */}
          <path 
            d="M 315,50 L 385,50 L 415,80 L 415,180 L 385,210 L 315,210 L 285,180 L 285,80 Z M 325,75 L 375,75 L 395,95 L 395,165 L 375,185 L 325,185 L 305,165 L 305,95 Z"
            fill="#050505"
            fillOpacity="0.85"
            stroke="#22c55e"
            strokeWidth="2.5"
            strokeLinejoin="miter"
            fillRule="evenodd"
          />
          <path 
            d="M 315,50 L 385,50 L 415,80 L 415,180 L 385,210 L 315,210 L 285,180 L 285,80 Z M 325,75 L 375,75 L 395,95 L 395,165 L 375,185 L 325,185 L 305,165 L 305,95 Z"
            fill="url(#digit-grid)"
            fillRule="evenodd"
          />

          {/* Digit 3: '4' at center 530 */}
          <path 
            d="M 465,150 L 535,50 L 565,50 L 565,150 L 595,150 L 595,170 L 565,170 L 565,210 L 545,210 L 545,170 L 465,170 Z M 545,150 L 545,80 L 495,150 Z"
            fill="#050505"
            fillOpacity="0.85"
            stroke="#22c55e"
            strokeWidth="2.5"
            strokeLinejoin="miter"
            fillRule="evenodd"
          />
          <path 
            d="M 465,150 L 535,50 L 565,50 L 565,150 L 595,150 L 595,170 L 565,170 L 565,210 L 545,210 L 545,170 L 465,170 Z M 545,150 L 545,80 L 495,150 Z"
            fill="url(#digit-grid)"
            fillRule="evenodd"
          />
        </>
      );
    }

    if (code === '500') {
      return (
        <>
          {/* Digit 1: '5' at center 170 */}
          <path 
            d="M 105,50 L 235,50 L 235,75 L 130,75 L 130,120 L 210,120 L 235,145 L 235,185 L 210,210 L 105,210 L 105,185 L 210,185 L 210,145 L 105,145 Z"
            fill="#050505"
            fillOpacity="0.85"
            stroke="#22c55e"
            strokeWidth="2.5"
            strokeLinejoin="miter"
          />
          <path 
            d="M 105,50 L 235,50 L 235,75 L 130,75 L 130,120 L 210,120 L 235,145 L 235,185 L 210,210 L 105,210 L 105,185 L 210,185 L 210,145 L 105,145 Z"
            fill="url(#digit-grid)"
          />

          {/* Digit 2: '0' at center 350 */}
          <path 
            d="M 315,50 L 385,50 L 415,80 L 415,180 L 385,210 L 315,210 L 285,180 L 285,80 Z M 325,75 L 375,75 L 395,95 L 395,165 L 375,185 L 325,185 L 305,165 L 305,95 Z"
            fill="#050505"
            fillOpacity="0.85"
            stroke="#22c55e"
            strokeWidth="2.5"
            strokeLinejoin="miter"
            fillRule="evenodd"
          />
          <path 
            d="M 315,50 L 385,50 L 415,80 L 415,180 L 385,210 L 315,210 L 285,180 L 285,80 Z M 325,75 L 375,75 L 395,95 L 395,165 L 375,185 L 325,185 L 305,165 L 305,95 Z"
            fill="url(#digit-grid)"
            fillRule="evenodd"
          />

          {/* Digit 3: '0' at center 530 */}
          <path 
            d="M 495,50 L 565,50 L 595,80 L 595,180 L 565,210 L 495,210 L 465,180 L 465,80 Z M 505,75 L 555,75 L 575,95 L 575,165 L 555,185 L 505,185 L 485,165 L 485,95 Z"
            fill="#050505"
            fillOpacity="0.85"
            stroke="#22c55e"
            strokeWidth="2.5"
            strokeLinejoin="miter"
            fillRule="evenodd"
          />
          <path 
            d="M 495,50 L 565,50 L 595,80 L 595,180 L 565,210 L 495,210 L 465,180 L 465,80 Z M 505,75 L 555,75 L 575,95 L 575,165 L 555,185 L 505,185 L 485,165 L 485,95 Z"
            fill="url(#digit-grid)"
            fillRule="evenodd"
          />
        </>
      );
    }

    // Dynamic Text fallback
    return (
      <g>
        <text 
          x="350" 
          y="180" 
          textAnchor="middle" 
          fill="#050505" 
          fillOpacity="0.85"
          stroke="#22c55e" 
          strokeWidth="3" 
          className="font-bold select-none"
          style={{ fontSize: '150px', letterSpacing: '10px', fontFamily: '"Space Mono", "JetBrains Mono", monospace' }}
        >
          {code}
        </text>
        <text 
          x="350" 
          y="180" 
          textAnchor="middle" 
          fill="url(#digit-grid)" 
          stroke="rgba(34, 197, 94, 0.2)"
          strokeWidth="1"
          className="font-bold select-none"
          style={{ fontSize: '150px', letterSpacing: '10px', fontFamily: '"Space Mono", "JetBrains Mono", monospace' }}
        >
          {code}
        </text>
      </g>
    );
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center p-6 select-none font-sans relative overflow-hidden scanline-effect animate-[fadeIn_0.5s_ease-out]"
      style={{
        backgroundColor: '#050505',
        backgroundImage: `
          linear-gradient(rgba(34, 197, 94, 0.035) 1.2px, transparent 1.2px),
          linear-gradient(90deg, rgba(34, 197, 94, 0.035) 1.2px, transparent 1.2px)
        `,
        backgroundSize: '40px 40px',
        backgroundPosition: 'center center',
      }}
    >
      {/* Scope Style for Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanline {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }
        .scanline-effect::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 8px;
          background: linear-gradient(to bottom, transparent, rgba(198, 255, 52, 0.06), transparent);
          animation: scanline 8s linear infinite;
          pointer-events: none;
          z-index: 10;
        }
        @keyframes blueprint-pulse {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.65; }
        }
        .pulse-blueprint {
          animation: blueprint-pulse 4s infinite ease-in-out;
        }
      `}} />

      {/* Content wrapper with simple entrance animation */}
      <div className="max-w-3xl w-full text-center z-10 flex flex-col items-center space-y-8">
        
        {/* SVG Drawing Container */}
        <div className="w-full max-w-2xl relative">
          <svg 
            className="w-full h-auto drop-shadow-[0_0_20px_rgba(34,197,94,0.18)]" 
            viewBox="0 0 700 260" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Grid pattern inside digits */}
              <pattern id="digit-grid" width="16" height="16" patternUnits="userSpaceOnUse">
                <path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(34, 197, 94, 0.25)" strokeWidth="0.6" />
              </pattern>
              
              {/* Glow filter */}
              <filter id="glow-filter" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComponentTransfer in="blur" result="glow">
                  <feFuncA type="linear" slope="0.55" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Blueprint Grid Lines & Centerlines */}
            <g stroke="rgba(34, 197, 94, 0.12)" strokeWidth="0.8" strokeDasharray="3,3" className="pulse-blueprint">
              <line x1="40" y1="130" x2="660" y2="130" />
              <line x1="170" y1="20" x2="170" y2="240" />
              <line x1="350" y1="20" x2="350" y2="240" />
              <line x1="530" y1="20" x2="530" y2="240" />
              
              <line x1="40" y1="50" x2="660" y2="50" />
              <line x1="40" y1="210" x2="660" y2="210" />
            </g>

            {/* Target Reticles / Crosshairs */}
            <g stroke="rgba(198, 255, 52, 0.35)" strokeWidth="0.9">
              <circle cx="350" cy="130" r="7" fill="none" />
              <line x1="341" y1="130" x2="359" y2="130" />
              <line x1="350" y1="121" x2="350" y2="139" />
              
              <circle cx="170" cy="130" r="4" fill="none" />
              <line x1="163" y1="130" x2="177" y2="130" />
              <line x1="170" y1="123" x2="170" y2="137" />
              
              <circle cx="530" cy="130" r="4" fill="none" />
              <line x1="523" y1="130" x2="537" y2="130" />
              <line x1="530" y1="123" x2="530" y2="137" />
            </g>

            {/* Digit Rendering */}
            <g filter="url(#glow-filter)">
              {renderDigits()}
            </g>

            {/* Blueprint corner ticks */}
            <g stroke="rgba(198, 255, 52, 0.5)" strokeWidth="1">
              <path d="M 40,30 L 40,20 L 50,20" />
              <path d="M 660,30 L 660,20 L 650,20" />
              <path d="M 40,230 L 40,240 L 50,240" />
              <path d="M 660,230 L 660,240 L 650,240" />
            </g>
          </svg>
        </div>

        {/* Text descriptions */}
        <div className="space-y-3 max-w-lg">
          <h1 className="text-white text-2xl font-bold tracking-tight">
            {title}
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            {description}
          </p>
        </div>

        {/* Children details (e.g. error logs) */}
        {children && (
          <div className="w-full max-w-lg">
            {children}
          </div>
        )}

        {/* Go back home / Action button */}
        <button
          onClick={handleActionClick}
          className="flex items-center justify-center gap-2 py-2.5 px-5 rounded-md bg-[#C6FF34] hover:brightness-110 active:scale-98 text-black text-sm font-semibold tracking-wide transition-all cursor-pointer shadow-[0_4px_20px_rgba(198,255,52,0.25)] border border-transparent hover:border-[#C6FF34]/30"
        >
          <span>{action.label}</span>
          <ActionIcon className="w-4 h-4 text-black fill-current stroke-[2.5px]" />
        </button>

      </div>
    </div>
  );
}
