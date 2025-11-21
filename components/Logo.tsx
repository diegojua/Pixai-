import React from 'react';

const PixaiLogoFull = ({ className = "", size = "normal" }: { className?: string, size?: "small" | "normal" | "large" }) => {
  // Definições de gradiente para reutilizar no SVG e no Texto
  const gradientColors = {
    from: '#3b82f6', // blue-500
    to: '#a855f7',   // purple-500
    flash: '#22d3ee' // cyan-400 (para o brilho)
  };

  // Ajustes de escala baseados na prop size
  const svgSize = size === 'small' ? "32" : size === 'large' ? "80" : "64";
  const textSize = size === 'small' ? "text-2xl" : size === 'large' ? "text-6xl" : "text-5xl";

  return (
    // Container principal transparente
    <div className={`inline-flex items-center justify-center rounded-xl ${className}`}>
      <div className="flex items-center gap-3">

        {/* --- ÍCONE SVG (Design original) --- */}
        <svg
          width={svgSize}
          height={svgSize}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradiente Principal (Azul para Roxo) */}
            <linearGradient id="mainGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradientColors.from} />
              <stop offset="100%" stopColor={gradientColors.to} />
            </linearGradient>

             {/* Gradiente do Brilho Central (Ciano) */}
            <radialGradient id="flashGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" stopColor={gradientColors.flash} stopOpacity="1" />
              <stop offset="100%" stopColor={gradientColors.flash} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Parte Esquerda: Grid de Pixels (Formando a haste do 'P') */}
          <g fill="url(#mainGradient)" opacity="0.9">
            <rect x="10" y="10" width="12" height="12" rx="1" />
            <rect x="25" y="10" width="12" height="12" rx="1" />
            <rect x="10" y="25" width="12" height="12" rx="1" opacity="0.8"/>
            <rect x="25" y="25" width="12" height="12" rx="1" />
            <rect x="10" y="40" width="12" height="12" rx="1" />
            <rect x="25" y="40" width="12" height="12" rx="1" opacity="0.6" />
            <rect x="10" y="55" width="12" height="12" rx="1" />
            <rect x="25" y="55" width="12" height="12" rx="1" />
            <rect x="10" y="70" width="12" height="12" rx="1" opacity="0.7" />
            <rect x="25" y="70" width="12" height="12" rx="1" />
            <rect x="10" y="85" width="12" height="12" rx="1" />
             {/* Pixels "voando" */}
            <rect x="5" y="2" width="8" height="8" rx="1" opacity="0.5" />
            <rect x="2" y="35" width="6" height="6" rx="1" opacity="0.4" />
          </g>

          {/* Parte Direita: Cérebro de Circuito (Formando a curva do 'P') */}
          <path
            d="M45 25C45 25 55 10 75 15C85 17.5 90 28 90 40C90 52 85 62 75 65C60 68 45 55 45 55"
            stroke="url(#mainGradient)"
            strokeWidth="4"
            strokeLinecap="round"
          />
           {/* Linhas do circuito interno */}
          <g stroke="url(#mainGradient)" strokeWidth="2.5" strokeLinecap="round">
             <path d="M50 35 L65 35 L70 28" />
             <circle cx="70" cy="28" r="3" fill="url(#mainGradient)"/>
             <path d="M50 45 L75 45 L80 40" />
             <circle cx="80" cy="40" r="3" fill="url(#mainGradient)"/>
             <path d="M50 55 L60 55 L70 65 L80 60" />
             <circle cx="80" cy="60" r="3" fill="url(#mainGradient)"/>
          </g>

          {/* O Brilho Central (Flash) */}
          <circle cx="45" cy="40" r="12" fill="url(#flashGradient)" className="animate-pulse"/>
        </svg>

        {/* --- TÍTULO DE TEXTO --- */}
        <h1 className={`${textSize} font-bold font-sans tracking-wide select-none leading-none`}>
          {/* "Pix" - Cor sólida azul */}
          <span className="text-blue-500">
            Pix
          </span>
          {/* "ai" - Gradiente */}
          <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            ai
          </span>
        </h1>

      </div>
    </div>
  );
};

export default PixaiLogoFull;