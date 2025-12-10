import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const KonnectLogo: React.FC<LogoProps> = ({ className = "", size = 32 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Main Outer Hexagon */}
      <path 
        d="M50 5 L89 27.5 L89 72.5 L50 95 L11 72.5 L11 27.5 Z" 
        stroke="url(#logo-gradient)" 
        strokeWidth="6" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />

      {/* Internal Orchestration Nodes */}
      <g filter="url(#glow)">
        {/* Center Node */}
        <circle cx="50" cy="50" r="8" fill="#dc2626" />
        
        {/* Connecting Lines */}
        <path d="M50 50 L50 20" stroke="#dc2626" strokeWidth="4" strokeLinecap="round" />
        <path d="M50 50 L76 65" stroke="#dc2626" strokeWidth="4" strokeLinecap="round" />
        <path d="M50 50 L24 65" stroke="#dc2626" strokeWidth="4" strokeLinecap="round" />
        
        {/* Satellite Nodes */}
        <circle cx="50" cy="20" r="5" fill="#dc2626" />
        <circle cx="76" cy="65" r="5" fill="#dc2626" />
        <circle cx="24" cy="65" r="5" fill="#dc2626" />
      </g>
    </svg>
  );
};