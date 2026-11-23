import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  Download,
  FileSpreadsheet,
  History,
  PackageCheck,
  PackagePlus,
  Pencil,
  Plus,
  ScanBarcode,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import {
  AuditLog,
  Product,
  ProductPole,
  ProductSortOption,
  PurchaseOrder,
  StoreSettings,
  UserRole,
} from '../types/app';
import { formatFcfa, getPoleLabel, sortProducts } from '../utils/formatters';
import {
  buildPurchaseOrderWhatsAppSummary,
  calculateRecommendedRestockQty,
  downloadPurchaseOrderAsCsv,
  downloadPurchaseOrderAsPng,
  getPoleScopeLabel,
  getPurchaseOrderStatusLabel,
} from '../utils/purchaseOrder';
import { ProductModal } from '../components/ProductModal';
import { ProductEditorModal } from '../components/ProductEditorModal';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import {
  CatalogSearchToolbar,
  StockStatusFilter,
} from '../components/CatalogSearchToolbar';
import { QuickRestockForm } from '../components/QuickRestockForm';
import { SupplierOrderModal } from '../components/SupplierOrderModal';
import { ProductPriceHistoryModal } from '../components/ProductPriceHistoryModal';
import { doesAuditLogMatchProduct } from '../utils/priceHistory';

interface CatalogPageProps {
  products: Product[];
  purchaseOrders?: PurchaseOrder[];
  auditLogs?: AuditLog[];
  settings: StoreSettings;
  currentUid?: string;
  currentUserName?: string;
  currentRole: UserRole;
  staffReaderUids?: string[];
  isAuthenticated?: boolean;
  initialPole?: ProductPole | 'separated';
  onAddToCart: (productId: string, quantity: number) => void;
  onAddProduct?: (product: Product) => void;
  onUpdateProduct?: (product: Product) => void;
  onSavePurchaseOrder?: (po: PurchaseOrder, isNew: boolean) => void;
  onReceivePurchaseOrder?: (po: PurchaseOrder) => void;
  onDeletePurchaseOrder?: (poId: string) => void;
  onSignIn?: () => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  products,
  purchaseOrders = [],
  auditLogs = [],
  settings,
  currentUid = 'guest-local',
  currentUserName = 'Gestionnaire GIS',
  currentRole,
  staffReaderUids = [],
  isAuthenticated = false,
  initialPole = 'separated',
  onAddToCart,
  onAddProduct,
  onUpdateProduct,
  onSavePurchaseOrder,
  onReceivePurchaseOrder,
  onDeletePurchaseOrder,
  onSignIn,
}) => {
  const [poleFilter, setPoleFilter] = useState<ProductPole | 'separated'>(
    initialPole
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<ProductSortOption>('priority_orders');
  const [stockStatus, setStockStatus] = useState<StockStatusFilter>('all');
  const [maxPriceFcfa, setMaxPriceFcfa] = useState<string>('');
  const [showAlertDetails, setShowAlertDetails] = useState(false);
  const [showSupplierOrders, setShowSupplierOrders] = useState(false);
  const [copiedPoId, setCopiedPoId] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [editorTarget, setEditorTarget] = useState<Product | 'new' | null>(
    null
  );
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [prefillBarcode, setPrefillBarcode] = useState<string>('');
  const [restockTarget, setRestockTarget] = useState<{
    scope: 'card' | 'alert';
    id: string;
  } | null>(null);
  const [supplierModalState, setSupplierModalState] = useState<{
    products: Product[];
    existingOrder: PurchaseOrder | null;
  } | null>(null);
  const [priceHistoryTarget, setPriceHistoryTarget] = useState<Product | null>(
    null
  );

  const canViewPriceHistory = currentRole !== 'client';

  const priceHistoryCountById = useMemo(() => {
    const map: Record<string, number> = {};
    if (auditLogs.length === 0) return map;
    for (const p of products) {
      map[p.id] = auditLogs.filter((log) =>
        doesAuditLogMatchProduct(log, p)
      ).length;
    }
    return map;
  }, [products, auditLogs]);

  const canCreateAnyProduct =
    currentRole === 'super_admin' ||
    currentRole === 'admin_patron' ||
    currentRole === 'gerant_ciment' ||
    currentRole === 'gerant_boisson';

  const canManagePole = (pole: ProductPole) => {
    if (currentRole === 'super_admin' || currentRole === 'admin_patron')
      return true;
    if (
      currentRole === 'gerant_ciment' &&
      (pole === 'ciment' || pole === 'quincaillerie')
    )
      return true;
    if (currentRole === 'gerant_boisson' && pole === 'boissons') return true;
    return false;
  };

  const getThreshold = (p: Product) => p.criticalStockThreshold ?? 15;

  const isProductCritical = (p: Product) => p.stockQty < getThreshold(p);

  const criticalProducts = useMemo(() => {
    return products
      .filter((p) => p.stockQty < getThreshold(p))
      .sort((a, b) => a.stockQty - b.stockQty);
  }, [products]);

  const outOfStockCount = useMemo(
    () => criticalProducts.filter((p) => p.stockQty === 0).length,
    [criticalProducts]
  );

  const criticalCimentCount = useMemo(
    () =>
      criticalProducts.filter(
        (p) => p.pole === 'ciment' || p.pole === 'quincaillerie'
      ).length,
    [criticalProducts]
  );

  const criticalBoissonsCount = useMemo(
    () => criticalProducts.filter((p) => p.pole === 'boissons').length,
    [criticalProducts]
  );

  const manageableCriticalProducts = useMemo(
    () => criticalProducts.filter((p) => canManagePole(p.pole)),
    [criticalProducts, currentRole]
  );

  const openSupplierOrderForProducts = (seedProducts: Product[]) => {
    setSupplierModalState({
      products: seedProducts,
      existingOrder: null,
    });
  };

  const handleCopyPoWhatsApp = async (po: PurchaseOrder) => {
    const summary = buildPurchaseOrderWhatsAppSummary(
      po,
      settings.poster.companyName,
      settings.currencyLabel
    );
    try {
      await navigator.clipboard.writeText(summary);
      setCopiedPoId(po.id);
      setTimeout(() => setCopiedPoId(null), 2000);
    } catch {
      setCopiedPoId(null);
    }
  };

  const poleCounts = useMemo<Record<ProductPole | 'all', number>>(
    () => ({
      all: products.length,
      ciment: products.filter((p) => p.pole === 'ciment').length,
      quincaillerie: products.filter((p) => p.pole === 'quincaillerie').length,
      boissons: products.filter((p) => p.pole === 'boissons').length,
    }),
    [products]
  );

  const availableCategories = useMemo(() => {
    const base =
      poleFilter === 'separated'
        ? products
        : products.filter((p) => p.pole === poleFilter);
    const countsMap = new Map<string, { name: string; count: number }>();
    for (const item of base) {
      const cleanName = item.category.trim();
      if (!cleanName) continue;
      const key = cleanName.toLowerCase();
      const existing = countsMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        countsMap.set(key, { name: cleanName, count: 1 });
      }
    }
    return Array.from(countsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    );
  }, [products, poleFilter]);

  const effectiveCategory = useMemo(() => {
    if (selectedCategory === 'all') return 'all';
    const match = availableCategories.find(
      (c) => c.name.toLowerCase() === selectedCategory.trim().toLowerCase()
    );
    return match ? match.name : 'all';
  }, [availableCategories, selectedCategory]);

  const filterAndSort = (list: Product[]) => {
    const tokens = searchQuery
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    const maxPrice = maxPriceFcfa.trim() ? Number(maxPriceFcfa) : null;

    const filtered = list.filter((p) => {
      if (stockStatus === 'critical' && !isProductCritical(p)) return false;
      if (stockStatus === 'out' && p.stockQty !== 0) return false;
      if (stockStatus === 'in_stock' && p.stockQty <= 0) return false;
      if (
        maxPrice !== null &&
        !Number.isNaN(maxPrice) &&
        maxPrice >= 0 &&
        p.priceFcfa > maxPrice
      ) {
        return false;
      }
      if (
        effectiveCategory !== 'all' &&
        p.category.trim().toLowerCase() !== effectiveCategory.toLowerCase()
      ) {
        return false;
      }
      if (tokens.length > 0) {
        const haystack = [
          p.name,
          p.category,
          p.description,
          p.unitLabel,
          getPoleLabel(p.pole),
          p.barcode ?? '',
        ]
          .join(' ')
          .toLowerCase();
        for (const token of tokens) {
          if (!haystack.includes(token)) return false;
        }
      }
      return true;
    });
    return sortProducts(filtered, sortBy);
  };

  const cimentHardwareProducts = useMemo(
    () =>
      filterAndSort(
        products.filter(
          (p) => p.pole === 'ciment' || p.pole === 'quincaillerie'
        )
      ),
    [products, effectiveCategory, searchQuery, sortBy, stockStatus, maxPriceFcfa]
  );

  const boissonsProducts = useMemo(
    () => filterAndSort(products.filter((p) => p.pole === 'boissons')),
    [products, effectiveCategory, searchQuery, sortBy, stockStatus, maxPriceFcfa]
  );

  const singlePoleProducts = useMemo(() => {
    if (poleFilter === 'separated') return [];
    return filterAndSort(products.filter((p) => p.pole === poleFilter));
  }, [
    products,
    poleFilter,
    effectiveCategory,
    searchQuery,
    sortBy,
    stockStatus,
    maxPriceFcfa,
  ]);

  const filteredTotalCount =
    poleFilter === 'separated'
      ? cimentHardwareProducts.length + boissonsProducts.length
      : singlePoleProducts.length;

  const handleResetAllFilters = () => {
    setPoleFilter('separated');
    setSelectedCategory('all');
    setSearchQuery('');
    setStockStatus('all');
    setMaxPriceFcfa('');
  };

  const renderProductCard = (product: Product) => {
    const accentColor =
      product.pole === 'boissons'
        ? 'text-[#0369A1] dark:text-[#38BDF8]'
        : 'text-[#D9531E]';
    const threshold = getThreshold(product);
    const isCritical = product.stockQty < threshold;
    const isOutOfStock = product.stockQty === 0;
    const stockMeterPct =
      threshold > 0
        ? Math.min(100, Math.round((product.stockQty / (threshold * 2)) * 100))
        : product.stockQty > 0
          ? 100
          : 0;

    return (
      <article
        key={product.id}
        className={`rounded-xl p-5 flex flex-col justify-between gap-4 transition-transform duration-150 hover:-translate-y-0.5 border ${
          isOutOfStock
            ? 'bg-red-50/45 dark:bg-red-950/20 border-red-300 dark:border-red-800'
            : isCritical
              ? 'bg-amber-50/45 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="truncate">
              <strong className={accentColor}>{getPoleLabel(product.pole)}</strong> ·{' '}
              {product.category}
            </span>
            <span
              className={`shrink-0 font-mono-tabular font-semibold ${
                isOutOfStock
                  ? 'text-red-700 dark:text-red-400'
                  : isCritical
                    ? 'text-amber-700 dark:text-amber-400'
                    : product.inStock
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              Stock : {product.stockQty} / {threshold}
            </span>
          </div>

          {/* Visual Alert Indicator + Stock Threshold Progress */}
          <div className="space-y-1.5">
            {isOutOfStock ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400">
                <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Rupture de stock · Seuil critique : {threshold}
                </span>
              </div>
            ) : isCritical ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Alerte stock bas ({product.stockQty} &lt; seuil {threshold})
                </span>
              </div>
            ) : null}

            <div
              className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
              aria-label={`Niveau de stock ${product.stockQty} sur un seuil critique de ${threshold}`}
            >
              <div
                className={`h-full transition-all duration-200 ${
                  isOutOfStock
                    ? 'bg-red-600'
                    : isCritical
                      ? 'bg-amber-500'
                      : 'bg-emerald-600 dark:bg-emerald-500'
                }`}
                style={{ width: `${Math.max(isOutOfStock ? 0 : 6, stockMeterPct)}%` }}
              />
            </div>

            {isCritical && canManagePole(product.pole) && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] font-mono-tabular text-slate-600 dark:text-slate-300 truncate">
                  Réappro. auto : +{calculateRecommendedRestockQty(product)} u.
                </span>
                <button
                  type="button"
                  onClick={() => openSupplierOrderForProducts([product])}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#0F2342] dark:text-white bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 hover:bg-amber-100/70 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  title="Générer un bon de commande fournisseur pré-rempli"
                >
                  <ClipboardList className="w-3 h-3 text-[#D9531E]" />
                  Bon fournisseur
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setActiveProduct(product)}
            className="text-left block w-full cursor-pointer group"
          >
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white group-hover:text-[#D9531E] transition-colors leading-snug">
              {product.name}
            </h3>
          </button>

          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          <p className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
            Priorité {product.priorityScore}/100 · {product.orderCount} cmd ·{' '}
            {product.outflowQty} sorties
            {product.barcode ? ` · EAN ${product.barcode}` : ''}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <p className="font-mono-tabular font-bold text-lg text-slate-900 dark:text-white">
                {formatFcfa(product.priceFcfa, settings.currencyLabel)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {product.unitLabel}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 font-mono-tabular">
                Gros :{' '}
                {formatFcfa(product.wholesalePriceFcfa, settings.currencyLabel)}
              </p>
              <p className="text-[11px] text-slate-400">
                dès {product.wholesaleMinQty} u.
              </p>
              {canViewPriceHistory && (
                <button
                  type="button"
                  onClick={() => setPriceHistoryTarget(product)}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F2342] dark:text-slate-200 hover:text-[#D9531E] dark:hover:text-[#D9531E] transition-colors cursor-pointer"
                  title="Consulter l’historique des fluctuations de prix (Audit Logs)"
                >
                  <History className="w-3 h-3 text-[#D9531E]" />
                  <span>
                    Historique prix
                    {(priceHistoryCountById[product.id] ?? 0) > 0
                      ? ` (${priceHistoryCountById[product.id]})`
                      : ''}
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManagePole(product.pole) && onUpdateProduct && (
              <>
                <button
                  type="button"
                  onClick={() => setEditorTarget(product)}
                  className="inline-flex items-center gap-1 px-2.5 py-2 text-[11px] font-semibold text-[#0F2342] dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  title="Modifier prix, stock et seuil critique"
                >
                  <Pencil className="w-3 h-3" />
                  Prix / Seuil
                </button>
                <button
                  type="button"
                  disabled={product.stockQty === 0}
                  onClick={() => {
                    const nextQty = Math.max(0, product.stockQty - 1);
                    onUpdateProduct({
                      ...product,
                      stockQty: nextQty,
                      inStock: nextQty > 0,
                      updatedAt: new Date().toISOString(),
                    });
                  }}
                  className="px-2.5 py-2 text-[11px] font-mono-tabular font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap"
                  title="Retirer 1 unité du stock"
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRestockTarget((curr) =>
                      curr?.scope === 'card' && curr.id === product.id
                        ? null
                        : { scope: 'card', id: product.id }
                    )
                  }
                  className={`inline-flex items-center gap-1 px-2.5 py-2 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                    restockTarget?.scope === 'card' &&
                    restockTarget.id === product.id
                      ? 'bg-[#D9531E] text-white border-[#D9531E]'
                      : 'text-[#0F2342] dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                  title="Ouvrir le formulaire rapide d’ajout au stock"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  + Stock
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setActiveProduct(product)}
              className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Détails
            </button>
            <button
              type="button"
              onClick={() => onAddToCart(product.id, 1)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#0F2342] hover:bg-[#1A355E] dark:bg-[#D9531E] dark:hover:bg-[#B84315] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter
            </button>
          </div>

          {canManagePole(product.pole) &&
            onUpdateProduct &&
            restockTarget?.scope === 'card' &&
            restockTarget.id === product.id && (
              <QuickRestockForm
                product={product}
                onCancel={() => setRestockTarget(null)}
                onAddStock={(unitsToAdd) => {
                  onUpdateProduct({
                    ...product,
                    stockQty: product.stockQty + unitsToAdd,
                    inStock: true,
                    updatedAt: new Date().toISOString(),
                  });
                  setRestockTarget(null);
                }}
              />
            )}
        </div>
      </article>
    );
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Grilles tarifaires séparées · Ciment & Quincaillerie / Boissons
          </p>
          <h1 className="font-display font-extrabold text-3xl text-slate-900 dark:text-white tracking-tight mt-1">
            Catalogue & Tarifs séparés
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0F2342] hover:bg-[#1A355E] dark:bg-slate-800 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <ScanBarcode className="w-4 h-4" />
            Scanner code-barres
          </button>

          {canCreateAnyProduct && onAddProduct ? (
            <button
              type="button"
              onClick={() => {
                setPrefillBarcode('');
                setEditorTarget('new');
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#D9531E] hover:bg-[#B84315] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Ajouter un article
            </button>
          ) : !isAuthenticated && onSignIn ? (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#0F2342] dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Connexion gestionnaire (Prix & Ajout)
            </button>
          ) : null}
        </div>
      </div>

      {/* Stock Critical Alert Summary Banner */}
      {criticalProducts.length > 0 ? (
        <section
          aria-label="Alertes de stock critique"
          className={`rounded-xl border overflow-hidden ${
            outOfStockCount > 0
              ? 'bg-red-50/60 dark:bg-red-950/25 border-red-300 dark:border-red-800'
              : 'bg-amber-50/60 dark:bg-amber-950/25 border-amber-300 dark:border-amber-700'
          }`}
        >
          <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              {outOfStockCount > 0 ? (
                <AlertOctagon className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-display font-bold text-base text-slate-900 dark:text-white">
                  {criticalProducts.length} produit(s) sous le seuil critique de stock
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {outOfStockCount > 0 ? `${outOfStockCount} en rupture · ` : ''}
                  {criticalCimentCount} en Ciment & Quincaillerie ·{' '}
                  {criticalBoissonsCount} en Boissons
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {manageableCriticalProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    openSupplierOrderForProducts(manageableCriticalProducts)
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F2342] hover:bg-[#1A355E] dark:bg-slate-800 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ClipboardList className="w-3.5 h-3.5 text-amber-300" />
                  Bon de commande auto ({manageableCriticalProducts.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowAlertDetails((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {showAlertDetails ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    Masquer la liste
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    Voir le détail ({criticalProducts.length})
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() =>
                  setStockStatus((s) => (s === 'critical' ? 'all' : 'critical'))
                }
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  stockStatus === 'critical'
                    ? 'bg-[#0F2342] text-white dark:bg-[#D9531E]'
                    : 'bg-[#D9531E] text-white hover:bg-[#B84315]'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {stockStatus === 'critical'
                  ? 'Afficher tout le stock'
                  : `Filtrer les alertes (${criticalProducts.length})`}
              </button>
            </div>
          </div>

          {showAlertDetails && (
            <div className="border-t border-amber-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 divide-y divide-slate-100 dark:divide-slate-800">
              {criticalProducts.map((cp) => {
                const cpThreshold = getThreshold(cp);
                const editable = canManagePole(cp.pole);
                const isAlertRestockOpen =
                  restockTarget?.scope === 'alert' &&
                  restockTarget.id === cp.id;
                const recommendedUnits = calculateRecommendedRestockQty(cp);
                return (
                  <div key={cp.id} className="px-5 py-3 space-y-3 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {cp.name}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 font-mono-tabular">
                          {getPoleLabel(cp.pole)} · Stock actuel :{' '}
                          <strong
                            className={
                              cp.stockQty === 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }
                          >
                            {cp.stockQty}
                          </strong>{' '}
                          / Seuil critique : {cpThreshold} ({cp.unitLabel}) ·
                          Réappro. conseillé : +{recommendedUnits}
                        </p>
                      </div>

                      {editable && onUpdateProduct && (
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => openSupplierOrderForProducts([cp])}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#0F2342] dark:text-white bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/50 rounded-md cursor-pointer whitespace-nowrap"
                          >
                            <ClipboardList className="w-3.5 h-3.5 text-[#D9531E]" />
                            Bon fournisseur
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditorTarget(cp)}
                            className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                          >
                            Ajuster seuil
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setRestockTarget((curr) =>
                                isAlertRestockOpen
                                  ? null
                                  : { scope: 'alert', id: cp.id }
                              )
                            }
                            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                              isAlertRestockOpen
                                ? 'bg-[#D9531E] text-white'
                                : 'text-white bg-[#0F2342] hover:bg-[#1A355E] dark:bg-[#D9531E] dark:hover:bg-[#B84315]'
                            }`}
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                            + Stock
                          </button>
                        </div>
                      )}
                    </div>

                    {editable && onUpdateProduct && isAlertRestockOpen && (
                      <div className="max-w-sm">
                        <QuickRestockForm
                          product={cp}
                          onCancel={() => setRestockTarget(null)}
                          onAddStock={(unitsToAdd) => {
                            onUpdateProduct({
                              ...cp,
                              stockQty: cp.stockQty + unitsToAdd,
                              inStock: true,
                              updatedAt: new Date().toISOString(),
                            });
                            setRestockTarget(null);
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl px-5 py-3.5 flex items-center gap-2.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            Aucune alerte critique : tous les produits du catalogue sont au-dessus de leur seuil minimum.
          </span>
        </div>
      )}

      {/* Supplier Purchase Orders Tracking (Managers & Admins) */}
      {canCreateAnyProduct && purchaseOrders.length > 0 && (
        <section
          aria-label="Bons de commande fournisseurs enregistrés"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
        >
          <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ClipboardList className="w-4 h-4 text-[#D9531E] shrink-0" />
              <div>
                <p className="font-display font-bold text-sm text-slate-900 dark:text-white">
                  Bons de commande fournisseurs ({purchaseOrders.length})
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Suivi des réapprovisionnements générés · Export PNG/CSV/WhatsApp et mise en stock à la réception
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSupplierOrders((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
            >
              {showSupplierOrders ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Masquer
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  Afficher les bons ({purchaseOrders.length})
                </>
              )}
            </button>
          </div>

          {showSupplierOrders && (
            <div className="border-t border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {purchaseOrders.map((po) => {
                const isReceived = po.status === 'receptionne';
                const canDeletePo =
                  currentRole === 'super_admin' ||
                  currentRole === 'admin_patron';
                return (
                  <div
                    key={po.id}
                    className="px-5 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono-tabular font-bold text-slate-900 dark:text-white">
                          {po.code}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-semibold ${
                            isReceived
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : po.status === 'envoye'
                                ? 'text-[#D9531E]'
                                : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {getPurchaseOrderStatusLabel(po.status)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {getPoleScopeLabel(po.poleScope)}
                        </span>
                      </div>
                      <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {po.supplierName} ·{' '}
                        <span className="font-mono-tabular">
                          {po.items.length} article(s) ·{' '}
                          {formatFcfa(
                            po.totalEstimatedFcfa,
                            settings.currencyLabel
                          )}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {!isReceived && onReceivePurchaseOrder && (
                        <button
                          type="button"
                          onClick={() => onReceivePurchaseOrder(po)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md cursor-pointer whitespace-nowrap"
                          title="Valider la livraison et ajouter automatiquement ces quantités au stock"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          Réceptionner (+ Stock)
                        </button>
                      )}
                      {!isReceived && (
                        <button
                          type="button"
                          onClick={() =>
                            setSupplierModalState({
                              products: [],
                              existingOrder: po,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md cursor-pointer whitespace-nowrap"
                        >
                          <Pencil className="w-3 h-3" />
                          Modifier
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          void downloadPurchaseOrderAsPng(po, settings)
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md cursor-pointer whitespace-nowrap"
                      >
                        <Download className="w-3 h-3" />
                        PNG
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadPurchaseOrderAsCsv(po, settings)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md cursor-pointer whitespace-nowrap"
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                        CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyPoWhatsApp(po)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md cursor-pointer whitespace-nowrap"
                      >
                        {copiedPoId === po.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            Copié
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            WhatsApp
                          </>
                        )}
                      </button>
                      {canDeletePo && onDeletePurchaseOrder && (
                        <button
                          type="button"
                          onClick={() => onDeletePurchaseOrder(po.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                          aria-label={`Supprimer ${po.code}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Advanced Search & Multi-Facet Filter Bar */}
      <CatalogSearchToolbar
        products={products}
        poleFilter={poleFilter}
        selectedCategory={effectiveCategory}
        searchQuery={searchQuery}
        sortBy={sortBy}
        stockStatus={stockStatus}
        maxPriceFcfa={maxPriceFcfa}
        currencyLabel={settings.currencyLabel}
        availableCategories={availableCategories}
        poleCounts={poleCounts}
        criticalCount={criticalProducts.length}
        outOfStockCount={outOfStockCount}
        filteredTotalCount={filteredTotalCount}
        onChangePole={setPoleFilter}
        onChangeCategory={setSelectedCategory}
        onChangeSearch={setSearchQuery}
        onChangeSort={setSortBy}
        onChangeStockStatus={setStockStatus}
        onChangeMaxPrice={setMaxPriceFcfa}
        onResetAll={handleResetAllFilters}
        onOpenScanner={() => setIsScannerOpen(true)}
      />

      {/* Separated Display vs Single Pole Display */}
      {poleFilter === 'separated' ? (
        cimentHardwareProducts.length === 0 && boissonsProducts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
            <ShoppingBag className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="font-display font-semibold text-base">
              Aucun article ne correspond aux critères sélectionnés
            </p>
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="px-4 py-2 text-xs font-semibold bg-[#0F2342] dark:bg-[#D9531E] text-white rounded-lg cursor-pointer"
            >
              Réinitialiser la recherche avancée
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {/* SECTION 1: CIMENT & QUINCAILLERIE */}
            <section className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b-2 border-[#D9531E] pb-3">
                <div>
                  <span className="text-xs font-semibold text-[#D9531E]">
                    Tarification Pôle 01 · Bâtiment & Chantier
                  </span>
                  <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">
                    Prix Ciment & Quincaillerie ({cimentHardwareProducts.length})
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Géré par le Gérant Ciment · Tarifs détail & gros chantier séparés
                </p>
              </div>

              {cimentHardwareProducts.length === 0 ? (
                <p className="text-sm text-slate-500 py-6">
                  Aucun article Ciment ou Quincaillerie ne correspond à cette recherche.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cimentHardwareProducts.map(renderProductCard)}
                </div>
              )}
            </section>

            {/* SECTION 2: VENTE DE BOISSONS */}
            <section className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b-2 border-[#0369A1] pb-3">
                <div>
                  <span className="text-xs font-semibold text-[#0369A1] dark:text-[#38BDF8]">
                    Tarification Pôle 02 · Rafraîchissement & Dépôt
                  </span>
                  <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">
                    Prix Boissons ({boissonsProducts.length})
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Géré par le Gérant Boisson · Packs, casiers et plateaux séparés
                </p>
              </div>

              {boissonsProducts.length === 0 ? (
                <p className="text-sm text-slate-500 py-6">
                  Aucune boisson ne correspond à cette recherche.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {boissonsProducts.map(renderProductCard)}
                </div>
              )}
            </section>
          </div>
        )
      ) : singlePoleProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
          <ShoppingBag className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
          <p className="font-display font-semibold text-base">
            Aucun article trouvé dans ce pôle
          </p>
          <button
            type="button"
            onClick={handleResetAllFilters}
            className="px-4 py-2 text-xs font-semibold bg-[#0F2342] dark:bg-[#D9531E] text-white rounded-lg cursor-pointer"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {singlePoleProducts.map(renderProductCard)}
        </div>
      )}

      <ProductModal
        product={activeProduct}
        currencyLabel={settings.currencyLabel}
        onClose={() => setActiveProduct(null)}
        onAddToCart={onAddToCart}
        onViewPriceHistory={
          canViewPriceHistory
            ? (prod) => setPriceHistoryTarget(prod)
            : undefined
        }
      />

      <ProductPriceHistoryModal
        product={priceHistoryTarget}
        auditLogs={auditLogs}
        settings={settings}
        isAuthenticated={isAuthenticated}
        canEditProduct={
          priceHistoryTarget ? canManagePole(priceHistoryTarget.pole) : false
        }
        onClose={() => setPriceHistoryTarget(null)}
        onOpenEditor={(prod) => setEditorTarget(prod)}
        onSignIn={onSignIn}
      />

      {editorTarget !== null && (
        <ProductEditorModal
          key={
            editorTarget === 'new'
              ? `new-prod-${prefillBarcode}`
              : editorTarget.id
          }
          isOpen={true}
          initialProduct={editorTarget === 'new' ? null : editorTarget}
          initialBarcode={editorTarget === 'new' ? prefillBarcode : undefined}
          settings={settings}
          currentRole={currentRole}
          onClose={() => {
            setEditorTarget(null);
            setPrefillBarcode('');
          }}
          onSave={(saved, isNew) => {
            if (isNew) {
              onAddProduct?.(saved);
            } else {
              onUpdateProduct?.(saved);
            }
          }}
        />
      )}

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        products={products}
        settings={settings}
        currentRole={currentRole}
        onClose={() => setIsScannerOpen(false)}
        onUpdateProduct={onUpdateProduct}
        onAddToCart={onAddToCart}
        onOpenEditorForProduct={(prod) => {
          setIsScannerOpen(false);
          setPrefillBarcode('');
          setEditorTarget(prod);
        }}
        onCreateProductWithBarcode={(code) => {
          setIsScannerOpen(false);
          setPrefillBarcode(code);
          setEditorTarget('new');
        }}
      />

      {supplierModalState !== null && (
        <SupplierOrderModal
          key={
            supplierModalState.existingOrder?.id ??
            supplierModalState.products.map((p) => p.id).join('-')
          }
          isOpen={true}
          initialProducts={supplierModalState.products}
          initialPurchaseOrder={supplierModalState.existingOrder}
          allProducts={products}
          manageableCriticalProducts={manageableCriticalProducts}
          canManagePole={canManagePole}
          settings={settings}
          currentUid={currentUid}
          currentUserName={currentUserName}
          staffReaderUids={staffReaderUids}
          onClose={() => setSupplierModalState(null)}
          onSave={(po, isNew) => {
            onSavePurchaseOrder?.(po, isNew);
            setShowSupplierOrders(true);
          }}
        />
      )}
    </div>
  );
};
