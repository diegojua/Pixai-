import React, { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { editImage, generateMarketingCopy, MarketingCopyResult } from './services/geminiService';
import { fileToBase64, resizeImage, cropImage } from './utils/file';
import PixaiLogoFull from './components/Logo';
import { auth, googleProvider, db, storage } from './services/firebase';
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
} from './components/Icons';

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
       {/* Use a container that fits the image to ensure alignment */}
       <div className="relative w-full h-full flex items-center justify-center">
          {/* Generated (After) - Bottom Layer */}
          <img 
            src={generated} 
            alt="Generated" 
            className="absolute max-w-full max-h-full object-contain select-none pointer-events-none" 
          />

          {/* Original (Before) - Top Layer masked by clip-path */}
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

      {/* Slider Handle Line */}
      <div 
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_15px_rgba(0,0,0,0.5)] cursor-col-resize pointer-events-none"
        style={{ left: `${sliderPosition}%` }}
      >
        {/* Handle Circle */}
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-white rounded-full shadow-xl flex items-center justify-center transition-transform duration-200 ${isDragging ? 'scale-110 ring-4 ring-cyan-400/50' : ''}`}>
          <ArrowsIcon className={`w-5 h-5 md:w-6 md:h-6 ${isDragging ? 'text-cyan-500' : 'text-slate-400'}`} />
        </div>
      </div>

      {/* Labels (Hidden on mobile while dragging) */}
      <div className={`hidden md:block absolute top-6 left-6 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider pointer-events-none transition-opacity duration-300 ${isDragging ? 'opacity-0' : 'opacity-100'}`}>
        Original
      </div>
      <div className={`hidden md:block absolute top-6 right-6 bg-cyan-500/90 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider pointer-events-none transition-opacity duration-300 ${isDragging ? 'opacity-0' : 'opacity-100'}`}>
        Resultado
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
            {/* Visual Identity Section */}
            {(data.colorPalette?.length > 0 || data.emojiSuggestions?.length > 0) && (
                <div className="mb-8 bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Identidade Visual</h4>
                    
                    {/* Colors */}
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

                    {/* Emojis */}
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

            {/* Text Copies */}
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

    const handlePointerDown = (e: React.PointerEvent, action: 'move' | 'resize') => {
        e.preventDefault();
        setIsDragging(true);
        setDragAction(action);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !renderRect.scale) return;
        e.preventDefault();

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
        }
        setCrop({ ...crop, width: w, height: h });
    };

    if (!isOpen) return null;

    const visualCrop = getVisual