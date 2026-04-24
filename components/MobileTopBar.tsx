import React from 'react';
import PixaiLogoFull from './Logo.tsx';
import { Bars3Icon } from './Icons.tsx';

type MobileTopBarProps = {
  canDownload: boolean;
  onMenuOpen: () => void;
  onDownload: () => void;
};

const MobileTopBar = ({ canDownload, onMenuOpen, onDownload }: MobileTopBarProps) => {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4 shadow-sm">
      <button onClick={onMenuOpen} className="text-blue-700" aria-label="Abrir menu">
        <Bars3Icon className="w-6 h-6" />
      </button>
      <div className="flex items-center gap-2">
        <PixaiLogoFull size="small" />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuOpen}
          className="px-3 py-1.5 text-blue-700 border border-blue-300 rounded-xl text-sm font-semibold"
        >
          Manage
        </button>
        <button
          onClick={onDownload}
          className="px-3 py-1.5 bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          disabled={!canDownload}
        >
          Download
        </button>
      </div>
    </div>
  );
};

export default MobileTopBar;
