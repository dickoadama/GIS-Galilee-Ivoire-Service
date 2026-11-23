import React from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { PosterContent } from '../types/poster';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: PosterContent;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  isOpen,
  onClose,
  content,
}) => {
  if (!isOpen) return null;

  const checklist = [
    `${content.brandAcronym} — ${content.companyName} (${content.tagline})`,
    `${content.hardware.title} : ${content.hardware.items.join(', ')}`,
    `${content.beverages.title} : ${content.beverages.items.join(', ')}`,
    `Téléphones : ${content.phones[0]} / ${content.phones[1]}`,
    `Localisation : ${content.location}`,
    `Engagements : ${content.commitments.join(' · ')}`,
    `Slogan : ${content.closingSlogan}`,
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-title"
    >
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-800 max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2
              id="comparison-title"
              className="font-display font-bold text-xl text-slate-900 dark:text-white"
            >
              Comparatif avec l’affiche d’origine
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              Vérification de la conservation intégrale de vos informations commerciales.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-slate-900 cursor-pointer"
            aria-label="Fermer la comparaison"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Affiche d’origine fournie
            </p>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img
                src="/assets/aistudio/GIS__Quincaillerie_et_Boissons____56bc6a28.png"
                alt="Affiche d'origine Galilée Ivoire Service Quincaillerie et Boissons"
                referrerPolicy="no-referrer"
                className="w-full h-auto block"
              />
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Informations conservées dans les nouveaux modèles
            </p>
            <ul className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
              {checklist.map((entry, idx) => (
                <li
                  key={idx}
                  className="pt-3 first:pt-0 flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" />
                  <span>{entry}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
