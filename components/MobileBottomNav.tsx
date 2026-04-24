import React from 'react';
import { PaletteIcon, ShoppingBagIcon, SparklesIcon, PhotoIcon } from './Icons.tsx';

type AppTab = 'editor' | 'marketing' | 'magic' | 'gallery';

type MobileBottomNavProps = {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
};

const MobileBottomNav = ({ activeTab, onTabChange }: MobileBottomNavProps) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 z-40 grid grid-cols-4 px-2">
      <button
        onClick={() => onTabChange('editor')}
        className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold tracking-wide uppercase ${activeTab === 'editor' ? 'text-blue-700' : 'text-slate-400'}`}
      >
        <PaletteIcon className="w-5 h-5" />
        Editor
      </button>
      <button
        onClick={() => onTabChange('marketing')}
        className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold tracking-wide uppercase ${activeTab === 'marketing' ? 'text-blue-700' : 'text-slate-400'}`}
      >
        <ShoppingBagIcon className="w-5 h-5" />
        Marketing
      </button>
      <button
        onClick={() => onTabChange('magic')}
        className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold tracking-wide uppercase ${activeTab === 'magic' ? 'text-blue-700' : 'text-slate-400'}`}
      >
        <SparklesIcon className="w-5 h-5" />
        Tools
      </button>
      <button
        onClick={() => onTabChange('gallery')}
        className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold tracking-wide uppercase ${activeTab === 'gallery' ? 'text-blue-700' : 'text-slate-400'}`}
      >
        <PhotoIcon className="w-5 h-5" />
        Gallery
      </button>
    </nav>
  );
};

export default MobileBottomNav;
