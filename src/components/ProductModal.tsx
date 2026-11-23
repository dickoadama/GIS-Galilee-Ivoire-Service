import React, { useState } from 'react';
import { History, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { Product } from '../types/app';
import { formatFcfa, getPoleLabel, getUnitPriceForQty } from '../utils/formatters';

interface ProductModalProps {
  product: Product | null;
  currencyLabel: string;
  onClose: () => void;
  onAddToCart: (productId: string, quantity: number) => void;
  onViewPriceHistory?: (product: Product) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  currencyLabel,
  onClose,
  onAddToCart,
  onViewPriceHistory,
}) => {
  const [qty, setQty] = useState(1);

  if (!product) return null;

  const { price, isWholesale } = getUnitPriceForQty(product, qty);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-title"
    >
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {getPoleLabel(product.pole)} · {product.category}
            {product.barcode ? ` · EAN ${product.barcode}` : ''}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fermer la fiche produit"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h2
              id="pdp-title"
              className="font-display font-bold text-xl sm:text-2xl leading-snug"
            >
              {product.name}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              {product.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Prix unitaire ({product.unitLabel})
              </p>
              <p className="font-mono-tabular font-bold text-lg mt-0.5">
                {formatFcfa(product.priceFcfa, currencyLabel)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tarif gros (dès {product.wholesaleMinQty} unités)
              </p>
              <p className="font-mono-tabular font-bold text-lg text-emerald-700 dark:text-emerald-400 mt-0.5">
                {formatFcfa(product.wholesalePriceFcfa, currencyLabel)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span>
              Disponibilité :{' '}
              <strong className="text-slate-900 dark:text-white">
                {product.inStock
                  ? `En stock (${product.stockQty} ${product.unitLabel.toLowerCase()})`
                  : 'Sur commande'}
              </strong>
            </span>
            {isWholesale && (
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                Remise gros activée
              </span>
            )}
          </div>

          {onViewPriceHistory && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewPriceHistory(product);
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-[#0F2342] dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-[#D9531E]" />
              Consulter l’historique des prix (Audit Logs)
            </button>
          )}

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Réduire"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 font-mono-tabular font-bold text-sm">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Augmenter"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                onAddToCart(product.id, qty);
                setQty(1);
                onClose();
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-[#0F2342] hover:bg-[#1A355E] text-white rounded-lg transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              Ajouter · {formatFcfa(price * qty, currencyLabel)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
