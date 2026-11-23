import React from 'react';

export type LogoVariant = 
  | 'main' 
  | 'symbol' 
  | 'app-icon' 
  | 'favicon' 
  | 'login' 
  | 'student-dash' 
  | 'admin-dash' 
  | 'loading' 
  | 'mobile';

interface LogoProps {
  variant?: LogoVariant;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  theme?: 'dark' | 'light' | 'auto';
  withGlow?: boolean;
  animated?: boolean;
  showText?: boolean;
  isArabic?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'main',
  size = 'md',
  theme = 'dark',
  withGlow = false,
  animated = false,
  showText = true,
  isArabic = false,
  className = '',
  onClick
}) => {
  // Dimension mapping
  const sizeMap: Record<string, { height: number; width?: number }> = {
    xs: { height: 24 },
    sm: { height: 32 },
    md: { height: 42 },
    lg: { height: 56 },
    xl: { height: 72 },
  };

  const currentHeight = typeof size === 'number' ? size : sizeMap[size]?.height || 42;

  // Dedicated Core Symbol SVG element (sharp vectors with exact aspect ratio)
  const renderSymbol = (symbolSize: number) => (
    <svg
      width={symbolSize}
      height={symbolSize}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-300 ${withGlow ? 'filter drop-shadow-[0_0_12px_rgba(0,210,255,0.6)]' : ''}`}
      style={{ aspectRatio: '1 / 1' }}
    >
      <defs>
        <linearGradient id="sym-blue-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D2FF" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="sym-purple-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="sym-dial-border" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D2FF" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <radialGradient id="sym-glow" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#00D2FF" stopOpacity="0.4" />
          <stop offset="60%" stopColor="#7C3AED" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#0A1128" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Atmospheric Glow */}
      <circle cx="100" cy="95" r="75" fill="url(#sym-glow)" />

      {/* Base Page Stack Shadow */}
      <path d="M100 148 C72 135 44 140 22 154 L22 96 C44 82 72 80 100 92 Z" fill="#090E1D" opacity="0.6" />
      <path d="M100 148 C128 135 156 140 178 154 L178 96 C156 82 128 80 100 92 Z" fill="#090E1D" opacity="0.6" />

      {/* Open Book Left Wing */}
      <path d="M100 142 C70 128 42 134 24 146 L24 90 C42 78 70 74 100 86 Z" fill="url(#sym-blue-g)" />
      <path d="M38 102 C55 94 76 92 92 98" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
      <path d="M38 114 C55 106 76 104 92 110" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      <path d="M38 126 C55 118 76 116 92 122" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />

      {/* Open Book Right Wing */}
      <path d="M100 142 C130 128 158 134 176 146 L176 90 C158 78 130 74 100 86 Z" fill="url(#sym-purple-g)" />
      <path d="M108 98 C124 92 145 94 162 102" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
      <path d="M108 110 C124 104 145 106 162 114" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      <path d="M108 122 C124 116 145 118 162 126" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />

      {/* Central Spine */}
      <path d="M100 86 L100 156" stroke="#00D2FF" strokeWidth="3" strokeLinecap="round" />

      {/* Orbit Ring */}
      <circle cx="100" cy="74" r="46" stroke="url(#sym-dial-border)" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.5" />

      {/* Central Clock */}
      <circle cx="100" cy="74" r="40" fill="#0A1128" stroke="url(#sym-dial-border)" strokeWidth="4.5" />
      <circle cx="100" cy="74" r="34" fill="#0F172A" />

      {/* Hour Marks */}
      <line x1="100" y1="42" x2="100" y2="47" stroke="#00D2FF" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="132" y1="74" x2="127" y2="74" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="100" y1="106" x2="100" y2="101" stroke="#00D2FF" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="68" y1="74" x2="73" y2="74" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" />

      {/* Hands at 10:10 (Focus & Peak Performance) */}
      <line 
        x1="100" y1="74" x2="84" y2="58" 
        stroke="#00D2FF" strokeWidth="3.8" strokeLinecap="round" 
      />
      <line 
        x1="100" y1="74" x2="122" y2="54" 
        stroke="#C084FC" strokeWidth="2.8" strokeLinecap="round" 
        className={animated ? 'origin-[100px_74px] animate-spin-slow' : ''}
      />

      {/* Glowing Center Hub */}
      <circle cx="100" cy="74" r="5" fill="#00D2FF" />
      <circle cx="100" cy="74" r="2" fill="#FFFFFF" />

      {/* Academic Excellence Spark */}
      <path d="M100 18 L102 24 L108 26 L102 28 L100 34 L98 28 L92 26 L98 24 Z" fill="#00D2FF" />
    </svg>
  );

  // Variant: Symbol only
  if (variant === 'symbol') {
    return (
      <div 
        onClick={onClick}
        className={`inline-flex items-center justify-center ${onClick ? 'cursor-pointer' : ''} ${className}`}
        style={{ height: currentHeight, width: currentHeight }}
        title="Smart Study Planner"
      >
        {renderSymbol(currentHeight)}
      </div>
    );
  }

  // Variant: App Icon (Squircle)
  if (variant === 'app-icon' || variant === 'mobile') {
    return (
      <div 
        onClick={onClick}
        className={`relative inline-flex items-center justify-center rounded-2xl p-2 bg-gradient-to-br from-brand-navy-900 to-slate-900 border border-brand-blue/30 shadow-glow-combo overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className}`}
        style={{ height: currentHeight, width: currentHeight }}
      >
        {renderSymbol(currentHeight * 0.85)}
      </div>
    );
  }

  // Variant: Favicon
  if (variant === 'favicon') {
    return (
      <div 
        className={`inline-flex items-center justify-center ${className}`}
        style={{ height: currentHeight, width: currentHeight }}
      >
        <img 
          src="/brand/favicon.svg" 
          alt="Favicon" 
          className="w-full h-full object-contain" 
        />
      </div>
    );
  }

  // Variant: Loading Screen Logo
  if (variant === 'loading') {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-brand-blue/20 blur-xl animate-pulse" />
          {renderSymbol(currentHeight || 90)}
        </div>
        {showText && (
          <div className="text-center">
            <h3 className="text-xl font-bold bg-gradient-to-r from-brand-blue-electric to-brand-purple-light bg-clip-text text-transparent">
              Smart Study Planner
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1">
              {isArabic ? 'جاري تحميل نظام المتابعة الذكي...' : 'Loading Smart Academic Planner...'}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Variant: Super Admin Dashboard Logo
  if (variant === 'admin-dash') {
    return (
      <div 
        onClick={onClick}
        className={`inline-flex items-center gap-3 select-none ${onClick ? 'cursor-pointer hover:opacity-95' : ''} ${className}`}
        style={{ height: currentHeight }}
      >
        {renderSymbol(currentHeight)}
        {showText && (
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className={`font-black text-lg tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                Smart Study
              </span>
              <span className="font-black text-lg bg-gradient-to-r from-brand-purple-light to-brand-purple bg-clip-text text-transparent">
                Planner
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-purple-950/80 text-purple-300 border border-purple-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mr-1 rtl:mr-0 rtl:ml-1 animate-pulse" />
                {isArabic ? 'الإدارة العليا' : 'Super Admin'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Variant: Student Dashboard Logo
  if (variant === 'student-dash') {
    return (
      <div 
        onClick={onClick}
        className={`inline-flex items-center gap-3 select-none ${onClick ? 'cursor-pointer hover:opacity-95' : ''} ${className}`}
        style={{ height: currentHeight }}
      >
        {renderSymbol(currentHeight)}
        {showText && (
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className={`font-black text-lg tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                Smart Study
              </span>
              <span className="font-black text-lg bg-gradient-to-r from-brand-blue-electric to-brand-blue bg-clip-text text-transparent">
                Planner
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-950/80 text-sky-300 border border-sky-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1 rtl:mr-0 rtl:ml-1" />
                {isArabic ? 'بوابة الطالب الذكية' : 'Student Portal'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Variant: Login Page Logo (Hero)
  if (variant === 'login') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <div className="relative mb-3">
          <div className="absolute -inset-4 bg-gradient-to-r from-brand-blue/30 via-brand-purple/20 to-transparent blur-2xl rounded-full" />
          {renderSymbol(currentHeight || 84)}
        </div>
        {showText && (
          <>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <span>Smart Study</span>
              <span className="bg-gradient-to-r from-brand-blue-electric via-sky-400 to-brand-purple-light bg-clip-text text-transparent">
                Planner
              </span>
            </h1>
            <p className="text-sm font-semibold text-sky-400/90 mt-1">
              {isArabic ? 'مخطط الدراسة والامتحانات الذكي' : 'Intelligent Academic Study & Revision System'}
            </p>
          </>
        )}
      </div>
    );
  }

  // Default: Main Logo (Horizontal)
  return (
    <div 
      onClick={onClick}
      className={`inline-flex items-center gap-3 select-none ${onClick ? 'cursor-pointer hover:opacity-95' : ''} ${className}`}
      style={{ height: currentHeight }}
    >
      {renderSymbol(currentHeight)}
      {showText && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black text-lg tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              Smart Study
            </span>
            <span className="font-black text-lg bg-gradient-to-r from-brand-blue-electric to-brand-purple-light bg-clip-text text-transparent">
              Planner
            </span>
          </div>
          <p className="text-[11px] font-semibold text-slate-400 mt-1 leading-none">
            {isArabic ? 'مخطط الدراسة الذكي' : 'AI Academic Planner'}
          </p>
        </div>
      )}
    </div>
  );
};
