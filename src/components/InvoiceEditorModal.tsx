import React, { useState } from 'react';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import {
  DeliveryMode,
  Invoice,
  InvoiceDocType,
  InvoiceLineItem,
  InvoiceStatus,
  Member,
  PaymentMethod,
  Product,
  StoreSettings,
} from '../types/app';
import {
  formatFcfa,
  getPaymentLabel,
  getPoleLabel,
  getUnitPriceForQty,
} from '../utils/formatters';

interface InvoiceEditorModalProps {
  isOpen: boolean;
  initialInvoice: Invoice | null;
  products: Product[];
  members: Member[];
  settings: StoreSettings;
  currentUid: string;
  currentUserName: string;
  staffReaderUids: string[];
  onClose: () => void;
  onSave: (invoice: Invoice, isNew: boolean) => void;
}

export const InvoiceEditorModal: React.FC<InvoiceEditorModalProps> = ({
  isOpen,
  initialInvoice,
  products,
  members,
  settings,
  currentUid,
  currentUserName,
  staffReaderUids,
  onClose,
  onSave,
}) => {
  const isNew = !initialInvoice;

  const [docType, setDocType] = useState<InvoiceDocType>(
    initialInvoice?.docType ?? 'facture'
  );
  const [customerName, setCustomerName] = useState(
    initialInvoice?.customerName ?? ''
  );
  const [customerPhone, setCustomerPhone] = useState(
    initialInvoice?.customerPhone ?? ''
  );
  const [customerAddress, setCustomerAddress] = useState(
    initialInvoice?.customerAddress ?? ''
  );
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(
    initialInvoice?.deliveryMode ?? 'retrait_magasin'
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initialInvoice?.paymentMethod ?? 'especes'
  );
  const [status, setStatus] = useState<InvoiceStatus>(
    initialInvoice?.status ?? 'en_attente'
  );
  const [discountFcfa, setDiscountFcfa] = useState(
    String(initialInvoice?.discountFcfa ?? 0)
  );
  const [deliveryFeeFcfa, setDeliveryFeeFcfa] = useState(
    String(initialInvoice?.deliveryFeeFcfa ?? 0)
  );
  const [assignedLoaderName, setAssignedLoaderName] = useState(
    initialInvoice?.assignedLoaderName ?? ''
  );
  const [assignedDriverName, setAssignedDriverName] = useState(
    initialInvoice?.assignedDriverName ?? ''
  );
  const [notes, setNotes] = useState(initialInvoice?.notes ?? '');
  const [items, setItems] = useState<InvoiceLineItem[]>(
    initialInvoice?.items ?? []
  );
  const [selectedProductId, setSelectedProductId] = useState(
    products[0]?.id ?? ''
  );
  const [addQty, setAddQty] = useState(1);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const loaders = members.filter((m) => m.role === 'chargeur' && m.active);
  const drivers = members.filter((m) => m.role === 'chauffeur' && m.active);

  const handleAddLine = () => {
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;
    const qty = Math.max(1, addQty);
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === prod.id);
      if (existing) {
        const nextQty = existing.quantity + qty;
        const { price, isWholesale } = getUnitPriceForQty(prod, nextQty);
        return prev.map((i) =>
          i.productId === prod.id
            ? {
                ...i,
                quantity: nextQty,
                appliedUnitPrice: price,
                isWholesale,
                lineTotal: price * nextQty,
              }
            : i
        );
      }
      const { price, isWholesale } = getUnitPriceForQty(prod, qty);
      return [
        ...prev,
        {
          id: `li-${prod.id}-${Date.now()}`,
          productId: prod.id,
          pole: prod.pole,
          name: prod.name,
          unitLabel: prod.unitLabel,
          quantity: qty,
          appliedUnitPrice: price,
          isWholesale,
          lineTotal: price * qty,
        },
      ];
    });
    setAddQty(1);
  };

  const updateLineQty = (lineId: string, nextQty: number) => {
    if (nextQty <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== lineId));
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== lineId) return item;
        const prod = products.find((p) => p.id === item.productId);
        const { price, isWholesale } = prod
          ? getUnitPriceForQty(prod, nextQty)
          : { price: item.appliedUnitPrice, isWholesale: item.isWholesale };
        return {
          ...item,
          quantity: nextQty,
          appliedUnitPrice: price,
          isWholesale,
          lineTotal: price * nextQty,
        };
      })
    );
  };

  const cimentQuincaillerieSubtotal = items
    .filter((i) => i.pole === 'ciment' || i.pole === 'quincaillerie')
    .reduce((sum, i) => sum + i.lineTotal, 0);

  const boissonsSubtotal = items
    .filter((i) => i.pole === 'boissons')
    .reduce((sum, i) => sum + i.lineTotal, 0);

  const discount = Math.max(0, Number(discountFcfa) || 0);
  const delivery = Math.max(0, Number(deliveryFeeFcfa) || 0);
  const totalFcfa = Math.max(
    0,
    cimentQuincaillerieSubtotal + boissonsSubtotal - discount + delivery
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!customerName.trim()) {
      setError('Veuillez saisir le nom du client.');
      return;
    }
    if (items.length === 0) {
      setError('Ajoutez au moins un article dans la facture ou le devis.');
      return;
    }

    const now = new Date().toISOString();
    const prefix = docType === 'facture' ? 'FAC-GIS' : 'DEV-GIS';
    const generatedCode =
      initialInvoice?.code &&
      ((docType === 'facture' && initialInvoice.code.startsWith('FAC')) ||
        (docType === 'devis' && initialInvoice.code.startsWith('DEV')))
        ? initialInvoice.code
        : `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

    const saved: Invoice = {
      id: initialInvoice?.id ?? `inv-${Date.now()}`,
      docType,
      code: generatedCode,
      createdAt: initialInvoice?.createdAt ?? now,
      updatedAt: now,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      deliveryMode,
      paymentMethod,
      notes: notes.trim(),
      status,
      items,
      discountFcfa: discount,
      deliveryFeeFcfa: delivery,
      cimentQuincaillerieSubtotal,
      boissonsSubtotal,
      totalFcfa,
      createdByUid: initialInvoice?.createdByUid ?? currentUid,
      createdByName: initialInvoice?.createdByName ?? currentUserName,
      assignedLoaderName: assignedLoaderName.trim() || undefined,
      assignedDriverName: assignedDriverName.trim() || undefined,
      staffReaderUids:
        initialInvoice?.staffReaderUids?.length
          ? initialInvoice.staffReaderUids
          : staffReaderUids,
    };

    onSave(saved, isNew);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-editor-title"
    >
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2
            id="invoice-editor-title"
            className="font-display font-bold text-xl"
          >
            {isNew
              ? 'Nouvelle Facture / Devis'
              : `Modifier ${initialInvoice?.code}`}
          </h2>
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
          id="invoice-editor-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {/* Doc type + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Type de document
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as InvoiceDocType)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              >
                <option value="facture">Facture</option>
                <option value="devis">Devis</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Statut
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              >
                <option value="brouillon">Brouillon</option>
                <option value="en_attente">En attente</option>
                <option value="en_preparation">En préparation / Chargement</option>
                <option value="prete_livree">Prête / Livrée</option>
                <option value="payee">Payée</option>
                <option value="annulee">Annulée</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mode de paiement
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMethod)
                }
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              >
                {settings.acceptedPayments.map((pm) => (
                  <option key={pm} value={pm}>
                    {getPaymentLabel(pm)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Client / Entreprise *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Réception
              </label>
              <select
                value={deliveryMode}
                onChange={(e) =>
                  setDeliveryMode(e.target.value as DeliveryMode)
                }
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              >
                <option value="retrait_magasin">Retrait magasin</option>
                <option value="livraison_locale">Livraison locale</option>
              </select>
            </div>
          </div>

          {/* Logistics assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Adresse / Chantier
              </label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Chargeur assigné
              </label>
              <input
                type="text"
                list="loaders-list"
                value={assignedLoaderName}
                onChange={(e) => setAssignedLoaderName(e.target.value)}
                placeholder="Nom du chargeur"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
              <datalist id="loaders-list">
                {loaders.map((l) => (
                  <option key={l.id} value={l.fullName} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Chauffeur assigné
              </label>
              <input
                type="text"
                list="drivers-list"
                value={assignedDriverName}
                onChange={(e) => setAssignedDriverName(e.target.value)}
                placeholder="Nom du chauffeur"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
              <datalist id="drivers-list">
                {drivers.map((d) => (
                  <option key={d.id} value={d.fullName} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Add Product Line */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Ajouter un article (Ciment, Quincaillerie ou Boissons)
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{getPoleLabel(p.pole)}] {p.name} —{' '}
                    {formatFcfa(p.priceFcfa, settings.currencyLabel)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={addQty}
                onChange={(e) => setAddQty(Math.max(1, Number(e.target.value) || 1))}
                className="w-24 px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
              <button
                type="button"
                onClick={handleAddLine}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#0F2342] text-white rounded-lg hover:bg-[#1A355E] cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter ligne
              </button>
            </div>
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/70">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Article</th>
                    <th className="py-2.5 px-3 font-semibold">Pôle</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Qté</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                    <th className="py-2.5 px-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {formatFcfa(
                            item.appliedUnitPrice,
                            settings.currencyLabel
                          )}{' '}
                          / {item.unitLabel}
                        </p>
                      </td>
                      <td className="py-2.5 px-3 text-xs font-semibold">
                        {getPoleLabel(item.pole)}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateLineQty(item.id, item.quantity - 1)
                            }
                            className="p-1 border border-slate-200 dark:border-slate-700 rounded cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-mono-tabular font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateLineQty(item.id, item.quantity + 1)
                            }
                            className="p-1 border border-slate-200 dark:border-slate-700 rounded cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular font-semibold">
                        {formatFcfa(item.lineTotal, settings.currencyLabel)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => updateLineQty(item.id, 0)}
                          className="text-slate-400 hover:text-red-600 cursor-pointer"
                          aria-label="Supprimer ligne"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Adjustments & Separated Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Remise ({settings.currencyLabel})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={discountFcfa}
                    onChange={(e) => setDiscountFcfa(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Livraison ({settings.currencyLabel})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={deliveryFeeFcfa}
                    onChange={(e) => setDeliveryFeeFcfa(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Ciment & Quincaillerie</span>
                <span className="font-mono-tabular font-semibold text-[#D9531E]">
                  {formatFcfa(
                    cimentQuincaillerieSubtotal,
                    settings.currencyLabel
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Boissons</span>
                <span className="font-mono-tabular font-semibold text-[#0369A1] dark:text-[#38BDF8]">
                  {formatFcfa(boissonsSubtotal, settings.currencyLabel)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 font-bold text-base">
                <span>Total TTC</span>
                <span className="font-mono-tabular">
                  {formatFcfa(totalFcfa, settings.currencyLabel)}
                </span>
              </div>
            </div>
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
            className="px-4 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="invoice-editor-form"
            className="px-5 py-2 text-xs font-semibold bg-[#D9531E] hover:bg-[#B84315] text-white rounded-lg cursor-pointer"
          >
            {isNew ? 'Enregistrer le document' : 'Mettre à jour'}
          </button>
        </div>
      </div>
    </div>
  );
};
