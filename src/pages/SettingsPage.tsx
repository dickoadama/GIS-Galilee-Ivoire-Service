import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Download,
  Moon,
  PackagePlus,
  Pencil,
  Plus,
  RotateCcw,
  Sun,
  Trash2,
} from 'lucide-react';
import {
  PaymentMethod,
  Product,
  ProductPole,
  StoreSettings,
  UserRole,
} from '../types/app';
import { POSTER_MODELS, PosterFormat, PosterModelId } from '../types/poster';
import { formatFcfa, getPaymentLabel, getPoleLabel } from '../utils/formatters';
import { ProductEditorModal } from '../components/ProductEditorModal';
import { QuickRestockForm } from '../components/QuickRestockForm';

interface SettingsPageProps {
  settings: StoreSettings;
  products: Product[];
  currentRole: UserRole;
  onUpdateSettings: (next: StoreSettings) => void;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onResetAll: () => void;
}

type SettingsTab = 'company' | 'logistics' | 'catalog' | 'appearance';

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  products,
  currentRole,
  onUpdateSettings,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onResetAll,
}) => {
  const canEditStoreConfig =
    currentRole === 'super_admin' || currentRole === 'admin_patron';
  const canEditPole = (pole: ProductPole) => {
    if (canEditStoreConfig) return true;
    if (
      currentRole === 'gerant_ciment' &&
      (pole === 'ciment' || pole === 'quincaillerie')
    )
      return true;
    if (currentRole === 'gerant_boisson' && pole === 'boissons') return true;
    return false;
  };
  const canCreateAnyProduct =
    canEditStoreConfig ||
    currentRole === 'gerant_ciment' ||
    currentRole === 'gerant_boisson';

  const defaultPole: ProductPole =
    currentRole === 'gerant_boisson' ? 'boissons' : 'ciment';

  const [activeTab, setActiveTab] = useState<SettingsTab>(
    canEditStoreConfig
      ? 'company'
      : canCreateAnyProduct
        ? 'catalog'
        : 'appearance'
  );
  const [savedNotice, setSavedNotice] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [restockProductId, setRestockProductId] = useState<string | null>(null);

  // New Product Form State
  const [newPole, setNewPole] = useState<ProductPole>(defaultPole);
  const [newCategory, setNewCategory] = useState(
    defaultPole === 'boissons' ? 'Eaux minérales' : 'Ciments & Liants'
  );
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('Sac de 50 kg');
  const [newPrice, setNewPrice] = useState('4800');
  const [newWholesalePrice, setNewWholesalePrice] = useState('4550');
  const [newWholesaleMin, setNewWholesaleMin] = useState('10');
  const [newStock, setNewStock] = useState('50');
  const [newCriticalThreshold, setNewCriticalThreshold] = useState('15');
  const [newPriorityScore, setNewPriorityScore] = useState('80');
  const [newDesc, setNewDesc] = useState('');

  const flashSaved = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  const updatePosterField = <K extends keyof StoreSettings['poster']>(
    key: K,
    value: StoreSettings['poster'][K]
  ) => {
    if (!canEditStoreConfig) return;
    onUpdateSettings({
      ...settings,
      poster: { ...settings.poster, [key]: value },
    });
    flashSaved();
  };

  const togglePaymentMethod = (method: PaymentMethod) => {
    if (!canEditStoreConfig) return;
    const exists = settings.acceptedPayments.includes(method);
    const next = exists
      ? settings.acceptedPayments.filter((m) => m !== method)
      : [...settings.acceptedPayments, method];
    if (next.length === 0) return;
    onUpdateSettings({ ...settings, acceptedPayments: next });
    flashSaved();
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditPole(newPole) || !newName.trim()) return;
    const price = Math.max(0, Number(newPrice) || 0);
    const wPrice = Math.max(0, Number(newWholesalePrice) || price);
    const now = new Date().toISOString();
    const product: Product = {
      id: `prod-${Date.now()}`,
      pole: newPole,
      category: newCategory,
      name: newName.trim(),
      unitLabel: newUnit.trim() || 'Unité',
      priceFcfa: price,
      wholesalePriceFcfa: wPrice,
      wholesaleMinQty: Math.max(2, Number(newWholesaleMin) || 10),
      inStock: (Number(newStock) || 0) > 0,
      stockQty: Math.max(0, Number(newStock) || 0),
      criticalStockThreshold: Math.max(0, Number(newCriticalThreshold) || 0),
      priorityScore: Math.min(100, Math.max(0, Number(newPriorityScore) || 50)),
      orderCount: 0,
      outflowQty: 0,
      description:
        newDesc.trim() ||
        'Article disponible au comptoir et sur commande chez Galilée Ivoire Service.',
      createdAt: now,
      updatedAt: now,
    };
    onAddProduct(product);
    setNewName('');
    setNewDesc('');
    flashSaved();
  };

  const handleExportBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings,
      products,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gis-galilee-ivoire-service-backup.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const poleCategories =
    newPole === 'ciment'
      ? ['Ciments & Liants', ...settings.poster.hardware.items]
      : newPole === 'quincaillerie'
        ? settings.poster.hardware.items
        : settings.poster.beverages.items;

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Administration & Configuration
          </p>
          <h1 className="font-display font-extrabold text-3xl text-slate-900 dark:text-white tracking-tight mt-1">
            Paramètres de l’application
          </h1>
        </div>
        {savedNotice && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <Check className="w-4 h-4" />
            Enregistré automatiquement
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/75 dark:bg-slate-800 rounded-lg self-start w-fit">
        {(
          [
            { id: 'company', label: '01. Entreprise & Affiche' },
            { id: 'logistics', label: '02. Horaires & Paiements' },
            { id: 'catalog', label: '03. Catalogue & Tarifs séparés' },
            { id: 'appearance', label: '04. Apparence & Données' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Company & Poster Info */}
      {activeTab === 'company' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display font-bold text-xl">
              Identité commerciale & Coordonnées
            </h2>
            {!canEditStoreConfig && (
              <span className="text-xs text-slate-500">
                Lecture seule (réservé Patron / Super Admin)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Sigle
              </label>
              <input
                type="text"
                disabled={!canEditStoreConfig}
                value={settings.poster.brandAcronym}
                onChange={(e) =>
                  updatePosterField('brandAcronym', e.target.value)
                }
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-60"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Dénomination commerciale
              </label>
              <input
                type="text"
                disabled={!canEditStoreConfig}
                value={settings.poster.companyName}
                onChange={(e) =>
                  updatePosterField('companyName', e.target.value)
                }
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Accroche principale
              </label>
              <input
                type="text"
                disabled={!canEditStoreConfig}
                value={settings.poster.tagline}
                onChange={(e) => updatePosterField('tagline', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Slogan de clôture
              </label>
              <input
                type="text"
                disabled={!canEditStoreConfig}
                value={settings.poster.closingSlogan}
                onChange={(e) =>
                  updatePosterField('closingSlogan', e.target.value)
                }
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Téléphone 1
              </label>
              <input
                type="text"
                disabled={!canEditStoreConfig}
                value={settings.poster.phones[0]}
                onChange={(e) =>
                  updatePosterField('phones', [
                    e.target.value,
                    settings.poster.phones[1],
                  ])
                }
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Téléphone 2
              </label>
              <input
                type="text"
                disabled={!canEditStoreConfig}
                value={settings.poster.phones[1]}
                onChange={(e) =>
                  updatePosterField('phones', [
                    settings.poster.phones[0],
                    e.target.value,
                  ])
                }
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                E-mail professionnel
              </label>
              <input
                type="email"
                disabled={!canEditStoreConfig}
                value={settings.email}
                onChange={(e) => {
                  onUpdateSettings({ ...settings, email: e.target.value });
                  flashSaved();
                }}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Adresse & Repères géographiques
            </label>
            <textarea
              rows={2}
              disabled={!canEditStoreConfig}
              value={settings.poster.location}
              onChange={(e) => updatePosterField('location', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-60"
            />
          </div>
        </div>
      )}

      {/* Tab 2: Hours, Delivery & Payment */}
      {activeTab === 'logistics' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
          <h2 className="font-display font-bold text-xl">
            Horaires, Livraison & Règlements
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Lundi – Vendredi
              </label>
              <input
                type="text"
                disabled={!canEditStoreConfig}
                value={settings.hoursWeekdays}
                onChange={(e) => {
                  onUpdateSettings({
                    ...settings,
                    hoursWeekdays: e.target.value,
                  });
                  flashSaved();
                }}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Samedi
              </label>
              <input
                type="text"
                disabled={!canEditStoreConfig}
                value={settings.hoursSaturday}
                onChange={(e) => {
                  onUpdateSettings({
                    ...settings,
                    hoursSaturday: e.target.value,
                  });
                  flashSaved();
                }}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Dimanche
              </label>
              <input
                type="text"
                disabled={!canEditStoreConfig}
                value={settings.hoursSunday}
                onChange={(e) => {
                  onUpdateSettings({
                    ...settings,
                    hoursSunday: e.target.value,
                  });
                  flashSaved();
                }}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Devise affichée
              </label>
              <input
                type="text"
                disabled={!canEditStoreConfig}
                value={settings.currencyLabel}
                onChange={(e) => {
                  onUpdateSettings({
                    ...settings,
                    currencyLabel: e.target.value,
                  });
                  flashSaved();
                }}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Frais de livraison locale ({settings.currencyLabel})
              </label>
              <input
                type="number"
                min={0}
                disabled={!canEditStoreConfig}
                value={settings.deliveryFeeFcfa}
                onChange={(e) => {
                  onUpdateSettings({
                    ...settings,
                    deliveryFeeFcfa: Math.max(0, Number(e.target.value) || 0),
                  });
                  flashSaved();
                }}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Livraison offerte dès ({settings.currencyLabel})
              </label>
              <input
                type="number"
                min={0}
                disabled={!canEditStoreConfig}
                value={settings.freeDeliveryThresholdFcfa}
                onChange={(e) => {
                  onUpdateSettings({
                    ...settings,
                    freeDeliveryThresholdFcfa: Math.max(
                      0,
                      Number(e.target.value) || 0
                    ),
                  });
                  flashSaved();
                }}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-60"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Modes de paiement acceptés
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                ['especes', 'orange_money', 'wave', 'mtn_momo'] as PaymentMethod[]
              ).map((pm) => {
                const active = settings.acceptedPayments.includes(pm);
                return (
                  <button
                    key={pm}
                    type="button"
                    disabled={!canEditStoreConfig}
                    onClick={() => togglePaymentMethod(pm)}
                    className={`px-4 py-3 text-left text-xs font-semibold rounded-lg border flex items-center justify-between transition-colors cursor-pointer disabled:opacity-60 ${
                      active
                        ? 'bg-[#0F2342] text-white border-[#0F2342] dark:bg-[#D9531E] dark:border-[#D9531E]'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>{getPaymentLabel(pm)}</span>
                    <span>{active ? 'Activé' : 'Désactivé'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Catalog Manager (Separated Poles) */}
      {activeTab === 'catalog' && (
        <div className="space-y-8">
          {canCreateAnyProduct && (
            <form
              onSubmit={handleCreateProduct}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-4"
            >
              <h2 className="font-display font-bold text-xl">
                Ajouter un article (Ciment, Quincaillerie ou Boissons)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Pôle tarifaire *
                  </label>
                  <select
                    value={newPole}
                    onChange={(e) => {
                      const pole = e.target.value as ProductPole;
                      setNewPole(pole);
                      setNewCategory(
                        pole === 'ciment'
                          ? 'Ciments & Liants'
                          : pole === 'quincaillerie'
                            ? settings.poster.hardware.items[0]
                            : settings.poster.beverages.items[0]
                      );
                    }}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  >
                    {(canEditStoreConfig || currentRole === 'gerant_ciment') && (
                      <>
                        <option value="ciment">Ciment (Tarif Ciment)</option>
                        <option value="quincaillerie">
                          Quincaillerie (Tarif Quincaillerie)
                        </option>
                      </>
                    )}
                    {(canEditStoreConfig ||
                      currentRole === 'gerant_boisson') && (
                      <option value="boissons">
                        Vente de Boissons (Tarif Boissons)
                      </option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Catégorie (choix ou saisie libre)
                  </label>
                  <input
                    type="text"
                    list="settings-product-categories"
                    required
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Ex. Ciments & Liants, Boissons..."
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                  <datalist id="settings-product-categories">
                    {poleCategories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Unité / Conditionnement
                  </label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="Sac 50 kg, Pack de 6..."
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-7 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nom de l’article *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex. Ciment CPJ ou Pack Eau"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Prix détail
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Prix gros
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newWholesalePrice}
                    onChange={(e) => setNewWholesalePrice(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Stock initial
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Seuil critique
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newCriticalThreshold}
                    onChange={(e) => setNewCriticalThreshold(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Priorité (0-100)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newPriorityScore}
                    onChange={(e) => setNewPriorityScore(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Description courte
                  </label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Précisions techniques ou format..."
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#D9531E] hover:bg-[#B84315] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter au catalogue
                </button>
              </div>
            </form>
          )}

          {/* Existing Products List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-display font-bold text-lg">
                Articles enregistrés ({products.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Article</th>
                    <th className="py-3 px-4 font-semibold">Pôle · Catégorie</th>
                    <th className="py-3 px-4 font-semibold text-right">
                      Prix détail / gros
                    </th>
                    <th className="py-3 px-4 font-semibold text-right">
                      Priorité / Sorties
                    </th>
                    <th className="py-3 px-4 font-semibold text-center">
                      Disponibilité
                    </th>
                    <th className="py-3 px-4 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {products.map((prod) => {
                    const editable = canEditPole(prod.pole);
                    const threshold = prod.criticalStockThreshold ?? 15;
                    const isCritical = prod.stockQty < threshold;
                    const isRestockOpen = restockProductId === prod.id;
                    return (
                      <React.Fragment key={prod.id}>
                        <tr
                          className={
                            isCritical
                              ? 'bg-amber-50/40 dark:bg-amber-950/15'
                              : undefined
                          }
                        >
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {prod.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                              <span>{prod.unitLabel}</span>
                              <span aria-hidden="true">·</span>
                              <span
                                className={
                                  isCritical
                                    ? 'font-semibold text-amber-700 dark:text-amber-400 inline-flex items-center gap-1'
                                    : undefined
                                }
                              >
                                {isCritical && (
                                  <AlertTriangle className="w-3 h-3 shrink-0" />
                                )}
                                Stock {prod.stockQty} / Seuil {threshold}
                              </span>
                            </p>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            <span className="font-semibold">
                              {getPoleLabel(prod.pole)}
                            </span>{' '}
                            · {prod.category}
                          </td>
                          <td className="py-3 px-4 text-right font-mono-tabular">
                            <p className="font-semibold">
                              {formatFcfa(
                                prod.priceFcfa,
                                settings.currencyLabel
                              )}
                            </p>
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                              Gros :{' '}
                              {formatFcfa(
                                prod.wholesalePriceFcfa,
                                settings.currencyLabel
                              )}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-right font-mono-tabular text-xs text-slate-500">
                            P{prod.priorityScore} · {prod.outflowQty} s.
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              disabled={!editable}
                              onClick={() => {
                                onUpdateProduct({
                                  ...prod,
                                  inStock: !prod.inStock,
                                  updatedAt: new Date().toISOString(),
                                });
                                flashSaved();
                              }}
                              className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer disabled:opacity-60 ${
                                prod.inStock
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                              }`}
                            >
                              {prod.inStock ? 'En stock' : 'Sur commande'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {editable ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRestockProductId(
                                      isRestockOpen ? null : prod.id
                                    )
                                  }
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                                    isRestockOpen
                                      ? 'bg-[#D9531E] text-white border-[#D9531E]'
                                      : 'border-slate-200 dark:border-slate-700 text-[#0F2342] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
                                  }`}
                                  title={`Ajouter au stock de ${prod.name}`}
                                >
                                  <PackagePlus className="w-3.5 h-3.5" />
                                  + Stock
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingProduct(prod)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                                  title={`Modifier ${prod.name}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  Modifier
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteProduct(prod.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                  aria-label={`Supprimer ${prod.name}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                        {editable && isRestockOpen && (
                          <tr className="bg-slate-50/70 dark:bg-slate-800/40">
                            <td colSpan={6} className="px-4 py-3">
                              <div className="max-w-sm ml-auto">
                                <QuickRestockForm
                                  product={prod}
                                  onCancel={() => setRestockProductId(null)}
                                  onAddStock={(unitsToAdd) => {
                                    onUpdateProduct({
                                      ...prod,
                                      stockQty: prod.stockQty + unitsToAdd,
                                      inStock: true,
                                      updatedAt: new Date().toISOString(),
                                    });
                                    setRestockProductId(null);
                                    flashSaved();
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Appearance & Data Backup */}
      {activeTab === 'appearance' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
          <h2 className="font-display font-bold text-xl">
            Apparence, Préférences du Studio & Sauvegarde
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Thème de l’interface
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({ ...settings, theme: 'light' });
                    flashSaved();
                  }}
                  className={`inline-flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold rounded-lg border cursor-pointer ${
                    settings.theme === 'light'
                      ? 'bg-[#0F2342] text-white border-[#0F2342]'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  Clair
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({ ...settings, theme: 'dark' });
                    flashSaved();
                  }}
                  className={`inline-flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold rounded-lg border cursor-pointer ${
                    settings.theme === 'dark'
                      ? 'bg-[#D9531E] text-white border-[#D9531E]'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  Sombre
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Modèle d’affiche par défaut
              </label>
              <select
                value={settings.defaultModel}
                onChange={(e) => {
                  onUpdateSettings({
                    ...settings,
                    defaultModel: e.target.value as PosterModelId,
                  });
                  flashSaved();
                }}
                className="w-full px-3 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              >
                {POSTER_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Format d’affiche par défaut
              </label>
              <select
                value={settings.defaultFormat}
                onChange={(e) => {
                  onUpdateSettings({
                    ...settings,
                    defaultFormat: e.target.value as PosterFormat,
                  });
                  flashSaved();
                }}
                className="w-full px-3 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              >
                <option value="landscape">Paysage 16:10</option>
                <option value="square">Carré 1:1</option>
                <option value="portrait">Portrait 3:4</option>
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Sauvegarde & Réinitialisation
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Téléchargez vos paramètres et votre catalogue ou restaurez la configuration locale d’origine GIS.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleExportBackup}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Exporter sauvegarde JSON
              </button>
              {canEditStoreConfig && (
                <button
                  type="button"
                  onClick={onResetAll}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Réinitialiser par défaut
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {editingProduct && (
        <ProductEditorModal
          key={editingProduct.id}
          isOpen={true}
          initialProduct={editingProduct}
          settings={settings}
          currentRole={currentRole}
          onClose={() => setEditingProduct(null)}
          onSave={(saved) => {
            onUpdateProduct(saved);
            flashSaved();
          }}
        />
      )}
    </div>
  );
};
