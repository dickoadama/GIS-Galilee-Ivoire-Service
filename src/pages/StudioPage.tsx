import React, { useState } from 'react';
import { Download, Eye, Pencil, Printer } from 'lucide-react';
import {
  POSTER_MODELS,
  PosterContent,
  PosterFormat,
  PosterModelId,
} from '../types/poster';
import { PosterCanvas } from '../components/PosterCanvas';
import { ComparisonModal } from '../components/ComparisonModal';
import { EditorDrawer } from '../components/EditorDrawer';
import { exportPosterAsPng } from '../utils/exportPosterPng';

interface StudioPageProps {
  content: PosterContent;
  defaultModel: PosterModelId;
  defaultFormat: PosterFormat;
  onChangeContent: (next: PosterContent) => void;
}

export const StudioPage: React.FC<StudioPageProps> = ({
  content,
  defaultModel,
  defaultFormat,
  onChangeContent,
}) => {
  const [activeModel, setActiveModel] = useState<PosterModelId>(defaultModel);
  const [activeFormat, setActiveFormat] =
    useState<PosterFormat>(defaultFormat);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPng = async () => {
    setIsExporting(true);
    try {
      await exportPosterAsPng(content, activeModel, activeFormat);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 space-y-6">
      <div className="no-print flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {content.brandAcronym} · {content.tagline}
          </p>
          <h1 className="font-display font-extrabold text-3xl text-slate-900 dark:text-white tracking-tight mt-1">
            Studio d’affiche commerciale
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5">
            Changez de modèle graphique et de format à volonté tout en conservant les informations officielles de l’entreprise.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsCompareOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5" />
            Comparer l’original
          </button>
          <button
            type="button"
            onClick={() => setIsEditorOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Pencil className="w-3.5 h-3.5" />
            Modifier les textes
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimer A4
          </button>
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F2342] hover:bg-[#1A355E] dark:bg-[#D9531E] dark:hover:bg-[#B84315] rounded-lg transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? 'Export...' : 'Télécharger PNG'}
          </button>
        </div>
      </div>

      {/* Model & Format Controls */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div
          className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/75 dark:bg-slate-800 rounded-lg"
          role="tablist"
        >
          {POSTER_MODELS.map((model) => (
            <button
              key={model.id}
              type="button"
              role="tab"
              aria-selected={activeModel === model.id}
              onClick={() => setActiveModel(model.id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeModel === model.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {model.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/75 dark:bg-slate-800 rounded-lg self-start md:self-auto">
          {(
            [
              { id: 'landscape', label: 'Paysage 16:10' },
              { id: 'square', label: 'Carré 1:1' },
              { id: 'portrait', label: 'Portrait 3:4' },
            ] as { id: PosterFormat; label: string }[]
          ).map((fmt) => (
            <button
              key={fmt.id}
              type="button"
              onClick={() => setActiveFormat(fmt.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeFormat === fmt.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {fmt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Poster Canvas */}
      <PosterCanvas
        content={content}
        model={activeModel}
        format={activeFormat}
      />

      <ComparisonModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        content={content}
      />

      <EditorDrawer
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        content={content}
        onChange={onChangeContent}
      />
    </div>
  );
};
