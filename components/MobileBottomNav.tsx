import React from 'react';
import { PaletteIcon, ShoppingBagIcon, SparklesIcon, PhotoIcon } from './Icons.tsx';

type AppTab = 'editor' | 'marketing' | 'magic' | 'gallery';

type MobileBottomNavProps = {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
};

const MobileBottomNav = ({ activeTab, onTabChange }: MobileBottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 z-40 grid grid-cols-4 px-2 rounded-t-2xl shadow-[0_-6px_20px_rgba(15,23,42,0.08)]">
      <button
        onClick={() => onTabChange('editor')}
        className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold tracking-[0.12em] uppercase ${activeTab === 'editor' ? 'text-blue-700' : 'text-slate-400'}`}
      >
        <PaletteIcon className="w-5 h-5" />
        Editor
      </button>
      <button
        onClick={() => onTabChange('marketing')}
        className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold tracking-[0.12em] uppercase ${activeTab === 'marketing' ? 'text-blue-700' : 'text-slate-400'}`}
      >
        <ShoppingBagIcon className="w-5 h-5" />
        Marketing
      </button>
      <button
        onClick={() => onTabChange('magic')}
        className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold tracking-[0.12em] uppercase ${activeTab === 'magic' ? 'text-blue-700' : 'text-slate-400'}`}
      >
        <SparklesIcon className="w-5 h-5" />
        Mágicas
      </button>
      <button
        onClick={() => onTabChange('gallery')}
        className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold tracking-[0.12em] uppercase ${activeTab === 'gallery' ? 'text-blue-700' : 'text-slate-400'}`}
      >
        <PhotoIcon className="w-5 h-5" />
        Galeria
      </button>
    </nav>
  );
};

export default MobileBottomNav;
