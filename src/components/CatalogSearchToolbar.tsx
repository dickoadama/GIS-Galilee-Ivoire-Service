import React, { useState } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  ScanBarcode,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  Product,
  ProductPole,
  ProductSortOption,
} from '../types/app';

export type StockStatusFilter = 'all' | 'in_stock' | 'critical' | 'out';

interface CatalogSearchToolbarProps {
  products: Product[];
  poleFilter: ProductPole | 'separated';
  selectedCategory: string;
  searchQuery: string;
  sortBy: ProductSortOption;
  stockStatus: StockStatusFilter;
  maxPriceFcfa: string;
  currencyLabel: string;
  availableCategories: { name: string; count: number }[];
  poleCounts: Record<ProductPole | 'all', number>;
  criticalCount: number;
  outOfStockCount: number;
  filteredTotalCount: number;
  onChangePole: (pole: ProductPole | 'separated') => void;
  onChangeCategory: (category: string) => void;
  onChangeSearch: (query: string) => void;
  onChangeSort: (sort: ProductSortOption) => void;
  onChangeStockStatus: (status: StockStatusFilter) => void;
  onChangeMaxPrice: (val: string) => void;
  onResetAll: () => void;
  onOpenScanner: () => void;
}

export const CatalogSearchToolbar: React.FC<CatalogSearchToolbarProps> = ({
  products,
  poleFilter,
  selectedCategory,
  searchQuery,
  sortBy,
  stockStatus,
  maxPriceFcfa,
  currencyLabel,
  availableCategories,
  poleCounts,
  criticalCount,
  outOfStockCount,
  filteredTotalCount,
  onChangePole,
  onChangeCategory,
  onChangeSearch,
  onChangeSort,
  onChangeStockStatus,
  onChangeMaxPrice,
  onResetAll,
  onOpenScanner,
}) => {
  const [showExtraFilters, setShowExtraFilters] = useState(false);

  const hasActiveFilters =
    poleFilter !== 'separated' ||
    selectedCategory !== 'all' ||
    searchQuery.trim().length > 0 ||
    stockStatus !== 'all' ||
    maxPriceFcfa.trim().length > 0;

  return (
    <section
      aria-label="Recherche avancée et filtres du catalogue"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
    >
      {/* Row 1: Search Input + Pole Select + Category Select + Sort Select */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-5">
          <label
            htmlFor="catalog-advanced-search"
            className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
          >
            Recherche rapide (nom, catégorie, EAN, unité)
          </label>
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              id="catalog-advanced-search"
              type="text"
              value={searchQuery}
              onChange={(e) => onChangeSearch(e.target.value)}
              placeholder="Ex. CPJ 42.5, fer 10, coca, 618100..."
              className="w-full pl-9 pr-16 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#0F2342] dark:focus:border-[#D9531E]"
            />
            <div className="absolute right-1.5 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onChangeSearch('')}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-md cursor-pointer"
                  aria-label="Effacer la recherche"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onOpenScanner}
                className="p-1.5 text-slate-500 hover:text-[#D9531E] rounded-md cursor-pointer"
                title="Rechercher par scan de code-barres"
                aria-label="Rechercher par scan de code-barres"
              >
                <ScanBarcode className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="catalog-pole-select"
            className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
          >
            Pôle
          </label>
          <select
            id="catalog-pole-select"
            value={poleFilter}
            onChange={(e) => {
              onChangePole(e.target.value as ProductPole | 'separated');
              onChangeCategory('all');
            }}
            className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#0F2342] dark:focus:border-[#D9531E]"
          >
            <option value="separated">
              Tous les pôles ({poleCounts.all})
            </option>
            <option value="ciment">Ciment ({poleCounts.ciment})</option>
            <option value="quincaillerie">
              Quincaillerie ({poleCounts.quincaillerie})
            </option>
            <option value="boissons">Boissons ({poleCounts.boissons})</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <label
            htmlFor="catalog-category-select"
            className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
          >
            Catégorie
          </label>
          <select
            id="catalog-category-select"
            value={selectedCategory}
            onChange={(e) => onChangeCategory(e.target.value)}
            className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#0F2342] dark:focus:border-[#D9531E]"
          >
            <option value="all">
              Toutes catégories ({availableCategories.reduce((s, c) => s + c.count, 0)})
            </option>
            {availableCategories.map((cat) => (
              <option key={cat.name} value={cat.name}>
                {cat.name} ({cat.count})
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="catalog-sort-select"
            className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
          >
            Classement
          </label>
          <select
            id="catalog-sort-select"
            value={sortBy}
            onChange={(e) => onChangeSort(e.target.value as ProductSortOption)}
            className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#0F2342] dark:focus:border-[#D9531E]"
          >
            <option value="priority_orders">Priorité & sorties</option>
            <option value="alpha_asc">Nom (A → Z)</option>
            <option value="alpha_desc">Nom (Z → A)</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
          </select>
        </div>
      </div>

      {/* Row 2: Quick Pole Segmented Tabs + Advanced Toggle & Live Result Summary */}
      <div className="px-4 sm:px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/35 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/75 dark:bg-slate-800 rounded-lg self-start">
          {(
            [
              {
                id: 'separated',
                label: `Vue Séparée (${poleCounts.all})`,
              },
              { id: 'ciment', label: `Ciment (${poleCounts.ciment})` },
              {
                id: 'quincaillerie',
                label: `Quincaillerie (${poleCounts.quincaillerie})`,
              },
              { id: 'boissons', label: `Boissons (${poleCounts.boissons})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onChangePole(tab.id);
                onChangeCategory('all');
              }}
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

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
            <strong className="text-slate-900 dark:text-white">
              {filteredTotalCount}
            </strong>{' '}
            / {products.length} article(s)
          </span>

          <button
            type="button"
            onClick={() => setShowExtraFilters((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showExtraFilters || stockStatus !== 'all' || maxPriceFcfa !== ''
                ? 'bg-[#0F2342] text-white border-[#0F2342] dark:bg-[#D9531E] dark:border-[#D9531E]'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtres stock & tarif
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#D9531E] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Optional Row: Stock Status & Max Price Filters */}
      {(showExtraFilters || stockStatus !== 'all' || maxPriceFcfa !== '') && (
        <div className="px-4 sm:px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div>
            <label
              htmlFor="catalog-stock-status"
              className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
            >
              État du stock
            </label>
            <select
              id="catalog-stock-status"
              value={stockStatus}
              onChange={(e) =>
                onChangeStockStatus(e.target.value as StockStatusFilter)
              }
              className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option value="all">Tous les niveaux de stock</option>
              <option value="in_stock">En stock disponible (&gt; 0)</option>
              <option value="critical">
                Sous seuil critique ({criticalCount})
              </option>
              <option value="out">
                En rupture uniquement ({outOfStockCount})
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="catalog-max-price"
              className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
            >
              Prix unitaire maximum ({currencyLabel})
            </label>
            <input
              id="catalog-max-price"
              type="number"
              min={0}
              step={100}
              value={maxPriceFcfa}
              onChange={(e) => onChangeMaxPrice(e.target.value)}
              placeholder="Ex. 10000"
              className="w-full px-3 py-2 text-xs font-mono-tabular bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Combinez pôle, catégorie, mot-clé ou code-barres EAN pour retrouver immédiatement un tarif chantier ou boisson.
          </p>
        </div>
      )}

      {/* Row 3: Dynamic Category Selector directly above the product list */}
      <div className="px-4 sm:px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1 whitespace-nowrap">
          Catégories ({availableCategories.length}) :
        </span>

        <button
          type="button"
          onClick={() =>
            onChangeStockStatus(
              stockStatus === 'critical' ? 'all' : 'critical'
            )
          }
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            stockStatus === 'critical'
              ? 'bg-[#D9531E] text-white border-[#D9531E]'
              : criticalCount > 0
                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100/70'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Alertes critiques ({criticalCount})
        </button>

        <button
          type="button"
          onClick={() => onChangeCategory('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-[#0F2342] text-white border-[#0F2342] dark:bg-[#D9531E] dark:border-[#D9531E]'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          Toutes catégories
        </button>

        {availableCategories.map((cat) => (
          <button
            key={cat.name}
            type="button"
            onClick={() => onChangeCategory(cat.name)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === cat.name
                ? 'bg-[#0F2342] text-white border-[#0F2342] dark:bg-[#D9531E] dark:border-[#D9531E]'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {cat.name}{' '}
            <span className="font-mono-tabular opacity-75">({cat.count})</span>
          </button>
        ))}
      </div>
    </section>
  );
};
