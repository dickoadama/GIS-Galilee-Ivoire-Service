import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  Check,
  CheckCircle2,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import { Product, ProductPole, StoreSettings } from '../types/app';
import { formatFcfa, getPoleLabel } from '../utils/formatters';
import {
  calculateRecommendedSellingPrice,
  computeProductMarginMetrics,
  getDefaultPurchaseCostFcfa,
  getDefaultTargetMarginPct,
  MarginFormulaMode,
} from '../utils/margin';

interface MarginDraft {
  purchaseCostFcfa: number;
  targetMarginPct: number;
  priceFcfa: number;
  wholesalePriceFcfa: number;
}

interface SuperAdminMarginPanelProps {
  products: Product[];
  settings: StoreSettings;
  onUpdateProduct: (product: Product) => void;
  onOpenNewProduct: () => void;
}

export const SuperAdminMarginPanel: React.FC<SuperAdminMarginPanelProps> = ({
  products,
  settings,
  onUpdateProduct,
  onOpenNewProduct,
}) => {
  const [formulaMode, setFormulaMode] =
    useState<MarginFormulaMode>('on_selling_price');
  const [roundingStep, setRoundingStep] = useState<number>(50);
  const [globalRetailTargetPct, setGlobalRetailTargetPct] =
    useState<string>('20');
  const [globalWholesaleTargetPct, setGlobalWholesaleTargetPct] =
    useState<string>('12');
  const [poleFilter, setPoleFilter] = useState<ProductPole | 'all'>('all');
  const [onlyBelowTarget, setOnlyBelowTarget] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [drafts, setDrafts] = useState<Record<string, MarginDraft>>({});
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const getEffectiveDraft = (p: Product): MarginDraft => {
    const existing = drafts[p.id];
    if (existing) return existing;
    return {
      purchaseCostFcfa: getDefaultPurchaseCostFcfa(p),
      targetMarginPct: getDefaultTargetMarginPct(p),
      priceFcfa: p.priceFcfa,
      wholesalePriceFcfa: p.wholesalePriceFcfa,
    };
  };

  const isRowDirty = (p: Product): boolean => {
    const d = drafts[p.id];
    if (!d) return false;
    return (
      d.purchaseCostFcfa !== getDefaultPurchaseCostFcfa(p) ||
      d.targetMarginPct !== getDefaultTargetMarginPct(p) ||
      d.priceFcfa !== p.priceFcfa ||
      d.wholesalePriceFcfa !== p.wholesalePriceFcfa
    );
  };

  const updateRowDraft = (p: Product, patch: Partial<MarginDraft>) => {
    setDrafts((prev) => {
      const current = prev[p.id] ?? getEffectiveDraft(p);
      return {
        ...prev,
        [p.id]: { ...current, ...patch },
      };
    });
  };

  const resetRowDraft = (productId: string) => {
    setDrafts((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  const productMetricsList = useMemo(() => {
    return products.map((product) => {
      const draft = drafts[product.id] ?? {
        purchaseCostFcfa: getDefaultPurchaseCostFcfa(product),
        targetMarginPct: getDefaultTargetMarginPct(product),
        priceFcfa: product.priceFcfa,
        wholesalePriceFcfa: product.wholesalePriceFcfa,
      };
      const metrics = computeProductMarginMetrics(
        product,
        draft.purchaseCostFcfa,
        draft.priceFcfa,
        draft.wholesalePriceFcfa,
        draft.targetMarginPct,
        formulaMode
      );
      return {
        product,
        draft,
        metrics,
        dirty: Boolean(
          drafts[product.id] &&
            (draft.purchaseCostFcfa !== getDefaultPurchaseCostFcfa(product) ||
              draft.targetMarginPct !== getDefaultTargetMarginPct(product) ||
              draft.priceFcfa !== product.priceFcfa ||
              draft.wholesalePriceFcfa !== product.wholesalePriceFcfa)
        ),
      };
    });
  }, [products, drafts, formulaMode]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return productMetricsList.filter(({ product, metrics }) => {
      if (poleFilter !== 'all' && product.pole !== poleFilter) return false;
      if (onlyBelowTarget && metrics.status === 'on_target') return false;
      if (q) {
        const hay =
          `${product.name} ${product.category} ${getPoleLabel(product.pole)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [productMetricsList, poleFilter, onlyBelowTarget, searchQuery]);

  const kpis = useMemo(() => {
    if (productMetricsList.length === 0) {
      return {
        avgRetailMarginPct: 0,
        avgWholesaleMarginPct: 0,
        totalStockCostFcfa: 0,
        totalStockProfitFcfa: 0,
        belowTargetCount: 0,
        deficitCount: 0,
      };
    }
    const avgRetailMarginPct =
      productMetricsList.reduce((s, r) => s + r.metrics.retailMarginPct, 0) /
      productMetricsList.length;
    const avgWholesaleMarginPct =
      productMetricsList.reduce((s, r) => s + r.metrics.wholesaleMarginPct, 0) /
      productMetricsList.length;
    const totalStockCostFcfa = productMetricsList.reduce(
      (s, r) => s + r.metrics.stockCostValueFcfa,
      0
    );
    const totalStockProfitFcfa = productMetricsList.reduce(
      (s, r) => s + r.metrics.stockProfitPotentialFcfa,
      0
    );
    const belowTargetCount = productMetricsList.filter(
      (r) => r.metrics.status === 'below_target'
    ).length;
    const deficitCount = productMetricsList.filter(
      (r) => r.metrics.status === 'deficit'
    ).length;
    return {
      avgRetailMarginPct,
      avgWholesaleMarginPct,
      totalStockCostFcfa,
      totalStockProfitFcfa,
      belowTargetCount,
      deficitCount,
    };
  }, [productMetricsList]);

  const dirtyRows = productMetricsList.filter((r) => r.dirty);

  const flashSavedNotice = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 2400);
  };

  const handleCalculateRowRecommended = (p: Product) => {
    const d = getEffectiveDraft(p);
    const wholesaleRatio = Math.max(
      0,
      Math.min(d.targetMarginPct - 4, Number(globalWholesaleTargetPct) || 12)
    );
    const nextRetail = calculateRecommendedSellingPrice(
      d.purchaseCostFcfa,
      d.targetMarginPct,
      formulaMode,
      roundingStep
    );
    const nextWholesale = calculateRecommendedSellingPrice(
      d.purchaseCostFcfa,
      wholesaleRatio,
      formulaMode,
      roundingStep
    );
    updateRowDraft(p, {
      priceFcfa: nextRetail,
      wholesalePriceFcfa: Math.min(nextRetail, nextWholesale),
    });
  };

  const handleSimulateGlobalTargetOnFiltered = () => {
    const rTarget = Math.max(0, Number(globalRetailTargetPct) || 0);
    const wTarget = Math.max(
      0,
      Math.min(rTarget, Number(globalWholesaleTargetPct) || 0)
    );
    setDrafts((prev) => {
      const next = { ...prev };
      for (const { product } of filteredRows) {
        const current = prev[product.id] ?? getEffectiveDraft(product);
        const recRetail = calculateRecommendedSellingPrice(
          current.purchaseCostFcfa,
          rTarget,
          formulaMode,
          roundingStep
        );
        const recWholesale = calculateRecommendedSellingPrice(
          current.purchaseCostFcfa,
          wTarget,
          formulaMode,
          roundingStep
        );
        next[product.id] = {
          purchaseCostFcfa: current.purchaseCostFcfa,
          targetMarginPct: rTarget,
          priceFcfa: recRetail,
          wholesalePriceFcfa: Math.min(recRetail, recWholesale),
        };
      }
      return next;
    });
    flashSavedNotice(
      `Simulation appliquée sur ${filteredRows.length} article(s) — vérifiez et enregistrez`
    );
  };

  const handleSaveSingleRow = (p: Product) => {
    const d = getEffectiveDraft(p);
    onUpdateProduct({
      ...p,
      purchaseCostFcfa: Math.max(0, Math.round(d.purchaseCostFcfa)),
      targetMarginPct: Math.min(500, Math.max(0, Number(d.targetMarginPct))),
      priceFcfa: Math.max(0, Math.round(d.priceFcfa)),
      wholesalePriceFcfa: Math.max(0, Math.round(d.wholesalePriceFcfa)),
      updatedAt: new Date().toISOString(),
    });
    resetRowDraft(p.id);
    flashSavedNotice(`Tarifs et marge enregistrés pour ${p.name}`);
  };

  const handleSaveAllDirty = () => {
    if (dirtyRows.length === 0) return;
    const now = new Date().toISOString();
    for (const { product, draft } of dirtyRows) {
      onUpdateProduct({
        ...product,
        purchaseCostFcfa: Math.max(0, Math.round(draft.purchaseCostFcfa)),
        targetMarginPct: Math.min(
          500,
          Math.max(0, Number(draft.targetMarginPct))
        ),
        priceFcfa: Math.max(0, Math.round(draft.priceFcfa)),
        wholesalePriceFcfa: Math.max(0, Math.round(draft.wholesalePriceFcfa)),
        updatedAt: now,
      });
    }
    setDrafts({});
    flashSavedNotice(`${dirtyRows.length} produit(s) mis à jour`);
  };

  return (
    <section
      aria-label="Calculateur automatique de marge bénéficiaire"
      className="space-y-6"
    >
      {/* Header + Primary Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#D9531E] shrink-0" />
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              Calculateur de marge bénéficiaire & Prix de vente
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Saisissez le coût d’achat fournisseur et votre objectif de rentabilité (%) pour calculer et ajuster automatiquement les prix détail et gros.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {savedNotice && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <Check className="w-4 h-4" />
              {savedNotice}
            </span>
          )}
          <button
            type="button"
            onClick={onOpenNewProduct}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F2342] hover:bg-[#1A355E] dark:bg-slate-800 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Ajouter un nouvel élément
          </button>
          {dirtyRows.length > 0 && (
            <button
              type="button"
              onClick={handleSaveAllDirty}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#D9531E] hover:bg-[#B84315] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Enregistrer tout ({dirtyRows.length})
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Marge moyenne Détail
          </p>
          <p className="font-mono-tabular font-extrabold text-2xl text-emerald-700 dark:text-emerald-400">
            {kpis.avgRetailMarginPct.toFixed(1)}%
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {formulaMode === 'on_selling_price'
              ? 'Calculée sur le prix de vente'
              : 'Calculée sur le coût d’achat'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Marge moyenne Gros
          </p>
          <p className="font-mono-tabular font-extrabold text-2xl text-[#0369A1] dark:text-[#38BDF8]">
            {kpis.avgWholesaleMarginPct.toFixed(1)}%
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Tarifs chantiers & dépôts
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Bénéfice potentiel sur stock
          </p>
          <p className="font-mono-tabular font-extrabold text-xl text-slate-900 dark:text-white">
            {formatFcfa(kpis.totalStockProfitFcfa, settings.currencyLabel)}
          </p>
          <p className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
            Coût d’achat stock :{' '}
            {formatFcfa(kpis.totalStockCostFcfa, settings.currencyLabel)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOnlyBelowTarget((v) => !v)}
          className={`text-left rounded-xl p-5 border space-y-1 transition-colors cursor-pointer ${
            onlyBelowTarget
              ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-400 dark:border-amber-700'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Articles à réajuster
          </p>
          <p className="font-mono-tabular font-extrabold text-2xl text-[#D9531E]">
            {kpis.belowTargetCount + kpis.deficitCount}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {kpis.deficitCount > 0
              ? `${kpis.deficitCount} déficitaire(s) · `
              : ''}
            {kpis.belowTargetCount} sous objectif · Cliquer pour filtrer
          </p>
        </button>
      </div>

      {/* Profitability Simulator & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Méthode de calcul
            </label>
            <select
              value={formulaMode}
              onChange={(e) =>
                setFormulaMode(e.target.value as MarginFormulaMode)
              }
              className="w-full px-3 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
            >
              <option value="on_selling_price">
                Taux de marque (Marge / PV)
              </option>
              <option value="on_cost">
                Taux de marge (Sur coût d’achat)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Objectif Détail (%)
            </label>
            <input
              type="number"
              min={0}
              max={200}
              step={1}
              value={globalRetailTargetPct}
              onChange={(e) => setGlobalRetailTargetPct(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono-tabular font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Objectif Gros (%)
            </label>
            <input
              type="number"
              min={0}
              max={200}
              step={1}
              value={globalWholesaleTargetPct}
              onChange={(e) => setGlobalWholesaleTargetPct(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono-tabular font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Arrondi prix ({settings.currencyLabel})
            </label>
            <select
              value={roundingStep}
              onChange={(e) => setRoundingStep(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
            >
              <option value={50}>50 {settings.currencyLabel} sup.</option>
              <option value={100}>100 {settings.currencyLabel} sup.</option>
              <option value={25}>25 {settings.currencyLabel} sup.</option>
              <option value={1}>Exact (1 {settings.currencyLabel})</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleSimulateGlobalTargetOnFiltered}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F2342] hover:bg-[#1A355E] dark:bg-[#D9531E] dark:hover:bg-[#B84315] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Calculer sur sélection ({filteredRows.length})
          </button>
        </div>

        {/* Search & Pole Filter Row */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
            {(
              [
                { id: 'all', label: 'Tous les pôles' },
                { id: 'ciment', label: 'Ciment' },
                { id: 'quincaillerie', label: 'Quincaillerie' },
                { id: 'boissons', label: 'Boissons' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPoleFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  poleFilter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setOnlyBelowTarget((v) => !v)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                onlyBelowTarget
                  ? 'bg-[#D9531E] text-white border-[#D9531E]'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              Sous objectif uniquement
            </button>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrer un produit..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Product Margin & Price Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="py-3 px-4 font-semibold">Article & Pôle</th>
                <th className="py-3 px-3 font-semibold text-right">
                  Coût achat ({settings.currencyLabel})
                </th>
                <th className="py-3 px-3 font-semibold text-center">
                  Objectif (%)
                </th>
                <th className="py-3 px-3 font-semibold text-right">
                  Prix Détail & Marge
                </th>
                <th className="py-3 px-3 font-semibold text-right">
                  Prix Gros & Marge
                </th>
                <th className="py-3 px-3 font-semibold text-right">
                  Marge Stock
                </th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 px-4 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    Aucun produit ne correspond à ces filtres.
                  </td>
                </tr>
              ) : (
                filteredRows.map(({ product, draft, metrics, dirty }) => {
                  const isDeficit = metrics.status === 'deficit';
                  const isBelow = metrics.status === 'below_target';
                  return (
                    <tr
                      key={product.id}
                      className={
                        dirty
                          ? 'bg-amber-50/40 dark:bg-amber-950/15'
                          : isDeficit
                            ? 'bg-red-50/35 dark:bg-red-950/15'
                            : undefined
                      }
                    >
                      <td className="py-3 px-4 max-w-[240px]">
                        <p className="font-semibold text-slate-900 dark:text-white leading-snug">
                          {product.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {getPoleLabel(product.pole)} · {product.unitLabel} ·{' '}
                          <span className="font-mono-tabular">
                            Stock {product.stockQty}
                          </span>
                        </p>
                        <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold">
                          {isDeficit ? (
                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                              <TrendingDown className="w-3 h-3" />
                              Déficitaire
                            </span>
                          ) : isBelow ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                              <AlertTriangle className="w-3 h-3" />
                              Sous objectif ({metrics.targetPct}%)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              Rentable
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Purchase Cost Input */}
                      <td className="py-3 px-3 text-right align-top">
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={draft.purchaseCostFcfa}
                          onChange={(e) =>
                            updateRowDraft(product, {
                              purchaseCostFcfa: Math.max(
                                0,
                                Number(e.target.value) || 0
                              ),
                            })
                          }
                          aria-label={`Coût d'achat fournisseur de ${product.name}`}
                          className="w-24 px-2 py-1.5 text-right font-mono-tabular font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
                        />
                      </td>

                      {/* Target Margin % Input */}
                      <td className="py-3 px-3 text-center align-top">
                        <input
                          type="number"
                          min={0}
                          max={300}
                          step={1}
                          value={draft.targetMarginPct}
                          onChange={(e) =>
                            updateRowDraft(product, {
                              targetMarginPct: Math.max(
                                0,
                                Number(e.target.value) || 0
                              ),
                            })
                          }
                          aria-label={`Objectif de marge de ${product.name}`}
                          className="w-16 px-2 py-1.5 text-center font-mono-tabular font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
                        />
                      </td>

                      {/* Retail Selling Price + Live Margin */}
                      <td className="py-3 px-3 text-right align-top space-y-1">
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={draft.priceFcfa}
                          onChange={(e) =>
                            updateRowDraft(product, {
                              priceFcfa: Math.max(
                                0,
                                Number(e.target.value) || 0
                              ),
                            })
                          }
                          aria-label={`Prix détail de ${product.name}`}
                          className="w-24 px-2 py-1.5 text-right font-mono-tabular font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
                        />
                        <p
                          className={`text-[11px] font-mono-tabular font-semibold ${
                            metrics.retailProfitFcfa <= 0
                              ? 'text-red-600 dark:text-red-400'
                              : isBelow
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {metrics.retailProfitFcfa >= 0 ? '+' : ''}
                          {formatFcfa(
                            metrics.retailProfitFcfa,
                            settings.currencyLabel
                          )}{' '}
                          ({metrics.retailMarginPct.toFixed(1)}%)
                        </p>
                      </td>

                      {/* Wholesale Price + Live Margin */}
                      <td className="py-3 px-3 text-right align-top space-y-1">
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={draft.wholesalePriceFcfa}
                          onChange={(e) =>
                            updateRowDraft(product, {
                              wholesalePriceFcfa: Math.max(
                                0,
                                Number(e.target.value) || 0
                              ),
                            })
                          }
                          aria-label={`Prix gros de ${product.name}`}
                          className="w-24 px-2 py-1.5 text-right font-mono-tabular font-bold text-[#0369A1] dark:text-[#38BDF8] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
                        />
                        <p
                          className={`text-[11px] font-mono-tabular font-semibold ${
                            metrics.wholesaleProfitFcfa <= 0
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {metrics.wholesaleProfitFcfa >= 0 ? '+' : ''}
                          {formatFcfa(
                            metrics.wholesaleProfitFcfa,
                            settings.currencyLabel
                          )}{' '}
                          ({metrics.wholesaleMarginPct.toFixed(1)}%)
                        </p>
                      </td>

                      {/* Potential Stock Profit */}
                      <td className="py-3 px-3 text-right align-top font-mono-tabular">
                        <p
                          className={`font-semibold ${
                            metrics.stockProfitPotentialFcfa <= 0
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {formatFcfa(
                            metrics.stockProfitPotentialFcfa,
                            settings.currencyLabel
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          sur {product.stockQty} u.
                        </p>
                      </td>

                      {/* Row Actions */}
                      <td className="py-3 px-4 text-right align-top">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleCalculateRowRecommended(product)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#0F2342] dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md cursor-pointer whitespace-nowrap"
                            title="Calculer les prix conseillés depuis le coût et l'objectif %"
                          >
                            <Calculator className="w-3 h-3 text-[#D9531E]" />
                            Prix auto
                          </button>
                          {dirty && (
                            <>
                              <button
                                type="button"
                                onClick={() => resetRowDraft(product.id)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                                title="Annuler les modifications de cette ligne"
                                aria-label={`Annuler modifications ${product.name}`}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveSingleRow(product)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#D9531E] hover:bg-[#B84315] rounded-md cursor-pointer whitespace-nowrap"
                              >
                                <Save className="w-3 h-3" />
                                Enregistrer
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
