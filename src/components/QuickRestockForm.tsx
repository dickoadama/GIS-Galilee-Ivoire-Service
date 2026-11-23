import React, { useState } from 'react';
import { Check, PackagePlus, X } from 'lucide-react';
import { Product } from '../types/app';

interface QuickRestockFormProps {
  product: Product;
  onAddStock: (unitsToAdd: number) => void;
  onCancel: () => void;
}

const PRESET_UNITS = [5, 10, 25, 50];

export const QuickRestockForm: React.FC<QuickRestockFormProps> = ({
  product,
  onAddStock,
  onCancel,
}) => {
  const [unitsInput, setUnitsInput] = useState<string>('10');
  const [error, setError] = useState<string | null>(null);

  const parsedUnits = Math.max(0, Math.round(Number(unitsInput) || 0));
  const projectedStock = product.stockQty + parsedUnits;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedUnits < 1) {
      setError('Indiquez au moins 1 unité à ajouter.');
      return;
    }
    setError(null);
    onAddStock(parsedUnits);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/75 p-3 space-y-2.5"
      aria-label={`Ajouter au stock de ${product.name}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-800 dark:text-slate-100">
          <PackagePlus className="w-3.5 h-3.5 text-[#D9531E] shrink-0" />
          Entrée rapide en stock
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded cursor-pointer"
          aria-label="Fermer le formulaire d’ajout au stock"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Preset quantity buttons */}
      <div className="grid grid-cols-4 gap-1.5">
        {PRESET_UNITS.map((qty) => (
          <button
            key={qty}
            type="button"
            onClick={() => {
              setUnitsInput(String(qty));
              setError(null);
            }}
            className={`py-1 text-[11px] font-mono-tabular font-semibold rounded border transition-colors cursor-pointer ${
              parsedUnits === qty
                ? 'bg-[#0F2342] text-white border-[#0F2342] dark:bg-[#D9531E] dark:border-[#D9531E]'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            +{qty}
          </button>
        ))}
      </div>

      {/* Custom input + submit */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          step={1}
          autoFocus
          value={unitsInput}
          onChange={(e) => {
            setUnitsInput(e.target.value);
            if (error) setError(null);
          }}
          aria-label="Nombre d’unités à ajouter"
          className="w-24 px-2.5 py-1.5 text-xs font-mono-tabular font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:border-[#D9531E]"
        />
        <button
          type="submit"
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#D9531E] hover:bg-[#B84315] rounded-md transition-colors cursor-pointer whitespace-nowrap"
        >
          <Check className="w-3.5 h-3.5" />
          Ajouter {parsedUnits > 0 ? `+${parsedUnits}` : ''}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
        <span>Actuel : {product.stockQty}</span>
        <span>
          Nouveau :{' '}
          <strong className="text-emerald-700 dark:text-emerald-400">
            {projectedStock}
          </strong>{' '}
          ({product.unitLabel})
        </span>
      </div>

      {error && (
        <p className="text-[11px] font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
};
