import React from 'react';
import { PlusIcon } from './Icons.tsx';

type GalleryFilterId = 'all' | 'favorites' | 'edited' | 'draft';

type GalleryFilter = {
  id: GalleryFilterId;
  label: string;
};

type GalleryItem = {
  id?: string;
  url: string;
  prompt?: string;
  createdAt?: any;
};

type GalleryWorkspaceProps = {
  filters: readonly GalleryFilter[];
  galleryFilter: GalleryFilterId;
  gallerySearch: string;
  filteredGallery: GalleryItem[];
  onFilterChange: (value: GalleryFilterId) => void;
  onSearchChange: (value: string) => void;
  onOpenImage: (item: GalleryItem) => void;
  onCreateNew: () => void;
  formatDate: (value: any) => string;
};

const GalleryWorkspace = ({
  filters,
  galleryFilter,
  gallerySearch,
  filteredGallery,
  onFilterChange,
  onSearchChange,
  onOpenImage,
  onCreateNew,
  formatDate,
}: GalleryWorkspaceProps) => {
  return (
    <div className="w-full h-full max-w-6xl mx-auto overflow-y-auto pb-28 pt-16 md:pt-6">
      <div className="mb-5 px-1">
        <h2 className="text-5xl md:text-5xl font-black text-slate-900 leading-none tracking-tight">Galeria</h2>
        <p className="text-slate-600 mt-2 text-lg md:text-base">Sua coleção criativa</p>
      </div>

      <div className="mb-4 relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-6 h-6 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2"
        >
          <circle cx="11" cy="11" r="7"></circle>
          <line x1="16.65" y1="16.65" x2="21" y2="21"></line>
        </svg>
        <input
          type="text"
          value={gallerySearch}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Busque suas gerações..."
          className="w-full bg-white border border-[#d6d8e3] rounded-2xl pl-14 pr-5 py-3 text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-5">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={`whitespace-nowrap px-5 py-2 rounded-full border text-sm font-semibold transition-colors ${galleryFilter === filter.id ? 'bg-blue-700 text-white border-blue-700 shadow-sm' : 'bg-[#f3f4f7] text-slate-700 border-[#d6d8e3]'}`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {filteredGallery.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
          Nenhuma imagem encontrada.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {filteredGallery.map((img, i) => (
            <button
              key={img.id || i}
              onClick={() => onOpenImage(img)}
              className="text-left rounded-[18px] overflow-hidden border border-[#d6d8e3] bg-white shadow-sm"
            >
              <div className="aspect-square bg-slate-100 relative overflow-hidden">
                <img src={img.url} className="w-full h-full object-cover" alt="Imagem salva" />
                <span className="absolute top-2 right-2 px-2 py-1 text-[11px] font-bold rounded-lg bg-black/40 backdrop-blur text-white">
                  #{String(img.id || '').slice(-4) || '----'}
                </span>
              </div>
              <div className="p-3.5">
                <p className="text-slate-800 text-[17px] md:text-sm font-medium truncate">{img.prompt || 'Sem descrição'}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm md:text-xs text-slate-500">{formatDate(img.createdAt)}</span>
                  <span className="text-slate-400 text-lg leading-none">...</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={onCreateNew}
        className="md:hidden fixed bottom-24 right-5 w-14 h-14 rounded-full bg-blue-700 text-white shadow-xl flex items-center justify-center"
        aria-label="Novo projeto"
      >
        <PlusIcon className="w-7 h-7" />
      </button>
    </div>
  );
};

export default GalleryWorkspace;
