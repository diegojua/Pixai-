import React from 'react';
import PixaiLogoFull from './Logo.tsx';
import { Bars3Icon } from './Icons.tsx';

type MobileTopBarProps = {
  canDownload: boolean;
  showManage?: boolean;
  onMenuOpen: () => void;
  onDownload: () => void;
};

const MobileTopBar = ({ canDownload, showManage = false, onMenuOpen, onDownload }: MobileTopBarProps) => {
  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-[#f8f9fa]/95 border-b border-[#d9dce6] z-40 flex items-center justify-between px-4 backdrop-blur">
      <button onClick={onMenuOpen} className="text-blue-700" aria-label="Abrir menu">
        <Bars3Icon className="w-6 h-6" />
      </button>
      <div className="flex items-center gap-2">
        <PixaiLogoFull size="small" />
      </div>
      <div className="flex items-center gap-2">
        {showManage && (
          <button
            onClick={onMenuOpen}
            className="px-5 py-2 text-blue-700 border border-blue-400 rounded-xl text-sm font-semibold"
          >
            Gerenciar
          </button>
        )}
        <button
          onClick={onDownload}
          className="px-5 py-2 bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm disabled:opacity-50"
          disabled={!canDownload}
        >
          Baixar
        </button>
      </div>
    </div>
  );
};

export default MobileTopBar;
