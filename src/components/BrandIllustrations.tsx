import React from 'react';

interface LogoProps {
  acronym: string;
  primaryColor: string;
  accentColor: string;
  windowFill?: string;
  className?: string;
}

export const GisArchitecturalLogo: React.FC<LogoProps> = ({
  acronym,
  primaryColor,
  accentColor,
  windowFill = '#FFFFFF',
  className = 'h-14 w-auto',
}) => {
  return (
    <svg
      viewBox="0 0 210 76"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={`Logo ${acronym}`}
    >
      {/* Architectural house roof & window emblem */}
      <path
        d="M14 35L42 12L70 35"
        stroke={primaryColor}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M55 22V14H63V29"
        stroke={accentColor}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 4-pane architectural window */}
      <rect x="33" y="29" width="8" height="8" rx="1" fill={primaryColor} />
      <rect x="43" y="29" width="8" height="8" rx="1" fill={accentColor} />
      <rect x="33" y="39" width="8" height="8" rx="1" fill={accentColor} />
      <rect x="43" y="39" width="8" height="8" rx="1" fill={primaryColor} />

      {/* Dynamic baseline swoosh */}
      <path
        d="M10 56C44 67 132 67 198 52"
        stroke={accentColor}
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Crisp geometric acronym */}
      <text
        x="82"
        y="46"
        fill={primaryColor}
        fontFamily="'Bricolage Grotesque', system-ui, sans-serif"
        fontWeight="800"
        fontSize="40"
        letterSpacing="-1.5"
      >
        {acronym}
      </text>
      <circle cx="195" cy="41" r="4" fill={windowFill === 'transparent' ? accentColor : accentColor} />
    </svg>
  );
};

interface MotifProps {
  primaryColor: string;
  secondaryColor: string;
  surfaceColor?: string;
  className?: string;
}

export const HardwareIllustration: React.FC<MotifProps> = ({
  primaryColor,
  secondaryColor,
  surfaceColor = 'rgba(255,255,255,0.08)',
  className = 'w-full h-full',
}) => (
  <svg
    viewBox="0 0 260 150"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Subtle technical drafting grid */}
    <rect x="6" y="6" width="248" height="138" rx="8" fill={surfaceColor} />
    <path
      d="M36 16V134M86 16V134M136 16V134M186 16V134M236 16V134"
      stroke={primaryColor}
      strokeOpacity="0.1"
      strokeWidth="1"
    />
    <path
      d="M16 40H244M16 80H244M16 120H244"
      stroke={primaryColor}
      strokeOpacity="0.1"
      strokeWidth="1"
    />

    {/* Stacked cement bags */}
    <rect x="24" y="98" width="66" height="22" rx="4" fill={primaryColor} fillOpacity="0.16" stroke={primaryColor} strokeWidth="2" />
    <rect x="28" y="74" width="66" height="22" rx="4" fill={primaryColor} fillOpacity="0.22" stroke={primaryColor} strokeWidth="2" />
    <line x1="40" y1="85" x2="82" y2="85" stroke={secondaryColor} strokeWidth="2.5" strokeLinecap="round" />
    <line x1="36" y1="109" x2="78" y2="109" stroke={primaryColor} strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />

    {/* Safety helmet */}
    <path
      d="M110 110C110 91 124 78 142 78C160 78 174 91 174 110H110Z"
      fill={secondaryColor}
      fillOpacity="0.9"
      stroke={primaryColor}
      strokeWidth="2"
    />
    <path d="M104 110H182" stroke={primaryColor} strokeWidth="3" strokeLinecap="round" />
    <path d="M138 78V96M146 78V96" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" />

    {/* Paint roller & framing square */}
    <rect x="192" y="34" width="40" height="16" rx="4" fill={secondaryColor} stroke={primaryColor} strokeWidth="2" />
    <path
      d="M192 42H180V58L212 72V116"
      stroke={primaryColor}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect x="206" y="102" width="12" height="22" rx="3" fill={primaryColor} />

    {/* PVC Pipes */}
    <circle cx="44" cy="48" r="10" fill={surfaceColor} stroke={primaryColor} strokeWidth="2" />
    <circle cx="66" cy="48" r="10" fill={surfaceColor} stroke={primaryColor} strokeWidth="2" />
    <circle cx="55" cy="30" r="10" fill={surfaceColor} stroke={secondaryColor} strokeWidth="2" />
  </svg>
);

export const BeverageIllustration: React.FC<MotifProps> = ({
  primaryColor,
  secondaryColor,
  surfaceColor = 'rgba(255,255,255,0.08)',
  className = 'w-full h-full',
}) => (
  <svg
    viewBox="0 0 260 150"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect x="6" y="6" width="248" height="138" rx="8" fill={surfaceColor} />
    {/* Refreshing wave lines */}
    <path
      d="M16 112C48 100 76 122 108 112C140 102 168 122 200 112C220 106 234 110 244 114"
      stroke={secondaryColor}
      strokeOpacity="0.3"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M16 126C48 114 76 136 108 126C140 116 168 136 200 126C220 120 234 124 244 128"
      stroke={primaryColor}
      strokeOpacity="0.2"
      strokeWidth="2"
      strokeLinecap="round"
    />

    {/* Mineral water bottle */}
    <rect x="44" y="22" width="14" height="8" rx="2" fill={secondaryColor} />
    <path
      d="M45 30H57L65 48V116C65 119.3 62.3 122 59 122H43C39.7 122 37 119.3 37 116V48L45 30Z"
      fill={secondaryColor}
      fillOpacity="0.18"
      stroke={primaryColor}
      strokeWidth="2"
    />
    <rect x="37" y="68" width="28" height="22" fill={secondaryColor} fillOpacity="0.85" />

    {/* Tall soda bottle */}
    <rect x="106" y="16" width="14" height="8" rx="2" fill={primaryColor} />
    <path
      d="M107 24H119L129 46V116C129 119.3 126.3 122 123 122H103C99.7 122 97 119.3 97 116V46L107 24Z"
      fill={primaryColor}
      fillOpacity="0.15"
      stroke={primaryColor}
      strokeWidth="2"
    />
    <rect x="97" y="64" width="32" height="24" fill={primaryColor} fillOpacity="0.9" />

    {/* Chilled beverage can */}
    <rect x="150" y="62" width="34" height="60" rx="5" fill={secondaryColor} fillOpacity="0.25" stroke={primaryColor} strokeWidth="2" />
    <line x1="150" y1="74" x2="184" y2="74" stroke={primaryColor} strokeWidth="1.5" />
    <circle cx="167" cy="94" r="9" fill={secondaryColor} fillOpacity="0.85" />

    {/* Glass bottle + Ice cubes */}
    <rect x="206" y="28" width="10" height="7" rx="1.5" fill={secondaryColor} />
    <path
      d="M206 35H216L222 58V116C222 119.3 219.3 122 216 122H206C202.7 122 200 119.3 200 116V58L206 35Z"
      fill={primaryColor}
      fillOpacity="0.2"
      stroke={primaryColor}
      strokeWidth="2"
    />

    {/* Geometric ice cubes */}
    <rect x="74" y="106" width="16" height="16" rx="3" transform="rotate(-12 74 106)" fill={secondaryColor} fillOpacity="0.35" stroke={secondaryColor} strokeWidth="1.5" />
    <rect x="134" y="108" width="14" height="14" rx="3" transform="rotate(14 134 108)" fill={secondaryColor} fillOpacity="0.35" stroke={secondaryColor} strokeWidth="1.5" />
  </svg>
);
