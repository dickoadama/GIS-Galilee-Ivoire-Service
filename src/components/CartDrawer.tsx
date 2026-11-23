import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCircle2,
  CloudOff,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import {
  CartItem,
  DeliveryMode,
  Invoice,
  InvoiceDocType,
  InvoiceLineItem,
  PaymentMethod,
  Product,
  StoreSettings,
  UserRole,
} from '../types/app';
import {
  formatFcfa,
  getPaymentLabel,
  getPoleLabel,
  getUnitPriceForQty,
} from '../utils/formatters';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  products: Product[];
  settings: StoreSettings;
  currentUid: string;
  currentUserName: string;
  currentRole: UserRole;
  staffReaderUids: string[];
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onSubmitInvoice: (invoice: Invoice) => void;
  onOpenInvoicesPage: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  products,
  settings,
  currentUid,
  currentUserName,
  currentRole,
  staffReaderUids,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onSubmitInvoice,
  onOpenInvoicesPage,
}) => {
  const isOnline = useOnlineStatus();
  const canCreateFacture =
    currentRole === 'super_admin' ||
    currentRole === 'admin_patron' ||
    currentRole === 'caisse';

  const [docType, setDocType] = useState<InvoiceDocType>('devis');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryMode, setDeliveryMode] =
    useState<DeliveryMode>('retrait_magasin');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    settings.acceptedPayments[0] ?? 'especes'
  );
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmedCode, setConfirmedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmedCode(null);
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleCloseDrawer = () => {
    setConfirmedCode(null);
    onClose();
  };

  const lineItems: InvoiceLineItem[] = cart
    .map((ci, idx) => {
      const product = products.find((p) => p.id === ci.productId);
      if (!product) return null;
      const { price, isWholesale } = getUnitPriceForQty(product, ci.quantity);
      return {
        id: `li-${product.id}-${idx}`,
        productId: product.id,
        pole: product.pole,
        name: product.name,
        unitLabel: product.unitLabel,
        quantity: ci.quantity,
        appliedUnitPrice: price,
        isWholesale,
        lineTotal: price * ci.quantity,
      };
    })
    .filter((x): x is InvoiceLineItem => x !== null);

  const cimentQuincaillerieSubtotal = lineItems
    .filter((i) => i.pole === 'ciment' || i.pole === 'quincaillerie')
    .reduce((sum, i) => sum + i.lineTotal, 0);

  const boissonsSubtotal = lineItems
    .filter((i) => i.pole === 'boissons')
    .reduce((sum, i) => sum + i.lineTotal, 0);

  const subtotal = cimentQuincaillerieSubtotal + boissonsSubtotal;
  const qualifiesFreeDelivery =
    subtotal >= settings.freeDeliveryThresholdFcfa &&
    settings.freeDeliveryThresholdFcfa > 0;
  const deliveryFeeFcfa =
    deliveryMode === 'livraison_locale' && !qualifiesFreeDelivery && subtotal > 0
      ? settings.deliveryFeeFcfa
      : 0;
  const totalFcfa = subtotal + deliveryFeeFcfa;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (lineItems.length === 0) {
      setFormError('Ajoutez au moins un article avant de valider.');
      return;
    }
    if (customerName.trim().length < 2) {
      setFormError('Veuillez renseigner votre nom ou entreprise.');
      return;
    }
    const cleanPhone = customerPhone.replace(/\s+/g, '');
    if (cleanPhone.length < 8) {
      setFormError('Veuillez saisir un numéro de téléphone valide.');
      return;
    }
    if (
      deliveryMode === 'livraison_locale' &&
      customerAddress.trim().length < 4
    ) {
      setFormError('Veuillez préciser le lieu de livraison.');
      return;
    }

    const effectiveDocType: InvoiceDocType = canCreateFacture
      ? docType
      : 'devis';
    const prefix = effectiveDocType === 'facture' ? 'FAC-GIS' : 'DEV-GIS';
    const code = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      docType: effectiveDocType,
      code,
      createdAt: now,
      updatedAt: now,
      customerName: customerName.trim(),
      customerPhone: cleanPhone,
      customerAddress:
        deliveryMode === 'retrait_magasin'
          ? 'Retrait au magasin (près de la gare TSR)'
          : customerAddress.trim(),
      deliveryMode,
      paymentMethod,
      notes: notes.trim(),
      status: effectiveDocType === 'facture' ? 'en_preparation' : 'en_attente',
      items: lineItems,
      discountFcfa: 0,
      deliveryFeeFcfa,
      cimentQuincaillerieSubtotal,
      boissonsSubtotal,
      totalFcfa,
      createdByUid: currentUid,
      createdByName: currentUserName,
      staffReaderUids,
    };

    onSubmitInvoice(newInvoice);
    onClearCart();
    setConfirmedCode(code);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setNotes('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="cart-drawer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseDrawer();
          }}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-drawer-title"
        >
          <motion.div
            key="cart-drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{
              type: 'spring',
              stiffness: 360,
              damping: 34,
              mass: 0.9,
            }}
            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-xl h-full flex flex-col border-l border-slate-200 dark:border-slate-800 shadow-2xl"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-[#D9531E]" />
                <h2
                  id="cart-drawer-title"
                  className="font-display font-bold text-lg"
                >
                  Panier · Devis & Facturation
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseDrawer}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Fermer le panier"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!isOnline && (
            <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200">
              <CloudOff className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span>
                Mode hors connexion actif : vous pouvez modifier votre panier et enregistrer votre document. La synchronisation se fera automatiquement dès le retour d’internet.
              </span>
            </div>
          )}
          {confirmedCode ? (
            <div className="py-10 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="font-display font-bold text-xl">
                Document {confirmedCode} enregistré
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                Retrouvez ce document dans l’espace Factures & Devis pour le modifier, l’imprimer ou le télécharger en PNG / CSV.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmedCode(null);
                    onClose();
                    onOpenInvoicesPage();
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-[#0F2342] text-white rounded-lg hover:bg-[#1A355E] transition-colors cursor-pointer"
                >
                  Ouvrir Factures & Devis
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmedCode(null)}
                  className="px-4 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Nouveau panier
                </button>
              </div>
            </div>
          ) : lineItems.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="font-display font-semibold text-base">
                Votre panier est vide
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Ajoutez des articles de Ciment, Quincaillerie ou Boissons pour générer un devis ou une facture avec totaux séparés.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
                {lineItems.map((item) => (
                  <div
                    key={item.productId}
                    className="pt-3 first:pt-0 flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {getPoleLabel(item.pole)} · {item.unitLabel}
                      </p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                        {item.name}
                      </p>
                      <p className="text-xs font-mono-tabular text-slate-600 dark:text-slate-300 mt-1">
                        {formatFcfa(
                          item.appliedUnitPrice,
                          settings.currencyLabel
                        )}{' '}
                        / unité
                        {item.isWholesale && (
                          <span className="text-emerald-700 dark:text-emerald-400 font-sans font-semibold">
                            {' '}
                            · Tarif gros
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQty(item.productId, item.quantity - 1)
                          }
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          aria-label="Diminuer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-mono-tabular font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQty(item.productId, item.quantity + 1)
                          }
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          aria-label="Augmenter"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono-tabular font-bold">
                          {formatFcfa(item.lineTotal, settings.currencyLabel)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.productId)}
                          className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          aria-label="Retirer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Separated Totals Summary */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">
                    Sous-total Ciment & Quincaillerie
                  </span>
                  <span className="font-mono-tabular font-semibold text-[#D9531E]">
                    {formatFcfa(
                      cimentQuincaillerieSubtotal,
                      settings.currencyLabel
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">
                    Sous-total Boissons
                  </span>
                  <span className="font-mono-tabular font-semibold text-[#0369A1] dark:text-[#38BDF8]">
                    {formatFcfa(boissonsSubtotal, settings.currencyLabel)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">
                    Frais de livraison
                  </span>
                  <span className="font-mono-tabular font-semibold">
                    {deliveryMode === 'retrait_magasin'
                      ? 'Retrait gratuit'
                      : qualifiesFreeDelivery
                        ? 'Offerte'
                        : formatFcfa(deliveryFeeFcfa, settings.currencyLabel)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-base font-bold">
                  <span>Total général</span>
                  <span className="font-mono-tabular text-slate-900 dark:text-white">
                    {formatFcfa(totalFcfa, settings.currencyLabel)}
                  </span>
                </div>
              </div>

              <form
                id="cart-checkout-form"
                onSubmit={handleConfirm}
                className="space-y-4"
              >
                {canCreateFacture && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Type de document
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDocType('devis')}
                        className={`px-3 py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                          docType === 'devis'
                            ? 'bg-[#0F2342] text-white border-[#0F2342] dark:bg-[#D9531E] dark:border-[#D9531E]'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        Devis estimatif
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocType('facture')}
                        className={`px-3 py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                          docType === 'facture'
                            ? 'bg-[#0F2342] text-white border-[#0F2342] dark:bg-[#D9531E] dark:border-[#D9531E]'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        Facture officielle
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Mode de réception
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryMode('retrait_magasin')}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                        deliveryMode === 'retrait_magasin'
                          ? 'bg-[#0F2342] text-white border-[#0F2342]'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Retrait magasin (Gare TSR)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMode('livraison_locale')}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                        deliveryMode === 'livraison_locale'
                          ? 'bg-[#0F2342] text-white border-[#0F2342]'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Livraison locale
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Client / Entreprise *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ex. Kouadio Konan"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Téléphone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="07 06 04 49 79"
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                </div>

                {deliveryMode === 'livraison_locale' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Adresse de livraison *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Quartier, repère..."
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Mode de règlement
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

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Remarques (optionnel)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Boissons glacées, livraison chantier..."
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>

                {formError && (
                  <p className="text-xs font-medium text-red-600 dark:text-red-400">
                    {formError}
                  </p>
                )}
              </form>
            </>
          )}
        </div>

        {!confirmedCode && lineItems.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
            <button
              type="button"
              onClick={onClearCart}
              className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 transition-colors cursor-pointer"
            >
              Vider
            </button>
            <button
              type="submit"
              form="cart-checkout-form"
              className="px-5 py-2.5 text-xs font-semibold bg-[#D9531E] hover:bg-[#B84315] text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Enregistrer {canCreateFacture && docType === 'facture' ? 'la facture' : 'le devis'}
            </button>
          </div>
        )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
