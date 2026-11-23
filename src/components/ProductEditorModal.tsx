import React, { useState } from 'react';
import { Calculator, Save, X } from 'lucide-react';
import { Product, ProductPole, StoreSettings, UserRole } from '../types/app';
import { formatFcfa, getPoleLabel } from '../utils/formatters';
import {
  calculateMarginPct,
  calculateRecommendedSellingPrice,
  getDefaultPurchaseCostFcfa,
  getDefaultTargetMarginPct,
} from '../utils/margin';

interface ProductEditorModalProps {
  isOpen: boolean;
  initialProduct: Product | null;
  initialBarcode?: string;
  settings: StoreSettings;
  currentRole: UserRole;
  onClose: () => void;
  onSave: (product: Product, isNew: boolean) => void;
}

export const ProductEditorModal: React.FC<ProductEditorModalProps> = ({
  isOpen,
  initialProduct,
  initialBarcode,
  settings,
  currentRole,
  onClose,
  onSave,
}) => {
  const isNew = initialProduct === null;
  const canAllPoles =
    currentRole === 'super_admin' || currentRole === 'admin_patron';

  const allowedPoles: ProductPole[] = canAllPoles
    ? ['ciment', 'quincaillerie', 'boissons']
    : currentRole === 'gerant_ciment'
      ? ['ciment', 'quincaillerie']
      : currentRole === 'gerant_boisson'
        ? ['boissons']
        : [];

  const defaultPole: ProductPole =
    initialProduct?.pole ?? allowedPoles[0] ?? 'ciment';

  const [pole, setPole] = useState<ProductPole>(defaultPole);
  const [category, setCategory] = useState<string>(
    initialProduct?.category ??
      (defaultPole === 'boissons' ? 'Eaux minérales' : 'Ciments & Liants')
  );
  const [name, setName] = useState<string>(initialProduct?.name ?? '');
  const [unitLabel, setUnitLabel] = useState<string>(
    initialProduct?.unitLabel ??
      (defaultPole === 'boissons' ? 'Pack de 6 bouteilles' : 'Sac de 50 kg')
  );
  const [barcode, setBarcode] = useState<string>(
    initialProduct?.barcode ?? initialBarcode ?? ''
  );
  const [priceFcfa, setPriceFcfa] = useState<string>(
    String(initialProduct?.priceFcfa ?? 4500)
  );
  const [wholesalePriceFcfa, setWholesalePriceFcfa] = useState<string>(
    String(initialProduct?.wholesalePriceFcfa ?? 4200)
  );
  const [wholesaleMinQty, setWholesaleMinQty] = useState<string>(
    String(initialProduct?.wholesaleMinQty ?? 10)
  );
  const [purchaseCostFcfa, setPurchaseCostFcfa] = useState<string>(
    String(
      initialProduct
        ? getDefaultPurchaseCostFcfa(initialProduct)
        : 3700
    )
  );
  const [targetMarginPct, setTargetMarginPct] = useState<string>(
    String(
      initialProduct
        ? getDefaultTargetMarginPct(initialProduct)
        : 18
    )
  );
  const [stockQty, setStockQty] = useState<string>(
    String(initialProduct?.stockQty ?? 50)
  );
  const [criticalStockThreshold, setCriticalStockThreshold] = useState<string>(
    String(initialProduct?.criticalStockThreshold ?? 15)
  );
  const [inStock, setInStock] = useState<boolean>(
    initialProduct?.inStock ?? true
  );
  const [priorityScore, setPriorityScore] = useState<string>(
    String(initialProduct?.priorityScore ?? 80)
  );
  const [description, setDescription] = useState<string>(
    initialProduct?.description ?? ''
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const suggestedCategories =
    pole === 'ciment'
      ? ['Ciments & Liants', ...settings.poster.hardware.items]
      : pole === 'quincaillerie'
        ? settings.poster.hardware.items
        : settings.poster.beverages.items;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('Veuillez saisir le nom du produit.');
      return;
    }
    if (!category.trim()) {
      setError('Veuillez indiquer une catégorie.');
      return;
    }

    const parsedPrice = Math.max(0, Number(priceFcfa) || 0);
    const parsedWholesale = Math.max(0, Number(wholesalePriceFcfa) || 0);
    const parsedWholesaleMin = Math.max(1, Number(wholesaleMinQty) || 10);
    const parsedPurchaseCost = Math.max(0, Number(purchaseCostFcfa) || 0);
    const parsedTargetMargin = Math.min(
      500,
      Math.max(0, Number(targetMarginPct) || 0)
    );
    const parsedStock = Math.max(0, Number(stockQty) || 0);
    const parsedCriticalThreshold = Math.max(
      0,
      Number(criticalStockThreshold) || 0
    );
    const parsedPriority = Math.min(
      100,
      Math.max(0, Number(priorityScore) || 50)
    );
    const now = new Date().toISOString();

    const saved: Product = {
      id: initialProduct?.id ?? `prod-${Date.now()}`,
      pole,
      category: category.trim(),
      name: name.trim(),
      unitLabel: unitLabel.trim() || 'Unité',
      barcode: barcode.trim().slice(0, 64),
      priceFcfa: parsedPrice,
      wholesalePriceFcfa: parsedWholesale,
      wholesaleMinQty: parsedWholesaleMin,
      purchaseCostFcfa: parsedPurchaseCost,
      targetMarginPct: parsedTargetMargin,
      inStock,
      stockQty: parsedStock,
      criticalStockThreshold: parsedCriticalThreshold,
      priorityScore: parsedPriority,
      orderCount: initialProduct?.orderCount ?? 0,
      outflowQty: initialProduct?.outflowQty ?? 0,
      description:
        description.trim() ||
        'Article disponible au magasin Galilée Ivoire Service.',
      createdAt: initialProduct?.createdAt ?? now,
      updatedAt: now,
    };

    onSave(saved, isNew);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-editor-title"
    >
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isNew ? 'Nouvel article catalogue' : 'Modification fiche & tarifs'}
            </p>
            <h2
              id="product-editor-title"
              className="font-display font-bold text-lg"
            >
              {isNew
                ? 'Ajouter un produit au catalogue'
                : `Modifier : ${initialProduct.name}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          id="product-editor-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Pôle tarifaire *
              </label>
              <select
                value={pole}
                onChange={(e) => {
                  const nextPole = e.target.value as ProductPole;
                  setPole(nextPole);
                  if (isNew) {
                    setCategory(
                      nextPole === 'ciment'
                        ? 'Ciments & Liants'
                        : nextPole === 'quincaillerie'
                          ? settings.poster.hardware.items[0]
                          : settings.poster.beverages.items[0]
                    );
                  }
                }}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              >
                {allowedPoles.map((p) => (
                  <option key={p} value={p}>
                    {getPoleLabel(p)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Catégorie * (choix ou saisie libre)
              </label>
              <input
                type="text"
                list="gis-product-categories"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex. Ciments & Liants, Eaux minérales..."
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
              <datalist id="gis-product-categories">
                {suggestedCategories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Désignation du produit *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Ciment CPJ 42.5, Pack Coca-Cola..."
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Unité / Conditionnement *
              </label>
              <input
                type="text"
                required
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                placeholder="Sac 50 kg, Pack de 6..."
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Code-barres (EAN / Interne)
            </label>
            <input
              type="text"
              maxLength={64}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Ex. 6181000100014 ou 5449000054227"
              className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
            />
          </div>

          {/* Pricing & Margin Section */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Tarification & Marge ({settings.currencyLabel})
              </p>
              <button
                type="button"
                onClick={() => {
                  const cost = Math.max(0, Number(purchaseCostFcfa) || 0);
                  const pct = Math.max(0, Number(targetMarginPct) || 0);
                  const wPct = Math.max(0, pct - 5);
                  const nextRetail = calculateRecommendedSellingPrice(
                    cost,
                    pct,
                    'on_selling_price',
                    50
                  );
                  const nextWholesale = calculateRecommendedSellingPrice(
                    cost,
                    wPct,
                    'on_selling_price',
                    50
                  );
                  setPriceFcfa(String(nextRetail));
                  setWholesalePriceFcfa(String(Math.min(nextRetail, nextWholesale)));
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-[#0F2342] dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md hover:border-[#D9531E] cursor-pointer whitespace-nowrap"
              >
                <Calculator className="w-3 h-3 text-[#D9531E]" />
                Calculer PV selon objectif
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Coût d’achat fournisseur ({settings.currencyLabel})
                </label>
                <input
                  type="number"
                  min={0}
                  value={purchaseCostFcfa}
                  onChange={(e) => setPurchaseCostFcfa(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono-tabular font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Objectif de marge (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={targetMarginPct}
                  onChange={(e) => setTargetMarginPct(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono-tabular font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Prix détail ({settings.currencyLabel}) *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={priceFcfa}
                  onChange={(e) => setPriceFcfa(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono-tabular font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Prix gros ({settings.currencyLabel}) *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={wholesalePriceFcfa}
                  onChange={(e) => setWholesalePriceFcfa(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono-tabular font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Qté min. tarif gros
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={wholesaleMinQty}
                  onChange={(e) => setWholesaleMinQty(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            {(() => {
              const costNum = Math.max(0, Number(purchaseCostFcfa) || 0);
              const retailNum = Math.max(0, Number(priceFcfa) || 0);
              const wholesaleNum = Math.max(0, Number(wholesalePriceFcfa) || 0);
              const retailProfit = retailNum - costNum;
              const wholesaleProfit = wholesaleNum - costNum;
              const retailPct = calculateMarginPct(
                retailNum,
                costNum,
                'on_selling_price'
              );
              const wholesalePct = calculateMarginPct(
                wholesaleNum,
                costNum,
                'on_selling_price'
              );
              return (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular">
                  <span
                    className={
                      retailProfit <= 0
                        ? 'text-red-600 dark:text-red-400 font-semibold'
                        : 'text-emerald-700 dark:text-emerald-400 font-semibold'
                    }
                  >
                    Marge détail : {retailProfit >= 0 ? '+' : ''}
                    {formatFcfa(retailProfit, settings.currencyLabel)} (
                    {retailPct.toFixed(1)}%)
                  </span>
                  <span
                    className={
                      wholesaleProfit <= 0
                        ? 'text-red-600 dark:text-red-400 font-semibold'
                        : 'text-[#0369A1] dark:text-[#38BDF8] font-semibold'
                    }
                  >
                    Marge gros : {wholesaleProfit >= 0 ? '+' : ''}
                    {formatFcfa(wholesaleProfit, settings.currencyLabel)} (
                    {wholesalePct.toFixed(1)}%)
                  </span>
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Quantité en stock
              </label>
              <input
                type="number"
                min={0}
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Seuil critique d’alerte
              </label>
              <input
                type="number"
                min={0}
                value={criticalStockThreshold}
                onChange={(e) => setCriticalStockThreshold(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Priorité d’achat (0 – 100)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={priorityScore}
                onChange={(e) => setPriorityScore(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <button
                type="button"
                onClick={() => setInStock((v) => !v)}
                className={`w-full py-2 px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                  inStock
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'
                }`}
              >
                {inStock ? 'Statut : En stock' : 'Statut : Sur commande'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description & précisions
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Caractéristiques, format, disponibilité..."
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </form>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="product-editor-form"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#D9531E] hover:bg-[#B84315] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isNew ? 'Ajouter le produit' : 'Enregistrer les tarifs'}
          </button>
        </div>
      </div>
    </div>
  );
};
