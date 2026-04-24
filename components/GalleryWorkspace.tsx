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
      <div className="mb-6 px-1">
        <h2 className="text-5xl md:text-3xl font-black text-slate-900 leading-none">Gallery</h2>
        <p className="text-slate-600 mt-2 text-lg md:text-sm">Your creative collection</p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={gallerySearch}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search your generations..."
          className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${galleryFilter === filter.id ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-200'}`}
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
              className="text-left rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm"
            >
              <div className="aspect-square bg-slate-100 relative overflow-hidden">
                <img src={img.url} className="w-full h-full object-cover" alt="Saved" />
                <span className="absolute top-2 right-2 px-2 py-1 text-[10px] font-bold rounded-lg bg-black/40 text-white">
                  #{String(img.id || '').slice(-4) || '----'}
                </span>
              </div>
              <div className="p-3">
                <p className="text-slate-800 text-sm font-medium truncate">{img.prompt || 'Sem descricao'}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-500">{formatDate(img.createdAt)}</span>
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
