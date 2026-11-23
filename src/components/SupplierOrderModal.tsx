import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ClipboardList,
  Copy,
  Download,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import {
  Product,
  ProductPole,
  PurchaseOrder,
  PurchaseOrderLineItem,
  PurchaseOrderPoleScope,
  PurchaseOrderStatus,
  StoreSettings,
} from '../types/app';
import { formatFcfa, getPoleLabel } from '../utils/formatters';
import {
  buildPurchaseOrderWhatsAppSummary,
  calculateRecommendedRestockQty,
  downloadPurchaseOrderAsCsv,
  downloadPurchaseOrderAsPng,
  estimateSupplierUnitCostFcfa,
  generatePurchaseOrderCode,
  getDefaultExpectedDeliveryDate,
  getPoleScopeLabel,
  inferPoleScopeFromPoles,
  SUPPLIER_PRESETS,
} from '../utils/purchaseOrder';

interface SupplierOrderModalProps {
  isOpen: boolean;
  initialProducts: Product[];
  initialPurchaseOrder?: PurchaseOrder | null;
  allProducts: Product[];
  manageableCriticalProducts: Product[];
  canManagePole: (pole: ProductPole) => boolean;
  settings: StoreSettings;
  currentUid: string;
  currentUserName: string;
  staffReaderUids: string[];
  onClose: () => void;
  onSave: (purchaseOrder: PurchaseOrder, isNew: boolean) => void;
}

function buildLineFromProduct(product: Product): PurchaseOrderLineItem {
  const qty = calculateRecommendedRestockQty(product);
  const unitCost = estimateSupplierUnitCostFcfa(product);
  return {
    id: `poi-${product.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    productId: product.id,
    pole: product.pole,
    name: product.name,
    unitLabel: product.unitLabel,
    currentStockAtOrder: product.stockQty,
    criticalThreshold: product.criticalStockThreshold ?? 15,
    quantity: qty,
    estimatedUnitCostFcfa: unitCost,
    lineTotalFcfa: qty * unitCost,
  };
}

export const SupplierOrderModal: React.FC<SupplierOrderModalProps> = ({
  isOpen,
  initialProducts,
  initialPurchaseOrder = null,
  allProducts,
  manageableCriticalProducts,
  canManagePole,
  settings,
  currentUid,
  currentUserName,
  staffReaderUids,
  onClose,
  onSave,
}) => {
  const isEditingExisting = Boolean(initialPurchaseOrder);

  const initialLines = useMemo<PurchaseOrderLineItem[]>(() => {
    if (initialPurchaseOrder) {
      return initialPurchaseOrder.items;
    }
    return initialProducts.map(buildLineFromProduct);
  }, [initialPurchaseOrder, initialProducts]);

  const initialScope: PurchaseOrderPoleScope = useMemo(() => {
    if (initialPurchaseOrder) return initialPurchaseOrder.poleScope;
    return inferPoleScopeFromPoles(initialProducts.map((p) => p.pole));
  }, [initialPurchaseOrder, initialProducts]);

  const defaultPreset = SUPPLIER_PRESETS[initialScope];

  const [code, setCode] = useState(
    initialPurchaseOrder?.code ?? generatePurchaseOrderCode()
  );
  const [poleScope, setPoleScope] =
    useState<PurchaseOrderPoleScope>(initialScope);
  const [supplierName, setSupplierName] = useState(
    initialPurchaseOrder?.supplierName ?? defaultPreset.supplierName
  );
  const [supplierPhone, setSupplierPhone] = useState(
    initialPurchaseOrder?.supplierPhone ?? defaultPreset.supplierPhone
  );
  const [supplierAddress, setSupplierAddress] = useState(
    initialPurchaseOrder?.supplierAddress ?? defaultPreset.supplierAddress
  );
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    initialPurchaseOrder?.expectedDeliveryDate ??
      getDefaultExpectedDeliveryDate(2)
  );
  const [notes, setNotes] = useState(
    initialPurchaseOrder?.notes ??
      'Réapprovisionnement automatique suite au passage sous le seuil critique de stock.'
  );
  const [items, setItems] = useState<PurchaseOrderLineItem[]>(initialLines);
  const [selectedAddProductId, setSelectedAddProductId] = useState<string>('');
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const manageableProducts = allProducts.filter((p) => canManagePole(p.pole));
  const availableProductsToAdd = manageableProducts.filter(
    (p) => !items.some((it) => it.productId === p.id)
  );
  const remainingCriticalProducts = manageableCriticalProducts.filter(
    (p) => !items.some((it) => it.productId === p.id)
  );

  const totalEstimatedFcfa = items.reduce(
    (sum, item) => sum + item.lineTotalFcfa,
    0
  );

  const applyPresetForScope = (scope: PurchaseOrderPoleScope) => {
    const preset = SUPPLIER_PRESETS[scope];
    setPoleScope(scope);
    setSupplierName(preset.supplierName);
    setSupplierPhone(preset.supplierPhone);
    setSupplierAddress(preset.supplierAddress);
  };

  const handleUpdateLineQty = (lineId: string, nextQty: number) => {
    const qty = Math.max(1, Math.round(nextQty) || 1);
    setItems((prev) =>
      prev.map((item) =>
        item.id === lineId
          ? {
              ...item,
              quantity: qty,
              lineTotalFcfa: qty * item.estimatedUnitCostFcfa,
            }
          : item
      )
    );
  };

  const handleUpdateLineCost = (lineId: string, nextCost: number) => {
    const cost = Math.max(0, Math.round(nextCost) || 0);
    setItems((prev) =>
      prev.map((item) =>
        item.id === lineId
          ? {
              ...item,
              estimatedUnitCostFcfa: cost,
              lineTotalFcfa: item.quantity * cost,
            }
          : item
      )
    );
  };

  const handleRemoveLine = (lineId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== lineId));
  };

  const handleAddSingleProduct = () => {
    const targetId = selectedAddProductId || availableProductsToAdd[0]?.id;
    const prod = availableProductsToAdd.find((p) => p.id === targetId);
    if (!prod) return;
    const nextItems = [...items, buildLineFromProduct(prod)];
    setItems(nextItems);
    setPoleScope(inferPoleScopeFromPoles(nextItems.map((i) => i.pole)));
    setSelectedAddProductId('');
  };

  const handleIncludeAllCritical = () => {
    if (remainingCriticalProducts.length === 0) return;
    const added = remainingCriticalProducts.map(buildLineFromProduct);
    const nextItems = [...items, ...added];
    setItems(nextItems);
    const nextScope = inferPoleScopeFromPoles(nextItems.map((i) => i.pole));
    if (nextScope !== poleScope) {
      applyPresetForScope(nextScope);
    }
  };

  const handleRecalculateAutoQuantities = () => {
    setItems((prev) =>
      prev.map((item) => {
        const prod = allProducts.find((p) => p.id === item.productId);
        if (!prod) return item;
        const qty = calculateRecommendedRestockQty(prod);
        return {
          ...item,
          quantity: qty,
          lineTotalFcfa: qty * item.estimatedUnitCostFcfa,
        };
      })
    );
  };

  const buildOrderPayload = (statusOverride?: PurchaseOrderStatus): PurchaseOrder => {
    const now = new Date().toISOString();
    return {
      id: initialPurchaseOrder?.id ?? `po-${Date.now()}`,
      code: code.trim() || generatePurchaseOrderCode(),
      poleScope,
      supplierName: supplierName.trim() || 'Fournisseur GIS',
      supplierPhone: supplierPhone.trim(),
      supplierAddress: supplierAddress.trim(),
      expectedDeliveryDate: expectedDeliveryDate.trim(),
      status: statusOverride ?? initialPurchaseOrder?.status ?? 'envoye',
      items,
      totalEstimatedFcfa,
      notes: notes.trim(),
      createdByUid: initialPurchaseOrder?.createdByUid ?? currentUid,
      createdByName: initialPurchaseOrder?.createdByName ?? currentUserName,
      staffReaderUids:
        initialPurchaseOrder?.staffReaderUids?.length
          ? initialPurchaseOrder.staffReaderUids
          : staffReaderUids,
      createdAt: initialPurchaseOrder?.createdAt ?? now,
      updatedAt: now,
    };
  };

  const validateOrder = (): boolean => {
    setError(null);
    if (!supplierName.trim()) {
      setError('Veuillez indiquer le nom du fournisseur.');
      return false;
    }
    if (items.length === 0) {
      setError('Ajoutez au moins un article dans le bon de commande.');
      return false;
    }
    return true;
  };

  const handleSaveStatus = (status: PurchaseOrderStatus) => {
    if (!validateOrder()) return;
    const po = buildOrderPayload(status);
    onSave(po, !isEditingExisting);
    onClose();
  };

  const handleCopyWhatsApp = async () => {
    if (!validateOrder()) return;
    const po = buildOrderPayload('envoye');
    const summary = buildPurchaseOrderWhatsAppSummary(
      po,
      settings.poster.companyName,
      settings.currencyLabel
    );
    try {
      await navigator.clipboard.writeText(summary);
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2000);
    } catch {
      setCopiedWhatsApp(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="supplier-po-title"
    >
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <ClipboardList className="w-5 h-5 text-[#D9531E] shrink-0" />
            <div className="min-w-0">
              <h2
                id="supplier-po-title"
                className="font-display font-bold text-lg sm:text-xl truncate"
              >
                {isEditingExisting
                  ? `Bon de commande fournisseur · ${initialPurchaseOrder?.code}`
                  : 'Bon de commande fournisseur pré-rempli'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Quantités calculées automatiquement selon les seuils critiques ·{' '}
                {getPoleScopeLabel(poleScope)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Export & Auto-fill Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              {remainingCriticalProducts.length > 0 && (
                <button
                  type="button"
                  onClick={handleIncludeAllCritical}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#D9531E] bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/50 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  + Inclure les {remainingCriticalProducts.length} autres sous seuil critique
                </button>
              )}
              <button
                type="button"
                onClick={handleRecalculateAutoQuantities}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap"
                title="Recalculer les quantités recommandées"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Recalculer qtés auto
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!validateOrder()) return;
                  void downloadPurchaseOrderAsPng(
                    buildOrderPayload(),
                    settings
                  );
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0F2342] text-white hover:bg-[#1A355E] rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                PNG
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!validateOrder()) return;
                  downloadPurchaseOrderAsCsv(buildOrderPayload(), settings);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                CSV
              </button>
              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap"
              >
                {copiedWhatsApp ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copié
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    WhatsApp
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Supplier & Order Reference Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Référence Bon de commande
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-tabular font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Pôle / Modèle fournisseur
              </label>
              <select
                value={poleScope}
                onChange={(e) =>
                  applyPresetForScope(e.target.value as PurchaseOrderPoleScope)
                }
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              >
                <option value="ciment">Pôle Ciment (Grossiste usine)</option>
                <option value="quincaillerie">Pôle Quincaillerie</option>
                <option value="boissons">Pôle Boissons (Dépôt)</option>
                <option value="mixte">Multi-Pôles GIS</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Livraison souhaitée le
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nom du fournisseur *
              </label>
              <input
                type="text"
                required
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Ex. Centrale Ciment ou Distributeur Boissons"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Téléphone fournisseur
              </label>
              <input
                type="tel"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Adresse / Dépôt fournisseur
              </label>
              <input
                type="text"
                value={supplierAddress}
                onChange={(e) => setSupplierAddress(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          {/* Pre-filled Restock Lines Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Article</th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      Stock / Seuil
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-center">
                      Qté à commander
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      P.U. achat estimé
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      Total ligne
                    </th>
                    <th className="py-2.5 px-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-6 px-4 text-center text-xs text-slate-500"
                      >
                        Aucun article sélectionné. Utilisez le sélecteur ci-dessous pour ajouter un produit.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const isZero = item.currentStockAtOrder === 0;
                      const projected =
                        item.currentStockAtOrder + item.quantity;
                      return (
                        <tr key={item.id}>
                          <td className="py-2.5 px-3">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {getPoleLabel(item.pole)} · {item.unitLabel}
                            </p>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-tabular text-xs">
                            <span
                              className={`font-bold ${
                                isZero
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {item.currentStockAtOrder}
                            </span>{' '}
                            / {item.criticalThreshold}
                            <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                              Après : {projected}
                            </p>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min={1}
                              step={1}
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateLineQty(
                                  item.id,
                                  Number(e.target.value)
                                )
                              }
                              aria-label={`Quantité à commander pour ${item.name}`}
                              className="w-20 px-2 py-1 text-center text-xs font-mono-tabular font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min={0}
                              step={50}
                              value={item.estimatedUnitCostFcfa}
                              onChange={(e) =>
                                handleUpdateLineCost(
                                  item.id,
                                  Number(e.target.value)
                                )
                              }
                              aria-label={`Prix unitaire estimé pour ${item.name}`}
                              className="w-28 px-2 py-1 text-right text-xs font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-tabular font-semibold">
                            {formatFcfa(
                              item.lineTotalFcfa,
                              settings.currencyLabel
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(item.id)}
                              className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                              aria-label={`Retirer ${item.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add another product line manually */}
          {availableProductsToAdd.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
              <select
                value={selectedAddProductId || availableProductsToAdd[0]?.id}
                onChange={(e) => setSelectedAddProductId(e.target.value)}
                aria-label="Ajouter un autre article au bon de commande"
                className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
              >
                {availableProductsToAdd.map((p) => {
                  const thr = p.criticalStockThreshold ?? 15;
                  const critFlag = p.stockQty < thr ? ' [CRITIQUE]' : '';
                  return (
                    <option key={p.id} value={p.id}>
                      [{getPoleLabel(p.pole)}] {p.name} — Stock {p.stockQty}/
                      {thr}
                      {critFlag}
                    </option>
                  );
                })}
              </select>
              <button
                type="button"
                onClick={handleAddSingleProduct}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F2342] hover:bg-[#1A355E] rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter l’article
              </button>
            </div>
          )}

          {/* Notes & Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Instructions / Observations fournisseur
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Lignes à commander</span>
                <span className="font-mono-tabular font-semibold">
                  {items.length} article(s) ·{' '}
                  {items.reduce((s, it) => s + it.quantity, 0)} unités
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-sm font-bold">Total estimé commande</span>
                <span className="font-mono-tabular font-extrabold text-lg text-[#D9531E]">
                  {formatFcfa(totalEstimatedFcfa, settings.currencyLabel)}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => handleSaveStatus('brouillon')}
            className="px-4 py-2 text-xs font-semibold text-[#0F2342] dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap"
          >
            Enregistrer en brouillon
          </button>
          <button
            type="button"
            onClick={() => handleSaveStatus('envoye')}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#D9531E] hover:bg-[#B84315] rounded-lg cursor-pointer whitespace-nowrap"
          >
            <Send className="w-3.5 h-3.5" />
            Valider & Enregistrer le Bon
          </button>
        </div>
      </div>
    </div>
  );
};
