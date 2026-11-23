import React from 'react';
import { RotateCcw, X } from 'lucide-react';
import { DEFAULT_POSTER_CONTENT, PosterContent } from '../types/poster';

interface EditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  content: PosterContent;
  onChange: (next: PosterContent) => void;
}

export const EditorDrawer: React.FC<EditorDrawerProps> = ({
  isOpen,
  onClose,
  content,
  onChange,
}) => {
  if (!isOpen) return null;

  const updateListItem = (
    section: 'hardware' | 'beverages',
    index: number,
    value: string
  ) => {
    const nextItems = [...content[section].items];
    nextItems[index] = value;
    onChange({
      ...content,
      [section]: { ...content[section], items: nextItems },
    });
  };

  const updateCommitment = (index: number, value: string) => {
    const nextCommitments = [...content.commitments] as [
      string,
      string,
      string,
      string,
    ];
    nextCommitments[index] = value;
    onChange({ ...content, commitments: nextCommitments });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="editor-title"
    >
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-lg h-full overflow-y-auto border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2
              id="editor-title"
              className="font-display font-bold text-lg text-slate-900 dark:text-white"
            >
              Personnaliser les informations
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Les modifications s’appliquent instantanément aux 3 modèles et à l’export PNG.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange(DEFAULT_POSTER_CONTENT)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
              aria-label="Fermer l'éditeur"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Identity */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Identité & Contacts
            </legend>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Sigle
                </label>
                <input
                  type="text"
                  value={content.brandAcronym}
                  onChange={(e) =>
                    onChange({ ...content, brandAcronym: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nom de l’entreprise
                </label>
                <input
                  type="text"
                  value={content.companyName}
                  onChange={(e) =>
                    onChange({ ...content, companyName: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Slogan principal
              </label>
              <input
                type="text"
                value={content.tagline}
                onChange={(e) =>
                  onChange({ ...content, tagline: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Téléphone 1
                </label>
                <input
                  type="text"
                  value={content.phones[0]}
                  onChange={(e) =>
                    onChange({
                      ...content,
                      phones: [e.target.value, content.phones[1]],
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Téléphone 2
                </label>
                <input
                  type="text"
                  value={content.phones[1]}
                  onChange={(e) =>
                    onChange({
                      ...content,
                      phones: [content.phones[0], e.target.value],
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Adresse / Repères
              </label>
              <textarea
                rows={2}
                value={content.location}
                onChange={(e) =>
                  onChange({ ...content, location: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>
          </fieldset>

          {/* Hardware */}
          <fieldset className="space-y-3 pt-4 border-t border-slate-200">
            <legend className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pôle 1 — Quincaillerie
            </legend>
            <input
              type="text"
              value={content.hardware.title}
              onChange={(e) =>
                onChange({
                  ...content,
                  hardware: { ...content.hardware, title: e.target.value },
                })
              }
              className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
            />
            <input
              type="text"
              value={content.hardware.subtitle}
              onChange={(e) =>
                onChange({
                  ...content,
                  hardware: { ...content.hardware, subtitle: e.target.value },
                })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
            />
            <div className="space-y-2">
              {content.hardware.items.map((item, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={item}
                  onChange={(e) =>
                    updateListItem('hardware', idx, e.target.value)
                  }
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                />
              ))}
            </div>
          </fieldset>

          {/* Beverages */}
          <fieldset className="space-y-3 pt-4 border-t border-slate-200">
            <legend className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pôle 2 — Vente de Boissons
            </legend>
            <input
              type="text"
              value={content.beverages.title}
              onChange={(e) =>
                onChange({
                  ...content,
                  beverages: { ...content.beverages, title: e.target.value },
                })
              }
              className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
            />
            <input
              type="text"
              value={content.beverages.subtitle}
              onChange={(e) =>
                onChange({
                  ...content,
                  beverages: { ...content.beverages, subtitle: e.target.value },
                })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
            />
            <div className="space-y-2">
              {content.beverages.items.map((item, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={item}
                  onChange={(e) =>
                    updateListItem('beverages', idx, e.target.value)
                  }
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                />
              ))}
            </div>
          </fieldset>

          {/* Commitments & Closing Slogan */}
          <fieldset className="space-y-3 pt-4 border-t border-slate-200">
            <legend className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Engagements & Slogan final
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {content.commitments.map((c, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={c}
                  onChange={(e) => updateCommitment(idx, e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                />
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Slogan de clôture
              </label>
              <input
                type="text"
                value={content.closingSlogan}
                onChange={(e) =>
                  onChange({ ...content, closingSlogan: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  );
};
