import React, { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { editImage, generateMarketingCopy, MarketingCopyResult } from './services/geminiService.ts';
import { fileToBase64, resizeImage, cropImage } from './utils/file.ts';
import PixaiLogoFull from './components/Logo.tsx';
import { auth, googleProvider, db, storage } from './services/firebase.ts';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { 
  UploadIcon, 
  DownloadIcon, 
  ArrowsIcon, 
  ImageIcon, 
  PaletteIcon,
  ShoppingBagIcon,
  SunIcon,
  CubeIcon,
  LayersIcon,
  DocumentTextIcon,
  XMarkIcon,
  CopyIcon,
  CheckIcon,
  ResizeIcon,
  LinkIcon,
  LinkSlashIcon,
  UsersIcon,
  ViewColumnsIcon,
  ViewSplitIcon,
  SparklesIcon,
  PaintBrushIcon,
  ScissorsIcon,
  BoltIcon,
  EraserIcon,
  BrushIcon,
  TrashIcon,
  MagicWandIcon,
  Bars3Icon,
  PlusIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  HandIcon,
  DevicePhoneMobileIcon,
  CropIcon,
  CloudArrowUpIcon,
  UserCircleIcon,
  ArrowRightStartOnRectangleIcon,
  PhotoIcon
} from './components/Icons.tsx';

// --- Constants & Data ---

const PRESETS = [
  { id: 'vangogh', label: "Estilo Van Gogh", prompt: "Make it look like a Van Gogh painting with thick brushstrokes and vibrant swirls" },
  { id: 'sketch', label: "Esboço a Lápis", prompt: "Convert this into a high quality artistic pencil sketch, black and white" },
  { id: 'cyberpunk', label: "Cyberpunk Neon", prompt: "Add a futuristic cyberpunk neon glow, night time lighting, cyan and magenta tones" },
  { id: 'winter', label: "Inverno Nevado", prompt: "Transform the scenery into a snowy winter landscape" },
  { id: 'pixel', label: "Pixel Art", prompt: "Transform this into 16-bit pixel art style" },
  { id: 'vintage', label: "Polaroid Vintage", prompt: "Apply a vintage polaroid filter with faded colors and grain" },
  { id: 'cinematic', label: "Cinemático", prompt: "Enhance lighting to be dramatic and cinematic, 4k quality" },
  { id: 'cartoon', label: "Cartoon 3D", prompt: "Transform into a 3D Pixar-style cartoon character or environment" }
];

const MARKETING_OPTIONS = {
  surfaces: [
    { id: 'marble', label: 'Mármore Branco', value: 'placed on a luxurious white marble table' },
    { id: 'wood', label: 'Madeira Rústica', value: 'placed on a rustic dark wood surface' },
    { id: 'podium', label: 'Pódio Minimalista', value: 'on a clean geometric podium, minimalist background' },
    { id: 'water', label: 'Splash de Água', value: 'surrounded by dynamic water splashes and droplets, refreshing look' },
    { id: 'nature', label: 'Natureza', value: 'surrounded by green leaves and natural stones, organic environment' },
    { id: 'infinity', label: 'Fundo Infinito', value: 'floating in an infinite studio background, clean and seamless' }
  ],
  lighting: [
    { id: 'soft', label: 'Luz de Estúdio Suave', value: 'softbox studio lighting, diffuse shadows' },
    { id: 'sunlight', label: 'Luz Solar Natural', value: 'warm natural sunlight casting soft shadows, golden hour' },
    { id: 'neon', label: 'Luz Neon', value: 'dramatic neon blue and pink lighting, rim light' },
    { id: 'dramatic', label: 'Dramático', value: 'high contrast dramatic lighting (chiaroscuro), focus on product' }
  ],
  styles: [
    { id: 'luxury', label: 'Luxo Elegante', value: 'elegant, high-end luxury aesthetic, gold details' },
    { id: 'tech', label: 'Tech Futurista', value: 'futuristic, sleek, metallic reflections, high-tech vibe' },
    { id: 'minimal', label: 'Minimalista Clean', value: 'minimalist composition, negative space, modern' },
    { id: 'vibrant', label: 'Vibrante & Pop', value: 'vibrant saturated colors, pop art style, energetic' }
  ]
};

const MAGIC_TOOLS = [
  { 
    id: 'colorize', 
    label: 'Colorir P&B', 
    description: 'Dê vida a fotos antigas.',
    prompt: 'Colorize this black and white image naturally, realistic skin tones and vibrant colors. Maintain the original details.', 
    icon: PaintBrushIcon,
    color: 'text-pink-500',
    bg: 'bg-pink-50'
  },
  { 
    id: 'restore', 
    label: 'Restaurar', 
    description: 'Melhore nitidez e ruído.',
    prompt: 'Enhance image quality, remove noise, sharpen details, high resolution, 4k, photorealistic. Do not alter the subject.', 
    icon: BoltIcon,
    color: 'text-amber-500',
    bg: 'bg-amber-50'
  },
  { 
    id: 'erase_object', 
    label: 'Apagar Objeto', 
    description: 'Pinte para remover.',
    prompt: 'interactive', 
    icon: EraserIcon,
    color: 'text-rose-500',
    bg: 'bg-rose-50'
  },
  { 
    id: 'remove_bg', 
    label: 'Fundo Branco', 
    description: 'Isole em fundo branco.',
    prompt: 'Remove the background, isolate the subject on a clean white background, professional product shot.', 
    icon: ScissorsIcon,
    color: 'text-cyan-500',
    bg: 'bg-cyan-50'
  },
  { 
    id: 'lighting', 
    label: 'Corrigir Luz', 
    description: 'Equilibre a exposição.',
    prompt: 'Fix lighting, balance exposure, improve contrast and brightness naturally, professional photography.', 
    icon: SunIcon,
    color: 'text-purple-500',
    bg: 'bg-purple-50'
  },
];

// --- Tooltip Component ---

const Tooltip: React.FC<{ content: string; children: React.ReactNode; className?: string }> = ({ content, children, className }) => {
  return (
    <div className={`relative group flex items-center justify-center ${className || ''}`}>
      {children}
      <div className="hidden md:block absolute top-full mt-2 left-1/2 transform -translate-x-1/2 px-3 py-1.5 bg-slate-800 text-white text-[10px] font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
        {content}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -mb-1 border-4 border-transparent border-b-slate-800" />
      </div>
    </div>
  );
};

// --- Sub-Components ---

const AuthDomainErrorModal = ({ isOpen, onClose, domain }: { isOpen: boolean, onClose: () => void, domain: string }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-red-100 animate-in zoom-in duration-200">
        <div className="flex items-start gap-4">
            <div className="bg-red-100 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Domínio Não Autorizado</h3>
                <p className="text-sm text-slate-600 mb-4">
                    O Google bloqueou o login porque este site (<code>{domain}</code>) não está na lista de permitidos.
                </p>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Copie este domínio:</p>
                    <code className="block bg-white px-2 py-1 rounded text-red-500 font-mono text-sm select-all border border-slate-100">
                        {domain}
                    </code>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                    Vá no <b>Firebase Console {'>'} Authentication {'>'} Configurações {'>'} Domínios autorizados</b> e adicione-o.
                </p>
                <div className="flex gap-2 justify-end">
                    <a 
                        href="https://console.firebase.google.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                    >
                        Ir para Firebase
                    </a>
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Entendi
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const ComparisonViewer = ({ original, generated, mode }: { original: string; generated: string; mode: 'slider' | 'split' }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const pos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(pos);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  if (mode === 'split') {
    return (
      <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full h-full items-center justify-center overflow-hidden p-2 md:p-4">
        <div className="flex flex-col items-center gap-2 w-full h-1/2 md:flex-1 md:h-full justify-center relative">
           <span className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10 bg-slate-200/90 backdrop-blur text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm">Original</span>
           <div className="w-full h-full flex items-center justify-center bg-[url('https://placehold.co/20x20/e2e8f0/ffffff?text=')] bg-repeat rounded-lg overflow-hidden border border-slate-200">
             <img src={original} alt="Original" className="max-w-full max-h-full object-contain" />
           </div>
        </div>
        <div className="flex flex-col items-center gap-2 w-full h-1/2 md:flex-1 md:h-full justify-center relative">
           <span className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10 bg-cyan-100/90 backdrop-blur text-cyan-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm">Pixai AI</span>
           <div className="w-full h-full flex items-center justify-center bg-[url('https://placehold.co/20x20/e2e8f0/ffffff?text=')] bg-repeat rounded-lg overflow-hidden border border-cyan-200">
             <img src={generated} alt="Generated" className="max-w-full max-h-full object-contain" />
           </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden cursor-col-resize group touch-none flex items-center justify-center bg-[url('https://placehold.co/20x20/e2e8f0/ffffff?text=')] bg-repeat"
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
       <div className="relative w-full h-full flex items-center justify-center">
          {/* Generated (After) */}
          <img 
            src={generated} 
            alt="Generated" 
            className="absolute max-w-full max-h-full object-contain select-none pointer-events-none" 
          />

          {/* Original (Before) masked */}
          <div className="absolute w-full h-full flex items-center justify-center pointer-events-none">
            <img 
              src={original} 
              alt="Original" 
              className="max-w-full max-h-full object-contain select-none" 
              style={{ 
                clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` 
              }}
            />
          </div>
       </div>

      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_15px_rgba(0,0,0,0.5)] cursor-col-resize pointer-events-none"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-white rounded-full shadow-xl flex items-center justify-center transition-transform duration-200 ${isDragging ? 'scale-110 ring-4 ring-cyan-400/50' : ''}`}>
          <ArrowsIcon className={`w-5 h-5 md:w-6 md:h-6 ${isDragging ? 'text-cyan-500' : 'text-slate-400'}`} />
        </div>
      </div>
    </div>
  );
};

const CopyModal = ({ data, onClose }: { data: MarketingCopyResult; onClose: () => void }) => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center md:p-4">
      <div className="bg-white rounded-t-3xl md:rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-full md:zoom-in duration-300 flex flex-col max-h-[85vh] md:max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-cyan-500" />
            Marketing Copy
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar">
            {(data.colorPalette?.length > 0 || data.emojiSuggestions?.length > 0) && (
                <div className="mb-8 bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Identidade Visual</h4>
                    {data.colorPalette && data.colorPalette.length > 0 && (
                        <div className="mb-4">
                            <p className="text-xs text-slate-400 mb-2">Paleta</p>
                            <div className="flex gap-3 flex-wrap">
                                {data.colorPalette.map((color, idx) => (
                                    <div key={idx} className="group relative flex flex-col items-center gap-1 cursor-pointer" onClick={() => handleCopy(color, `color-${idx}`)}>
                                        <div 
                                            className="w-10 h-10 md:w-12 md:h-12 rounded-full shadow-sm border border-slate-200 ring-2 ring-white ring-offset-2" 
                                            style={{ backgroundColor: color }} 
                                        />
                                        <span className="hidden md:block text-[10px] font-mono text-slate-500 uppercase bg-white px-1 rounded border border-slate-100">{color}</span>
                                        {copied === `color-${idx}` && <span className="absolute -top-6 bg-black text-white text-[10px] px-2 py-1 rounded animate-fade-in">Copiado!</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {data.emojiSuggestions && data.emojiSuggestions.length > 0 && (
                        <div>
                            <p className="text-xs text-slate-400 mb-2">Emojis</p>
                            <div className="flex gap-2 flex-wrap">
                                {data.emojiSuggestions.map((emoji, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => handleCopy(emoji, `emoji-${idx}`)}
                                        className={`text-2xl active:scale-95 md:hover:scale-125 transition-transform p-1 rounded-lg ${copied === `emoji-${idx}` ? 'bg-green-100' : 'active:bg-white md:hover:bg-white'}`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            <div className="space-y-6">
                {Object.entries(data).map(([key, text]) => {
                    if (key === 'colorPalette' || key === 'emojiSuggestions') return null;
                    return (
                        <div key={key} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold uppercase tracking-wider text-cyan-700">
                                    {key === 'short' ? 'Curto' : key === 'engagement' ? 'Engajamento' : 'Vendas'}
                                </span>
                                <button 
                                    onClick={() => handleCopy(text as string, key)}
                                    className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-all ${copied === key ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 active:bg-slate-200'}`}
                                >
                                    {copied === key ? <CheckIcon className="w-3 h-3" /> : <CopyIcon className="w-3 h-3" />}
                                    {copied === key ? 'Copiado!' : 'Copiar'}
                                </button>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-700 text-sm whitespace-pre-wrap leading-relaxed shadow-sm">
                                {text as string}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
      </div>
    </div>
  );
}

const ResizeModal = ({ isOpen, onClose, onResize, currentWidth, currentHeight }: any) => {
  const [width, setWidth] = useState(currentWidth);
  const [height, setHeight] = useState(currentHeight);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const aspectRatio = currentWidth / currentHeight;

  useEffect(() => {
    if (isOpen) {
      setWidth(currentWidth);
      setHeight(currentHeight);
    }
  }, [isOpen, currentWidth, currentHeight]);

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newW = parseInt(e.target.value) || 0;
    setWidth(newW);
    if (maintainAspectRatio) {
      setHeight(Math.round(newW / aspectRatio));
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newH = parseInt(e.target.value) || 0;
    setHeight(newH);
    if (maintainAspectRatio) {
      setWidth(Math.round(newH * aspectRatio));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-xs shadow-2xl border border-slate-100 animate-in zoom-in duration-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <ResizeIcon className="w-5 h-5 text-cyan-500" /> Redimensionar
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Largura (px)</label>
            <input type="number" value={width} onChange={handleWidthChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-cyan-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Altura (px)</label>
            <input type="number" value={height} onChange={handleHeightChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-cyan-500 outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <button 
                onClick={() => setMaintainAspectRatio(!maintainAspectRatio)}
                className={`p-2 rounded-lg border transition-colors ${maintainAspectRatio ? 'bg-cyan-50 border-cyan-200 text-cyan-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
            >
                {maintainAspectRatio ? <LinkIcon className="w-4 h-4" /> : <LinkSlashIcon className="w-4 h-4" />}
            </button>
            <span className="text-xs text-slate-500">Manter proporção</span>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
            <button onClick={() => onResize(width, height)} className="flex-1 py-2 text-sm bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium shadow-lg shadow-cyan-500/30">Aplicar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CropModal = ({ isOpen, onClose, onCrop, imageSrc, initialWidth, initialHeight }: any) => {
    const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [dragAction, setDragAction] = useState<'move' | 'resize' | null>(null);
    
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [renderRect, setRenderRect] = useState({ width: 0, height: 0, left: 0, top: 0, scale: 1 });

    useEffect(() => {
        if (isOpen) {
            const w = initialWidth * 0.8;
            const h = initialHeight * 0.8;
            const x = (initialWidth - w) / 2;
            const y = (initialHeight - h) / 2;
            setCrop({ x, y, width: w, height: h });
        }
    }, [isOpen, initialWidth, initialHeight]);

    useLayoutEffect(() => {
        if (isOpen && imgRef.current && containerRef.current) {
            const updateMetrics = () => {
                if (!imgRef.current || !containerRef.current) return;
                const imgRect = imgRef.current.getBoundingClientRect();
                const containerRect = containerRef.current.getBoundingClientRect();
                
                setRenderRect({
                    width: imgRect.width,
                    height: imgRect.height,
                    left: imgRect.left - containerRect.left,
                    top: imgRect.top - containerRect.top,
                    scale: initialWidth / imgRect.width
                });
            }
            
            setTimeout(updateMetrics, 50);
            window.addEventListener('resize', updateMetrics);
            return () => window.removeEventListener('resize', updateMetrics);
        }
    }, [isOpen, imageSrc]);

    const getVisualCrop = () => {
        if (renderRect.scale === 0) return { left: 0, top: 0, width: 0, height: 0 };
        return {
            left: renderRect.left + (crop.x / renderRect.scale),
            top: renderRect.top + (crop.y / renderRect.scale),
            width: crop.width / renderRect.scale,
            height: crop.height / renderRect.scale
        };
    };

    const visualCrop = getVisualCrop();

    const handlePointerDown = (e: React.PointerEvent, action: 'move' | 'resize') => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        setDragAction(action);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !renderRect.scale) return;
        e.preventDefault();
        e.stopPropagation();

        const deltaX = (e.clientX - dragStart.x) * renderRect.scale;
        const deltaY = (e.clientY - dragStart.y) * renderRect.scale;
        
        let newCrop = { ...crop };

        if (dragAction === 'move') {
            newCrop.x = Math.min(Math.max(0, crop.x + deltaX), initialWidth - crop.width);
            newCrop.y = Math.min(Math.max(0, crop.y + deltaY), initialHeight - crop.height);
        } else if (dragAction === 'resize') {
            const newW = Math.min(Math.max(50, crop.width + deltaX), initialWidth - crop.x);
            const newH = Math.min(Math.max(50, crop.height + deltaY), initialHeight - crop.y);
            newCrop.width = newW;
            newCrop.height = newH;
        }

        setCrop(newCrop);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handlePointerUp = () => {
        setIsDragging(false);
        setDragAction(null);
    };

    const setAspectRatio = (ratio: number | null) => {
        let w = crop.width;
        let h = crop.height;
        
        if (ratio === null) return; 

        h = w / ratio;
        if (crop.y + h > initialHeight) {
            h = initialHeight - crop.y;
            w = h * ratio;
        } else if (crop.x + w > initialWidth) {
            w = initialWidth - crop.x;
            h = w / ratio;
        }
        setCrop({ ...crop, width: w, height: h });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex flex-col"
             onPointerMove={handlePointerMove}
             onPointerUp={handlePointerUp}
        >
            <div className="flex-none p-4 flex justify-between items-center text-white">
                <h3 className="text-lg font-bold flex gap-2 items-center"><CropIcon className="w-5 h-5"/> Recortar Imagem</h3>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><XMarkIcon className="w-6 h-6"/></button>
            </div>

            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4" ref={containerRef}>
                <img 
                    ref={imgRef}
                    src={imageSrc} 
                    alt="Crop Source" 
                    className="max-w-full max-h-full object-contain select-none pointer-events-none opacity-50"
                />
                {/* Crop Overlay */}
                <div 
                    className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move"
                    style={{
                        left: visualCrop.left,
                        top: visualCrop.top,
                        width: visualCrop.width,
                        height: visualCrop.height,
                        touchAction: 'none'
                    }}
                    onPointerDown={(e) => handlePointerDown(e, 'move')}
                >
                    {/* Resize Handle */}
                    <div 
                        className="absolute -bottom-3 -right-3 w-6 h-6 bg-cyan-500 border-2 border-white rounded-full cursor-nwse-resize z-20"
                        onPointerDown={(e) => handlePointerDown(e, 'resize')}
                    />
                    {/* Grid lines for rule of thirds */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                        <div className="border-r border-white/30 col-span-1 row-span-3"></div>
                        <div className="border-r border-white/30 col-span-1 row-span-3"></div>
                        <div className="absolute w-full h-1/3 border-b border-white/30 top-0"></div>
                        <div className="absolute w-full h-1/3 border-b border-white/30 top-1/3"></div>
                    </div>
                </div>
            </div>

            <div className="flex-none bg-slate-800 p-4 pb-safe">
                <div className="flex justify-center gap-4 mb-4 overflow-x-auto no-scrollbar">
                    <button onClick={() => setAspectRatio(null)} className="px-3 py-1 rounded-full bg-slate-700 text-white text-xs whitespace-nowrap">Livre</button>
                    <button onClick={() => setAspectRatio(1)} className="px-3 py-1 rounded-full bg-slate-700 text-white text-xs whitespace-nowrap">1:1 (Quadrado)</button>
                    <button onClick={() => setAspectRatio(16/9)} className="px-3 py-1 rounded-full bg-slate-700 text-white text-xs whitespace-nowrap">16:9 (YouTube)</button>
                    <button onClick={() => setAspectRatio(4/5)} className="px-3 py-1 rounded-full bg-slate-700 text-white text-xs whitespace-nowrap">4:5 (Insta)</button>
                </div>
                <button 
                    onClick={() => onCrop(crop.x, crop.y, crop.width, crop.height)}
                    className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
                >
                    Aplicar Recorte
                </button>
            </div>
        </div>
    );
};

// --- Main App Component ---

function App() {
  const [activeTab, setActiveTab] = useState<'editor' | 'marketing' | 'magic' | 'gallery'>('editor');
  const [prompt, setPrompt] = useState('');
  const [marketingPrompt, setMarketingPrompt] = useState({ surface: '', lighting: '', style: '', targetAudience: '' });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentMimeType, setCurrentMimeType] = useState<string>('image/png');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  // Canvas & View States
  const [comparisonMode, setComparisonMode] = useState<'slider' | 'split'>('slider');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanningTool, setIsPanningTool] = useState(false);

  // Tool States
  const [isMasking, setIsMasking] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });

  // Modals
  const [copyResult, setCopyResult] = useState<MarketingCopyResult | null>(null);
  const [isResizeModalOpen, setIsResizeModalOpen] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Firebase
  const [user, setUser] = useState<any>(null);
  const [gallery, setGallery] = useState<any[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) fetchGallery(currentUser.uid);
    });

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
    });

    return () => unsubscribe();
  }, []);

  const fetchGallery = async (uid: string) => {
    if (!db) return; // Demo mode guard
    try {
        const q = query(collection(db, "images"), where("userId", "==", uid), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        setGallery(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
        console.error("Gallery fetch error", e);
    }
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setAuthError(null);
    } catch (err: any) {
      console.error("Login failed", err);
      if (err.code === 'auth/unauthorized-domain') {
         setAuthError(window.location.hostname);
      } else if (err.code === 'auth/popup-blocked') {
         setError("O popup de login foi bloqueado. Permita popups para este site.");
      } else {
         setError("Falha ao fazer login. Tente novamente.");
      }
    }
  };

  const handleGuestLogin = () => {
    setUser({ uid: 'guest', displayName: 'Visitante', photoURL: null });
    // Load local gallery if any
    const local = localStorage.getItem('pixai_gallery');
    if (local) setGallery(JSON.parse(local));
  };

  const handleLogout = () => {
    signOut(auth);
    setUser(null);
    setGallery([]);
  };

  const handleSaveToCloud = async () => {
    if (!generatedImage || !user) return;
    setIsLoading(true);
    try {
        let imageUrl = generatedImage;
        
        if (user.uid !== 'guest') {
            const blob = await (await fetch(generatedImage)).blob();
            const storageRef = ref(storage, `users/${user.uid}/${Date.now()}.png`);
            await uploadBytes(storageRef, blob);
            imageUrl = await getDownloadURL(storageRef);
            
            await addDoc(collection(db, "images"), {
                userId: user.uid,
                url: imageUrl,
                prompt: prompt,
                createdAt: new Date()
            });
            fetchGallery(user.uid);
        } else {
             // Guest mode local storage
             const newImg = { id: Date.now().toString(), url: generatedImage, prompt: prompt, createdAt: new Date() };
             const newGallery = [newImg, ...gallery];
             setGallery(newGallery);
             localStorage.setItem('pixai_gallery', JSON.stringify(newGallery));
        }
        alert("Imagem salva na galeria!");
    } catch (e) {
        console.error(e);
        setError("Erro ao salvar na nuvem.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        
        const img = new Image();
        img.onload = () => {
            setImgDimensions({ width: img.width, height: img.height });
            setCurrentImage(base64);
            setOriginalImage(base64);
            setCurrentMimeType(file.type);
            setGeneratedImage(null);
            setZoom(1);
            setPan({x: 0, y: 0});
            setPrompt('');
            setIsMasking(false);
        };
        img.src = base64;
      } catch (err) {
        setError("Failed to load image");
      }
    }
  };

  const handleReset = () => {
    setCurrentImage(null);
    setOriginalImage(null);
    setGeneratedImage(null);
    setPrompt('');
    setMarketingPrompt({ surface: '', lighting: '', style: '', targetAudience: '' });
    setIsMasking(false);
    setZoom(1);
  };

  const handleDownload = (url: string) => {
      const link = document.createElement('a');
      link.href = url;
      link.download = `pixai-edit-${Date.now()}.${currentMimeType.split('/')[1]}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleCrop = async (x: number, y: number, w: number, h: number) => {
      if (!currentImage) return;
      try {
          const cropped = await cropImage(currentImage, x, y, w, h);
          setCurrentImage(cropped);
          setOriginalImage(cropped); // Update original baseline
          setGeneratedImage(null);
          setImgDimensions({ width: w, height: h });
          setIsCropModalOpen(false);
      } catch (e) {
          setError("Failed to crop image");
      }
  };

  const handleResize = async (w: number, h: number) => {
      if (!currentImage) return;
      try {
          const resized = await resizeImage(currentImage, w, h, currentMimeType);
          setCurrentImage(resized);
          setOriginalImage(resized);
          setGeneratedImage(null);
          setImgDimensions({ width: w, height: h });
          setIsResizeModalOpen(false);
      } catch (e) {
          setError("Failed to resize");
      }
  };

  const getFinalPrompt = () => {
      if (activeTab === 'marketing') {
          const parts = [
              "Professional product photography",
              marketingPrompt.surface ? marketingPrompt.surface : "",
              marketingPrompt.lighting ? marketingPrompt.lighting : "",
              marketingPrompt.style ? marketingPrompt.style : "",
              "high quality, photorealistic, 4k"
          ].filter(Boolean);
          return parts.join(', ') + (prompt ? `. ${prompt}` : '');
      }
      return prompt;
  };

  const handleGenerate = async (overridePrompt?: string) => {
    if (!currentImage) return;
    
    setIsLoading(true);
    setError(null);

    try {
        let finalPrompt = overridePrompt || getFinalPrompt();
        let imageToSend = currentImage;

        if (isMasking && canvasRef.current && imageRef.current) {
             // Inpainting Logic
             const canvas = document.createElement('canvas');
             canvas.width = imgDimensions.width;
             canvas.height = imgDimensions.height;
             const ctx = canvas.getContext('2d');
             
             if (ctx) {
                 // Draw Original
                 const img = new Image();
                 img.src = currentImage;
                 await new Promise(r => img.onload = r);
                 ctx.drawImage(img, 0, 0);

                 // Draw Mask (Red)
                 // We need to scale the drawing canvas (visible) to the actual image size
                 const drawCanvas = canvasRef.current;
                 ctx.drawImage(drawCanvas, 0, 0, imgDimensions.width, imgDimensions.height);
                 
                 imageToSend = canvas.toDataURL('image/png'); // Force PNG for clean mask colors
             }
        }

        const result = await editImage(imageToSend, currentMimeType, finalPrompt, isMasking);
        
        // Updated: result is now the full data URI string, use it directly
        setGeneratedImage(result);
        
        // Reset masking after generation
        if (isMasking) setIsMasking(false);

    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  const handleGenerateCopy = async () => {
      if (!currentImage) return;
      setIsLoading(true);
      try {
          // Use generated image if available for better context, otherwise original
          const imgToAnalyze = generatedImage || currentImage;
          const context = getFinalPrompt();
          
          const result = await generateMarketingCopy(
              imgToAnalyze, 
              currentMimeType, 
              context, 
              marketingPrompt.targetAudience
          );
          setCopyResult(result);
      } catch (err: any) {
          setError(err.message);
      } finally {
          setIsLoading(false);
      }
  };

  // --- Canvas Interaction Handlers ---

  const handleWheel = (e: React.WheelEvent) => {
      if (e.ctrlKey || isPanningTool) {
          e.preventDefault();
          const delta = -e.deltaY * 0.001;
          setZoom(z => Math.min(Math.max(0.1, z + delta), 5));
      }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!imageRef.current) return;
      
      // Update cursor visual
      const rect = e.currentTarget.getBoundingClientRect();
      setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

      // Pan Logic
      if (isPanningTool && e.buttons === 1) {
          setPan(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
          return;
      }

      // Drawing Logic (Masking)
      if (isMasking && e.buttons === 1 && canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // Map visual coordinates to canvas internal resolution
          // We render the drawing canvas at the exact size of the visual image for smoothness
          // Then scale it up during generation
          const x = e.nativeEvent.offsetX;
          const y = e.nativeEvent.offsetY;

          ctx.beginPath();
          ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
          ctx.fillStyle = '#FF0000'; // Pure Red for mask
          ctx.fill();
      }
  };

  const clearMask = () => {
      if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
  };

  // --- Render Helpers ---

  const renderToolsContent = () => {
    if (activeTab === 'magic') {
        return (
            <div className="grid grid-cols-2 gap-3 pb-20 md:pb-0">
                {MAGIC_TOOLS.map(tool => (
                    <button
                        key={tool.id}
                        onClick={() => {
                            if (tool.id === 'erase_object') {
                                setIsMasking(true);
                                setActiveTab('editor'); // Switch to editor view for canvas interaction
                            } else {
                                handleGenerate(tool.prompt);
                            }
                        }}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 shadow-sm transition-all hover:shadow-md active:scale-95 text-center ${tool.bg}`}
                    >
                        <tool.icon className={`w-8 h-8 ${tool.color}`} />
                        <div>
                            <span className="block font-bold text-slate-700 text-sm">{tool.label}</span>
                            <span className="text-[10px] text-slate-500 leading-tight mt-1 block">{tool.description}</span>
                        </div>
                    </button>
                ))}
            </div>
        );
    }

    if (activeTab === 'marketing') {
        return (
            <div className="space-y-6 pb-20 md:pb-0">
                <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                        <UsersIcon className="w-4 h-4 text-cyan-500" /> Público Alvo
                    </label>
                    <input 
                        type="text" 
                        placeholder="Ex: Jovens gamers, Executivos..." 
                        value={marketingPrompt.targetAudience}
                        onChange={(e) => setMarketingPrompt(prev => ({ ...prev, targetAudience: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500 outline-none shadow-sm"
                    />
                </div>

                {/* Category Selectors */}
                <div className="space-y-4">
                   <div>
                       <span className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 mb-2"><CubeIcon className="w-3 h-3"/> Cenário</span>
                       <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                           {MARKETING_OPTIONS.surfaces.map(opt => (
                               <button 
                                   key={opt.id}
                                   onClick={() => setMarketingPrompt(prev => ({ ...prev, surface: opt.value }))}
                                   className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-medium transition-all border ${marketingPrompt.surface === opt.value ? 'bg-cyan-500 text-white border-cyan-500 shadow-lg shadow-cyan-500/20' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                               >
                                   {opt.label}
                               </button>
                           ))}
                       </div>
                   </div>
                   <div>
                       <span className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 mb-2"><SunIcon className="w-3 h-3"/> Iluminação</span>
                       <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                           {MARKETING_OPTIONS.lighting.map(opt => (
                               <button 
                                   key={opt.id}
                                   onClick={() => setMarketingPrompt(prev => ({ ...prev, lighting: opt.value }))}
                                   className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-medium transition-all border ${marketingPrompt.lighting === opt.value ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                               >
                                   {opt.label}
                               </button>
                           ))}
                       </div>
                   </div>
                   <div>
                       <span className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 mb-2"><LayersIcon className="w-3 h-3"/> Estilo</span>
                       <div className="grid grid-cols-2 gap-2">
                           {MARKETING_OPTIONS.styles.map(opt => (
                               <button 
                                   key={opt.id}
                                   onClick={() => setMarketingPrompt(prev => ({ ...prev, style: opt.value }))}
                                   className={`px-3 py-3 rounded-xl text-xs font-medium transition-all border text-left ${marketingPrompt.style === opt.value ? 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/20' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                               >
                                   {opt.label}
                               </button>
                           ))}
                       </div>
                   </div>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-mono text-slate-500 mb-2 uppercase">Prompt Gerado</p>
                    <p className="text-xs text-slate-700 italic">"{getFinalPrompt()}"</p>
                </div>
            </div>
        );
    }

    if (activeTab === 'gallery') {
        return (
            <div className="grid grid-cols-2 gap-2 pb-20 md:pb-0">
                {gallery.length === 0 ? (
                    <div className="col-span-2 text-center p-8 text-slate-400 text-sm">Galeria vazia</div>
                ) : (
                    gallery.map((img, i) => (
                        <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer" onClick={() => {
                            setCurrentImage(img.url);
                            setOriginalImage(img.url);
                            setGeneratedImage(null);
                        }}>
                            <img src={img.url} className="w-full h-full object-cover" alt="Saved" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        </div>
                    ))
                )}
            </div>
        );
    }

    // Editor Tab
    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-400">Descreva sua edição</label>
                <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ex: Mude o céu para rosa, adicione fogos de artifício..."
                    className="w-full h-32 bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 outline-none resize-none shadow-sm"
                />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-400">Sugestões Rápidas</label>
                <div className="flex flex-wrap gap-2">
                    {PRESETS.map(preset => (
                        <button
                            key={preset.id}
                            onClick={() => setPrompt(preset.prompt)}
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50 text-slate-600 text-xs rounded-lg transition-colors"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
  };

  // --- Main Render ---
  
  return (
    <div className="flex h-dvh w-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4 shadow-sm">
        <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-700">
            <Bars3Icon className="w-6 h-6" />
        </button>
        <PixaiLogoFull size="small" />
        {user ? (
           <img src={user.photoURL || 'https://placehold.co/32'} className="w-8 h-8 rounded-full border border-slate-200" onClick={handleLogout} />
        ) : (
           <button onClick={handleLogin} className="text-cyan-600"><UserCircleIcon className="w-7 h-7"/></button>
        )}
      </div>

      {/* Sidebar (Desktop) / Drawer (Mobile) */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50 w-80 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 shadow-2xl md:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
           <PixaiLogoFull />
           <button className="md:hidden" onClick={() => setIsMobileMenuOpen(false)}><XMarkIcon className="w-6 h-6 text-slate-400" /></button>
        </div>

        {/* User Section */}
        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
            {user ? (
                <div className="flex items-center gap-3">
                    <img src={user.photoURL || 'https://placehold.co/40'} className="w-10 h-10 rounded-full border border-white shadow-sm" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{user.displayName}</p>
                        <button onClick={handleLogout} className="text-xs text-red-500 hover:underline">Sair</button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    <button onClick={handleLogin} className="w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors">
                        Entrar com Google
                    </button>
                    <button onClick={handleGuestLogin} className="w-full py-2 text-slate-500 hover:text-slate-700 text-xs underline">
                        Entrar como Visitante
                    </button>
                </div>
            )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex p-2 gap-1 border-b border-slate-100 overflow-x-auto no-scrollbar">
          <Tooltip content="Editor Livre" className="flex-1">
            <button 
              onClick={() => setActiveTab('editor')}
              className={`w-full py-3 rounded-lg flex flex-col items-center gap-1 transition-all ${activeTab === 'editor' ? 'bg-cyan-50 text-cyan-600 shadow-inner' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <PaletteIcon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase">Editor</span>
            </button>
          </Tooltip>
          <Tooltip content="Marketing Studio" className="flex-1">
            <button 
              onClick={() => setActiveTab('marketing')}
              className={`w-full py-3 rounded-lg flex flex-col items-center gap-1 transition-all ${activeTab === 'marketing' ? 'bg-purple-50 text-purple-600 shadow-inner' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <ShoppingBagIcon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase">Mkt</span>
            </button>
          </Tooltip>
          <Tooltip content="Ferramentas Mágicas" className="flex-1">
            <button 
              onClick={() => setActiveTab('magic')}
              className={`w-full py-3 rounded-lg flex flex-col items-center gap-1 transition-all ${activeTab === 'magic' ? 'bg-pink-50 text-pink-600 shadow-inner' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <SparklesIcon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase">Magic</span>
            </button>
          </Tooltip>
          {user && (
              <Tooltip content="Minha Galeria" className="flex-1">
                <button 
                  onClick={() => setActiveTab('gallery')}
                  className={`w-full py-3 rounded-lg flex flex-col items-center gap-1 transition-all ${activeTab === 'gallery' ? 'bg-slate-100 text-slate-800 shadow-inner' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <PhotoIcon className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase">Galeria</span>
                </button>
              </Tooltip>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {renderToolsContent()}
        </div>

        {/* Generate Button */}
        <div className="p-6 border-t border-slate-100 bg-white">
            {activeTab !== 'gallery' && !isMasking && (
                <button 
                    onClick={() => handleGenerate()}
                    disabled={isLoading || !currentImage}
                    className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                           <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                           Processando...
                        </>
                    ) : (
                        <>
                           <SparklesIcon className="w-5 h-5" />
                           Gerar Imagem
                        </>
                    )}
                </button>
            )}
            {isMasking && (
                 <button 
                    onClick={() => handleGenerate()}
                    className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <CheckIcon className="w-5 h-5" /> Confirmar Remoção
                </button>
            )}
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50 md:pt-0 pt-16">
        
        {/* Top Toolbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 z-30">
           <div className="flex items-center gap-2 md:gap-4">
               <button 
                   onClick={() => document.getElementById('file-upload')?.click()}
                   className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
               >
                   <UploadIcon className="w-4 h-4" />
                   <span className="hidden md:inline">Carregar</span>
               </button>
               <input 
                   id="file-upload"
                   type="file" 
                   ref={fileInputRef}
                   className="hidden" 
                   accept="image/*"
                   onChange={handleImageUpload}
               />
               {currentImage && (
                   <Tooltip content="Começar do zero">
                       <button onClick={handleReset} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                           <PlusIcon className="w-5 h-5" />
                       </button>
                   </Tooltip>
               )}
               {deferredPrompt && (
                   <button onClick={handleInstall} className="md:hidden p-2 text-cyan-600">
                       <DevicePhoneMobileIcon className="w-6 h-6" />
                   </button>
               )}
           </div>

           <div className="flex items-center gap-2 md:gap-3">
               {currentImage && (
                   <>
                        <Tooltip content="Recortar">
                           <button onClick={() => setIsCropModalOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                               <CropIcon className="w-5 h-5" />
                           </button>
                       </Tooltip>
                       <Tooltip content="Redimensionar">
                           <button onClick={() => setIsResizeModalOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                               <ResizeIcon className="w-5 h-5" />
                           </button>
                       </Tooltip>
                       {generatedImage && (
                           <>
                               <div className="h-6 w-px bg-slate-200 mx-1" />
                               <Tooltip content="Comparar: Slider">
                                   <button onClick={() => setComparisonMode('slider')} className={`p-2 rounded-lg transition-colors ${comparisonMode === 'slider' ? 'bg-cyan-50 text-cyan-600' : 'text-slate-400 hover:bg-slate-50'}`}>
                                       <ViewColumnsIcon className="w-5 h-5" />
                                   </button>
                               </Tooltip>
                               <Tooltip content="Comparar: Lado a Lado">
                                   <button onClick={() => setComparisonMode('split')} className={`p-2 rounded-lg transition-colors ${comparisonMode === 'split' ? 'bg-cyan-50 text-cyan-600' : 'text-slate-400 hover:bg-slate-50'}`}>
                                       <ViewSplitIcon className="w-5 h-5" />
                                   </button>
                               </Tooltip>
                           </>
                       )}
                   </>
               )}
           </div>

           <div className="flex items-center gap-2 md:gap-4">
               {/* Marketing Highlight Button */}
               <button
                   onClick={handleGenerateCopy}
                   disabled={!currentImage}
                   className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-lg text-sm font-bold shadow-md shadow-fuchsia-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
               >
                   <MagicWandIcon className="w-4 h-4" />
                   Marketing Copy
               </button>

               <button 
                   onClick={handleSaveToCloud}
                   disabled={!generatedImage || !user}
                   className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
               >
                   <CloudArrowUpIcon className="w-4 h-4" />
                   Salvar Nuvem
               </button>

               {generatedImage && (
                   <button 
                       onClick={() => handleDownload(generatedImage!)} 
                       className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium shadow-lg shadow-cyan-500/30 transition-colors"
                   >
                       <DownloadIcon className="w-4 h-4" />
                       <span className="hidden md:inline">Baixar</span>
                   </button>
               )}
               
               {deferredPrompt && (
                   <button onClick={handleInstall} className="hidden md:flex items-center gap-2 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-600">
                       <DevicePhoneMobileIcon className="w-4 h-4" /> Instalar App
                   </button>
               )}
           </div>
        </header>

        {/* Canvas Area */}
        <div className="flex-1 relative bg-[url('https://placehold.co/20x20/f1f5f9/ffffff?text=')] bg-repeat overflow-hidden flex items-center justify-center p-4 md:p-8 group"
             onWheel={handleWheel}
             onMouseMove={handleCanvasMouseMove}
        >
            {!currentImage ? (
                <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-6 border border-slate-100">
                        <ImageIcon className="w-10 h-10 text-cyan-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Comece sua criação</h2>
                    <p className="text-slate-500 max-w-md mx-auto">Carregue uma imagem para usar nossas ferramentas de edição com IA, marketing e restauração.</p>
                    <button 
                        onClick={() => document.getElementById('file-upload')?.click()}
                        className="px-8 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95"
                    >
                        Escolher Imagem
                    </button>
                </div>
            ) : (
                <div 
                    className="relative shadow-2xl shadow-slate-300/50 transition-transform duration-100 ease-linear"
                    style={{ 
                        transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                        maxWidth: '100%',
                        maxHeight: '100%',
                        cursor: isPanningTool ? 'grab' : isMasking ? 'none' : 'default'
                    }}
                >
                    {generatedImage && !isMasking ? (
                        <div className="w-full h-full" style={{ width: imgDimensions.width || 'auto', height: imgDimensions.height || 'auto' }}>
                            <ComparisonViewer original={originalImage!} generated={generatedImage} mode={comparisonMode} />
                        </div>
                    ) : (
                        <div className="relative">
                            <img 
                                ref={imageRef}
                                src={currentImage} 
                                alt="Editing" 
                                className="max-w-full max-h-[80vh] object-contain pointer-events-none select-none"
                                onLoad={(e) => setImgDimensions({width: e.currentTarget.width, height: e.currentTarget.height})}
                            />
                            {/* Drawing Layer for Masking */}
                            {isMasking && (
                                <canvas
                                    ref={canvasRef}
                                    width={imgDimensions.width}
                                    height={imgDimensions.height}
                                    className="absolute inset-0 pointer-events-auto touch-none opacity-60 mix-blend-multiply"
                                    style={{ width: '100%', height: '100%' }}
                                    onMouseDown={handleCanvasMouseMove}
                                />
                            )}
                            {/* Brush Cursor */}
                            {isMasking && cursorPos.x > 0 && (
                                <div 
                                    className="fixed rounded-full border-2 border-white bg-red-500/50 pointer-events-none z-50"
                                    style={{
                                        width: brushSize * zoom,
                                        height: brushSize * zoom,
                                        left: cursorPos.x, // Coordinates are already relative to container in mouseMove, need to adjust logic if container moves
                                        top: cursorPos.y,  // Simplified for prompt length constraints, ideal implementation uses portal
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                />
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Floating Controls (Zoom/Pan) */}
            {currentImage && (
                <div className="absolute bottom-6 right-6 flex flex-col gap-2 bg-white/90 backdrop-blur shadow-lg border border-slate-100 p-2 rounded-xl z-20">
                     <button onClick={() => setZoom(z => Math.min(z + 0.5, 5))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><MagnifyingGlassPlusIcon className="w-5 h-5"/></button>
                     <button onClick={() => setZoom(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 text-xs font-bold">{Math.round(zoom * 100)}%</button>
                     <button onClick={() => setZoom(z => Math.max(z - 0.5, 0.1))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><MagnifyingGlassMinusIcon className="w-5 h-5"/></button>
                     <div className="h-px w-full bg-slate-200 my-1" />
                     <button onClick={() => setIsPanningTool(!isPanningTool)} className={`p-2 rounded-lg ${isPanningTool ? 'bg-cyan-100 text-cyan-700' : 'text-slate-600 hover:bg-slate-100'}`}><HandIcon className="w-5 h-5"/></button>
                </div>
            )}

            {/* Masking Toolbar */}
            {isMasking && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur text-white p-3 rounded-2xl shadow-2xl flex items-center gap-4 z-40 animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-2 px-2">
                        <BrushIcon className="w-4 h-4" />
                        <input 
                            type="range" 
                            min="5" max="100" 
                            value={brushSize} 
                            onChange={(e) => setBrushSize(Number(e.target.value))}
                            className="w-24 accent-rose-500 h-1 bg-slate-600 rounded-full appearance-none"
                        />
                    </div>
                    <div className="w-px h-6 bg-white/20" />
                    <button onClick={clearMask} className="p-2 hover:bg-white/10 rounded-lg text-rose-300 hover:text-rose-200 flex items-center gap-2 text-xs font-bold">
                        <TrashIcon className="w-4 h-4" /> Limpar
                    </button>
                    <button onClick={() => handleGenerate()} className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 rounded-lg text-xs font-bold shadow-lg shadow-rose-500/20">
                        Aplicar
                    </button>
                </div>
            )}

            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-slate-200 border-t-cyan-500 rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <SparklesIcon className="w-6 h-6 text-cyan-500 animate-pulse" />
                        </div>
                    </div>
                    <p className="mt-4 text-slate-600 font-medium animate-pulse">A IA está trabalhando na sua imagem...</p>
                </div>
            )}

            {/* Error Toast */}
            {error && (
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-red-50 border border-red-100 text-red-600 px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 z-50 animate-in slide-in-from-top-full">
                    <span className="font-bold text-lg">!</span>
                    <p className="text-sm font-medium">{error}</p>
                    <button onClick={() => setError(null)}><XMarkIcon className="w-5 h-5 opacity-50 hover:opacity-100"/></button>
                </div>
            )}
        </div>
      </main>

      {/* Modals */}
      <ResizeModal isOpen={isResizeModalOpen} onClose={() => setIsResizeModalOpen(false)} onResize={handleResize} currentWidth={imgDimensions.width} currentHeight={imgDimensions.height} />
      <CropModal isOpen={isCropModalOpen} onClose={() => setIsCropModalOpen(false)} onCrop={handleCrop} imageSrc={currentImage} initialWidth={imgDimensions.width} initialHeight={imgDimensions.height} />
      {copyResult && <CopyModal data={copyResult} onClose={() => setCopyResult(null)} />}
      <AuthDomainErrorModal isOpen={!!authError} onClose={() => setAuthError(null)} domain={authError || ''} />

    </div>
  );
}

export default App;