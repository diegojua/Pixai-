import React, { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { editImage, generateMarketingCopy, MarketingCopyResult } from './services/geminiService';
import { fileToBase64, resizeImage } from './utils/file';
import PixaiLogoFull from './components/Logo';
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
  DevicePhoneMobileIcon
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

// --- Main App Component ---

const App: React.FC = () => {
  // State
  const [file, setFile] = useState<File | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [currentImageMimeType, setCurrentImageMimeType] = useState<string>('image/png');
  
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'editor' | 'marketing' | 'magic'>('editor');
  const [isMobileToolOpen, setIsMobileToolOpen] = useState(false); // Mobile specific state
  
  const [marketingPrompt, setMarketingPrompt] = useState({ surface: '', lighting: '', style: '' });
  const [targetAudience, setTargetAudience] = useState('');
  
  const [comparisonMode, setComparisonMode] = useState<'slider' | 'split'>('slider');
  
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showResizeModal, setShowResizeModal] = useState(false);
  const [marketingCopy, setMarketingCopy] = useState<MarketingCopyResult | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);

  // Magic / Masking State
  const [magicMode, setMagicMode] = useState<string | null>(null); 
  const [isMasking, setIsMasking] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [cursorPos, setCursorPos] = useState<{x: number, y: number} | null>(null);
  
  // Zoom & Pan State
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isPanToolActive, setIsPanToolActive] = useState(false); 
  const [lastMousePos, setLastMousePos] = useState<{x: number, y: number} | null>(null);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // UI State
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Lifecycle Listeners ---
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    });
  };

  // --- Image Handling ---

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      try {
        if (selectedFile.size > 5 * 1024 * 1024) {
          throw new Error("O arquivo é muito grande. O limite é 5MB.");
        }
        const base64 = await fileToBase64(selectedFile);
        
        const img = new Image();
        img.src = base64;
        img.onload = () => {
            setImageDimensions({ width: img.width, height: img.height });
        }

        setFile(selectedFile);
        setOriginalImage(base64);
        setGeneratedImage(null);
        setCurrentImageMimeType(selectedFile.type);
        setError(null);
        setIsMasking(false);
        setMagicMode(null);
        setPrompt('');
        setIsMobileToolOpen(true); // Open tools automatically on mobile
        
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const handleReset = () => {
    setFile(null);
    setOriginalImage(null);
    setGeneratedImage(null);
    setPrompt('');
    setIsMasking(false);
    setMagicMode(null);
    setError(null);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setIsMobileToolOpen(false);
  };

  // --- Generation Logic ---

  const handleGenerate = async (optionalPrompt?: string) => {
    if (!originalImage) return;
    
    setLoading(true);
    setError(null);
    setIsMobileToolOpen(false); // Close mobile drawer on generate

    try {
      let finalPrompt = optionalPrompt || prompt;
      let imageToSend = originalImage;
      let isMaskingOperation = false;

      if (isMasking && canvasRef.current && imageRef.current && magicMode === 'erase_object') {
        isMaskingOperation = true;
        const naturalWidth = imageRef.current.naturalWidth;
        const naturalHeight = imageRef.current.naturalHeight;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = naturalWidth;
        tempCanvas.height = naturalHeight;
        const ctx = tempCanvas.getContext('2d');
        
        if (ctx) {
           ctx.drawImage(imageRef.current, 0, 0);
           const maskCanvas = canvasRef.current;
           ctx.globalAlpha = 1.0; 
           ctx.drawImage(maskCanvas, 0, 0, maskCanvas.width, maskCanvas.height, 0, 0, naturalWidth, naturalHeight);
           imageToSend = tempCanvas.toDataURL(currentImageMimeType);
           finalPrompt = "Remove the object marked in red.";
        }
      } 
      else if (activeTab === 'marketing' && !optionalPrompt) {
        const parts = [];
        if (marketingPrompt.surface) parts.push(MARKETING_OPTIONS.surfaces.find(o => o.id === marketingPrompt.surface)?.value);
        if (marketingPrompt.lighting) parts.push(MARKETING_OPTIONS.lighting.find(o => o.id === marketingPrompt.lighting)?.value);
        if (marketingPrompt.styles) parts.push(MARKETING_OPTIONS.styles.find(o => o.id === marketingPrompt.styles)?.value);
        if (prompt) parts.push(prompt);
        
        if (parts.length === 0) {
            finalPrompt = "Improve the product photography quality.";
        } else {
            finalPrompt = `Professional product photography, ${parts.join(', ')}, high quality, 8k.`;
        }
      }
      else {
          if (!finalPrompt) {
              finalPrompt = "Enhance this image";
          }
      }

      const result = await editImage(imageToSend.split(',')[1], currentImageMimeType, finalPrompt, isMaskingOperation);
      
      const mimePrefix = result.mimeType ? `data:${result.mimeType};base64,` : 'data:image/png;base64,';
      setGeneratedImage(mimePrefix + result.data);
      
      if (result.mimeType) setCurrentImageMimeType(result.mimeType);

      if (isMasking) {
        setIsMasking(false);
        setMagicMode(null);
      }
      
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });

      setComparisonMode('slider'); 
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicTool = (tool: typeof MAGIC_TOOLS[0]) => {
    if (tool.id === 'erase_object') {
        setMagicMode('erase_object');
        setIsMasking(true);
        setActiveTab('magic');
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
        setIsMobileToolOpen(false); // Close drawer to let user paint
        
        setTimeout(() => {
            if (canvasRef.current && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                canvasRef.current.width = rect.width;
                canvasRef.current.height = rect.height;
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        }, 100);
    } else {
        setMagicMode(tool.id);
        setIsMasking(false);
        handleGenerate(tool.prompt);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCanvasCoordinates(e);
    setCursorPos(coords);

    if (isMasking && !isPanToolActive && canvasRef.current) {
        // Support Touch Events properly
        const isTouch = 'touches' in e;
        if (!isTouch && e.buttons !== 1) return; 
        if (isTouch && !lastMousePos) return;

        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = '#FF0000'; 
            ctx.fill();
        }
    }
  };

  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      return {
          x: clientX - rect.left,
          y: clientY - rect.top
      };
  };

  const handleCanvasMouseLeave = () => setCursorPos(null);

  const clearMask = () => {
      if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
  };

  const handleGenerateCopy = async () => {
      if (!originalImage) return;
      setCopyLoading(true);
      setError(null);
      try {
          const ctxImage = generatedImage || originalImage;
          const contextDesc = activeTab === 'marketing' 
            ? `${marketingPrompt.surface} ${marketingPrompt.lighting} ${marketingPrompt.styles} ${prompt}`
            : prompt || "Product image";
          
          const result = await generateMarketingCopy(
              ctxImage.split(',')[1], 
              currentImageMimeType, 
              contextDesc,
              targetAudience
          );
          setMarketingCopy(result);
          setShowCopyModal(true);
      } catch (err: any) {
          setError(err.message);
      } finally {
          setCopyLoading(false);
      }
  };

  const handleResizeApply = async (w: number, h: number) => {
      if (!originalImage) return;
      try {
          const resizedBase64 = await resizeImage(originalImage, w, h, currentImageMimeType);
          setOriginalImage(resizedBase64);
          setGeneratedImage(null);
          setShowResizeModal(false);
          setImageDimensions({ width: w, height: h });
      } catch (err: any) {
          setError(err.message);
      }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isMasking && !isPanToolActive) return;
    
    e.preventDefault();
    const scaleBy = 1.1;
    const newZoom = e.deltaY < 0 ? Math.min(zoomLevel * scaleBy, 5) : Math.max(zoomLevel / scaleBy, 1);
    setZoomLevel(newZoom);
  };

  // --- Components for Tools ---

  const ToolsContent = () => (
    <div className="space-y-6 pb-8 md:pb-20">
        {activeTab === 'editor' && (
            <div className="space-y-6 animate-in fade-in">
               <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <DocumentTextIcon className="w-4 h-4" /> Prompt
                 </label>
                 <textarea 
                   value={prompt}
                   onChange={(e) => setPrompt(e.target.value)}
                   placeholder="Descreva o que mudar..."
                   className="w-full h-24 md:h-32 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-cyan-500 outline-none resize-none shadow-sm"
                 />
               </div>
               <div className="space-y-3">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estilos Rápidos</label>
                 <div className="grid grid-cols-2 gap-2">
                   {PRESETS.map(preset => (
                     <button
                       key={preset.id}
                       onClick={() => setPrompt(preset.prompt)}
                       className="text-left px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-700 transition-all shadow-sm"
                     >
                       {preset.label}
                     </button>
                   ))}
                 </div>
               </div>
            </div>
        )}
        {activeTab === 'marketing' && (
            <div className="space-y-6 animate-in fade-in">
               <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Público-Alvo</label>
                 <input type="text" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="Ex: Jovens gamers..." className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cenário</label>
                 <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar snap-x">
                    {MARKETING_OPTIONS.surfaces.map(opt => (
                      <button key={opt.id} onClick={() => setMarketingPrompt({...marketingPrompt, surface: opt.id})} className={`shrink-0 snap-start whitespace-nowrap text-xs py-2 px-3 rounded-lg border transition-all ${marketingPrompt.surface === opt.id ? 'bg-violet-500 text-white border-violet-600' : 'bg-white border-slate-200 text-slate-600'}`}>{opt.label}</button>
                    ))}
                 </div>
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Iluminação</label>
                 <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar snap-x">
                    {MARKETING_OPTIONS.lighting.map(opt => (
                      <button key={opt.id} onClick={() => setMarketingPrompt({...marketingPrompt, lighting: opt.id})} className={`shrink-0 snap-start whitespace-nowrap text-xs py-2 px-3 rounded-lg border transition-all ${marketingPrompt.lighting === opt.id ? 'bg-amber-500 text-white border-amber-600' : 'bg-white border-slate-200 text-slate-600'}`}>{opt.label}</button>
                    ))}
                 </div>
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estilo</label>
                 <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar snap-x">
                    {MARKETING_OPTIONS.styles.map(opt => (
                      <button key={opt.id} onClick={() => setMarketingPrompt({...marketingPrompt, styles: opt.id})} className={`shrink-0 snap-start whitespace-nowrap text-xs py-2 px-3 rounded-lg border transition-all ${marketingPrompt.styles === opt.id ? 'bg-pink-500 text-white border-pink-600' : 'bg-white border-slate-200 text-slate-600'}`}>{opt.label}</button>
                    ))}
                 </div>
               </div>
            </div>
        )}
        {activeTab === 'magic' && (
            <div className="space-y-4 animate-in fade-in">
                {MAGIC_TOOLS.map(tool => (
                    <button key={tool.id} onClick={() => handleMagicTool(tool)} className={`w-full group flex items-start gap-4 p-4 rounded-xl border text-left ${magicMode === tool.id ? 'ring-2 ring-cyan-400 border-transparent bg-white' : 'bg-white border-slate-200'}`}>
                        <div className={`p-2 rounded-lg ${tool.bg} ${tool.color}`}><tool.icon className="w-6 h-6" /></div>
                        <div className="flex-1"><h4 className="font-bold text-sm text-slate-700">{tool.label}</h4></div>
                    </button>
                ))}
            </div>
        )}
        
        <div className="pt-4 pb-8">
           {activeTab === 'magic' && magicMode === 'erase_object' ? (
               <div className="text-center p-4 bg-rose-50 rounded-xl border border-rose-100">
                   <p className="text-sm text-rose-600 font-medium">Modo Apagar Ativo</p>
               </div>
           ) : (
               <button onClick={() => handleGenerate()} disabled={!file || loading || activeTab === 'magic'} className={`w-full py-4 rounded-xl font-bold text-white shadow-xl transition-all flex items-center justify-center gap-2 ${!file || loading ? 'bg-slate-300' : activeTab === 'marketing' ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`}>
                {loading ? <span>Processando...</span> : <span>{activeTab === 'marketing' ? 'Gerar Campanha' : 'Gerar Imagem'}</span>}
               </button>
           )}
        </div>
    </div>
  );

  return (
    // h-dvh ensures full height on mobile browsers
    <div className="flex flex-col md:flex-row h-dvh w-screen bg-slate-50 overflow-hidden font-sans fixed inset-0">
      
      {/* --- Desktop Sidebar --- */}
      <div className="hidden md:flex z-30 h-full w-80 bg-white border-r border-slate-200 shadow-sm flex-col">
        <div className="flex p-4 items-center justify-center border-b border-slate-100 bg-white">
            <PixaiLogoFull />
        </div>
        <div className="flex p-2 bg-white gap-1 border-b border-slate-100 shadow-sm z-10">
          {['editor', 'marketing', 'magic'].map((tab: any) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 flex flex-col items-center py-3 rounded-xl transition-all gap-1.5 ${activeTab === tab ? 'bg-cyan-50 text-cyan-600 shadow-inner ring-1 ring-cyan-100' : 'text-slate-400 hover:bg-slate-50'}`}>
              {tab === 'editor' ? <PaletteIcon className="w-5 h-5" /> : tab === 'marketing' ? <ShoppingBagIcon className="w-5 h-5" /> : <MagicWandIcon className="w-5 h-5" />}
              <span className="text-[10px] font-bold uppercase tracking-wide">{tab}</span>
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          <ToolsContent />
        </div>
      </div>

      {/* --- Mobile Header --- */}
      <div className="md:hidden flex-none h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-20">
         <div className="flex items-center">
             <PixaiLogoFull size="small" className="scale-75 origin-left -ml-2" />
         </div>
         <div className="flex gap-2 items-center">
             {deferredPrompt && (
                <button onClick={handleInstallClick} className="bg-cyan-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 animate-pulse">
                    <DevicePhoneMobileIcon className="w-3 h-3" /> Instalar
                </button>
             )}
            {file && <button onClick={handleReset} className="text-slate-500 p-1"><PlusIcon className="w-6 h-6" /></button>}
            {file && <button onClick={() => {
                     const link = document.createElement('a');
                     link.href = generatedImage || originalImage || '';
                     link.download = 'pixai-edit.png';
                     link.click();
                   }} className="text-cyan-600 p-1"><DownloadIcon className="w-6 h-6" /></button>}
         </div>
      </div>

      {/* --- Main Canvas Area --- */}
      <div className="flex-1 flex flex-col relative bg-slate-100 overflow-hidden">
        
        {/* Desktop Toolbar */}
        <div className="hidden md:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-6 shadow-sm shrink-0 z-20">
           <div className="flex items-center gap-3">
             {deferredPrompt && (
                <button onClick={handleInstallClick} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors shadow-lg shadow-cyan-500/30">
                    <DevicePhoneMobileIcon className="w-4 h-4" /> <span>Instalar App</span>
                </button>
             )}
             {file && <button onClick={handleReset} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"><PlusIcon className="w-4 h-4" /><span>Nova Imagem</span></button>}
           </div>
           <div className="flex items-center gap-3">
             {generatedImage && !isMasking && (
               <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200 mr-2">
                    <button onClick={() => setComparisonMode('slider')} className={`p-2 rounded-md transition-all ${comparisonMode === 'slider' ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><ViewColumnsIcon className="w-5 h-5" /></button>
                    <button onClick={() => setComparisonMode('split')} className={`p-2 rounded-md transition-all ${comparisonMode === 'split' ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><ViewSplitIcon className="w-5 h-5" /></button>
               </div>
             )}
             {file && (
                <>
                 <button onClick={() => setShowResizeModal(true)} className="p-2.5 text-slate-600 hover:bg-cyan-50 hover:text-cyan-600 rounded-lg transition-colors"><ResizeIcon className="w-5 h-5" /></button>
                 <button onClick={handleGenerateCopy} disabled={copyLoading} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white rounded-lg shadow-lg hover:scale-105 transition-all font-bold text-sm">{copyLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <DocumentTextIcon className="w-5 h-5" />}<span>Copy</span></button>
                 <button onClick={() => { const link = document.createElement('a'); link.href = generatedImage || originalImage || ''; link.download = 'pixai.png'; link.click(); }} className="p-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg"><DownloadIcon className="w-5 h-5" /></button>
                </>
             )}
           </div>
        </div>

        {/* Canvas Content */}
        <div className="flex-1 relative flex items-center justify-center p-0 md:p-8 touch-none overflow-hidden bg-slate-200/50">
          {!file ? (
             <div className="flex flex-col items-center justify-center w-full h-full p-6 animate-in fade-in zoom-in duration-500" onClick={() => document.getElementById('file-upload')?.click()}>
               <div className="border-2 border-dashed border-slate-300 bg-white rounded-3xl p-8 md:p-12 flex flex-col items-center justify-center gap-4 md:gap-6 hover:border-cyan-400 hover:bg-cyan-50/30 transition-all cursor-pointer shadow-sm w-full max-w-sm">
                 <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 rounded-full flex items-center justify-center">
                    <UploadIcon className="w-8 h-8 md:w-10 md:h-10 text-slate-400" />
                 </div>
                 <div className="text-center space-y-1">
                    <h3 className="text-lg md:text-xl font-bold text-slate-700">Toque para enviar</h3>
                    <p className="text-slate-400 text-xs md:text-sm">JPG, PNG e WebP</p>
                 </div>
                 <input type="file" id="file-upload" className="hidden" accept="image/*" onChange={handleFileChange} />
               </div>
             </div>
          ) : (
             <div 
                className="relative w-full h-full flex items-center justify-center overflow-hidden"
                onWheel={handleWheel}
             >
                {error && (
                  <div className="absolute top-4 left-4 right-4 bg-rose-500 text-white px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center justify-between animate-in fade-in slide-in-from-top-4">
                    <span className="text-xs font-medium flex-1 mr-2">{error}</span>
                    <button onClick={() => setError(null)}><XMarkIcon className="w-4 h-4" /></button>
                  </div>
                )}

                {generatedImage && !isMasking ? (
                  <div className="w-full h-full transition-transform duration-200 ease-out" style={{ transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)` }}>
                    <ComparisonViewer original={originalImage || ''} generated={generatedImage} mode={comparisonMode} />
                  </div>
                ) : (
                  <div 
                    ref={containerRef}
                    className={`relative shadow-2xl md:rounded-lg transition-transform duration-200 ease-out ${isMasking ? 'cursor-none' : ''}`}
                    style={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%',
                        transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                    }}
                  >
                     <img 
                        ref={imageRef} 
                        src={originalImage || ''} 
                        alt="Original" 
                        className="max-w-full max-h-full object-contain block select-none pointer-events-none md:pointer-events-auto"
                        onMouseMove={handleCanvasMouseMove}
                        onMouseLeave={handleCanvasMouseLeave}
                        onTouchMove={handleCanvasMouseMove}
                        onMouseDown={(e) => { if(isMasking && isPanToolActive) { setIsPanning(true); setLastMousePos({ x: e.clientX, y: e.clientY }); } }}
                        onMouseUp={() => { setIsPanning(false); setLastMousePos(null); }}
                     />
                     {isMasking && (
                        <canvas 
                            ref={canvasRef}
                            className="absolute top-0 left-0 w-full h-full touch-none"
                            onMouseMove={handleCanvasMouseMove}
                            onMouseLeave={handleCanvasMouseLeave}
                            onTouchMove={handleCanvasMouseMove}
                            onMouseDown={(e) => { if(isPanToolActive) { setIsPanning(true); setLastMousePos({ x: e.clientX, y: e.clientY }); } }}
                            onMouseUp={() => { setIsPanning(false); setLastMousePos(null); }}
                        />
                     )}
                     {/* Custom Brush Cursor (Desktop Only) */}
                     {isMasking && !isPanToolActive && cursorPos && window.matchMedia('(hover: hover)').matches && (
                        <div 
                            className="pointer-events-none absolute border-2 border-rose-500 bg-rose-500/20 rounded-full z-50"
                            style={{ width: brushSize, height: brushSize, left: cursorPos.x - brushSize/2, top: cursorPos.y - brushSize/2 }}
                        />
                     )}
                  </div>
                )}

                {/* Floating Zoom Controls */}
                <div className="absolute bottom-20 right-4 flex flex-col gap-2 md:bottom-8 md:right-8 z-40">
                     <button onClick={() => setZoomLevel(z => Math.min(z + 0.5, 5))} className="bg-white/90 backdrop-blur p-2 rounded-lg shadow-lg border border-slate-100 text-slate-600 active:bg-slate-200"><MagnifyingGlassPlusIcon className="w-6 h-6" /></button>
                     <button onClick={() => setZoomLevel(z => Math.max(z - 0.5, 1))} className="bg-white/90 backdrop-blur p-2 rounded-lg shadow-lg border border-slate-100 text-slate-600 active:bg-slate-200"><MagnifyingGlassMinusIcon className="w-6 h-6" /></button>
                </div>
                
                {/* Masking Floating Toolbar */}
                {isMasking && (
                    <div className="absolute bottom-24 left-4 right-4 md:bottom-8 md:left-1/2 md:right-auto md:transform md:-translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 flex flex-col md:flex-row items-center gap-4 animate-in slide-in-from-bottom-10 z-50">
                        <div className="flex w-full md:w-auto justify-between items-center gap-2 md:border-r md:border-slate-200 md:pr-4">
                             <div className="flex gap-2">
                                <button onClick={() => setIsPanToolActive(false)} className={`p-2 rounded-lg transition-colors ${!isPanToolActive ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-500'}`}><BrushIcon className="w-5 h-5" /></button>
                                <button onClick={() => setIsPanToolActive(true)} className={`p-2 rounded-lg transition-colors ${isPanToolActive ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-50 text-slate-500'}`}><HandIcon className="w-5 h-5" /></button>
                             </div>
                             <button onClick={clearMask} className="p-2 bg-slate-50 text-slate-500 rounded-lg md:hidden"><TrashIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="flex w-full md:w-auto items-center gap-3">
                            <input type="range" min="5" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full md:w-24 accent-rose-500" />
                        </div>
                        <div className="hidden md:block w-px h-8 bg-slate-200 mx-2"></div>
                        <button onClick={() => handleGenerate()} className="w-full md:w-auto bg-rose-500 active:bg-rose-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-rose-500/30 flex items-center justify-center gap-2">
                            <CheckIcon className="w-4 h-4" /> Confirmar
                        </button>
                    </div>
                )}
             </div>
          )}
      </div>
      </div>

      {/* --- Mobile Bottom Sheet (Tools) --- */}
      {file && (
        <>
            {/* Overlay */}
            {isMobileToolOpen && (
                <div className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30" onClick={() => setIsMobileToolOpen(false)} />
            )}
            
            {/* Bottom Sheet Content */}
            <div className={`md:hidden fixed left-0 right-0 bg-white rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.1)] z-40 transition-transform duration-300 ease-out flex flex-col ${isMobileToolOpen ? 'translate-y-0 bottom-[70px]' : 'translate-y-full bottom-0'}`} style={{ maxHeight: '60vh' }}>
                <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-2 shrink-0" />
                <div className="px-5 pb-5 overflow-y-auto">
                    <ToolsContent />
                </div>
            </div>

            {/* --- Mobile Bottom Navigation --- */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-[70px] bg-white border-t border-slate-100 flex items-center justify-around px-2 z-50 pb-2">
                 {['editor', 'marketing', 'magic'].map((tab: any) => (
                    <button 
                        key={tab} 
                        onClick={() => {
                            if (activeTab === tab && isMobileToolOpen) {
                                setIsMobileToolOpen(false);
                            } else {
                                setActiveTab(tab);
                                setIsMobileToolOpen(true);
                            }
                        }} 
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl w-16 transition-colors ${activeTab === tab ? 'text-cyan-600' : 'text-slate-400'}`}
                    >
                        <div className={`p-1 rounded-lg ${activeTab === tab ? 'bg-cyan-50' : ''}`}>
                            {tab === 'editor' ? <PaletteIcon className="w-6 h-6" /> : tab === 'marketing' ? <ShoppingBagIcon className="w-6 h-6" /> : <MagicWandIcon className="w-6 h-6" />}
                        </div>
                        <span className="text-[10px] font-bold uppercase">{tab === 'magic' ? 'Mágico' : tab}</span>
                    </button>
                 ))}
                 <button 
                    onClick={handleGenerateCopy} 
                    disabled={!file}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl w-16 ${activeTab === 'copy' ? 'text-fuchsia-600' : 'text-slate-400'}`}
                 >
                    <div className="p-1">
                        <DocumentTextIcon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase">Copy</span>
                 </button>
            </div>
        </>
      )}

      {/* Modals */}
      {marketingCopy && showCopyModal && <CopyModal data={marketingCopy} onClose={() => setShowCopyModal(false)} />}
      {showResizeModal && <ResizeModal isOpen={showResizeModal} onClose={() => setShowResizeModal(false)} onResize={handleResizeApply} currentWidth={imageDimensions.width} currentHeight={imageDimensions.height} />}
    </div>
  );
};

export default App;