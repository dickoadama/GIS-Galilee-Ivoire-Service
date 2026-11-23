import React, { useState } from 'react';
import {
  Activity,
  Calculator,
  FileText,
  Layers,
  MessageSquare,
  Plus,
  Settings,
  Shield,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import {
  ALL_STAFF_ROLES,
  AuditLog,
  Invoice,
  Member,
  PageId,
  Product,
  StoreSettings,
  UserRole,
  WORKER_ROLES,
} from '../types/app';
import { formatFcfa, getRoleLabel } from '../utils/formatters';
import { SuperAdminSalesCharts } from '../components/SuperAdminSalesCharts';
import { SuperAdminAuditLogPanel } from '../components/SuperAdminAuditLogPanel';
import { SuperAdminMarginPanel } from '../components/SuperAdminMarginPanel';
import { ProductEditorModal } from '../components/ProductEditorModal';

interface SuperAdminPageProps {
  members: Member[];
  products: Product[];
  invoices: Invoice[];
  auditLogs: AuditLog[];
  settings: StoreSettings;
  currentUid: string;
  previewRole: UserRole | null;
  onSetPreviewRole: (role: UserRole | null) => void;
  onSaveMember: (member: Member, isNew: boolean) => void;
  onDeleteMember: (member: Member) => void;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onNavigate: (page: PageId) => void;
}

const PERMISSION_MATRIX: {
  module: string;
  super_admin: string;
  admin_patron: string;
  caisse: string;
  chargeur: string;
  chauffeur: string;
  gerant_boisson: string;
  gerant_ciment: string;
}[] = [
  {
    module: 'Création & Gestion des Admins',
    super_admin: 'Complet',
    admin_patron: 'Non',
    caisse: 'Non',
    chargeur: 'Non',
    chauffeur: 'Non',
    gerant_boisson: 'Non',
    gerant_ciment: 'Non',
  },
  {
    module: 'Gestion Employés & Attribution Rôles',
    super_admin: 'Complet',
    admin_patron: 'Ouvriers',
    caisse: 'Lecture',
    chargeur: 'Lecture',
    chauffeur: 'Lecture',
    gerant_boisson: 'Lecture',
    gerant_ciment: 'Lecture',
  },
  {
    module: 'Factures & Devis (CRUD + DL)',
    super_admin: 'Complet',
    admin_patron: 'Complet',
    caisse: 'Complet',
    chargeur: 'Statut',
    chauffeur: 'Statut',
    gerant_boisson: 'Lecture',
    gerant_ciment: 'Lecture',
  },
  {
    module: 'Stock & Prix Ciment / Quinc.',
    super_admin: 'Complet',
    admin_patron: 'Complet',
    caisse: 'Sorties',
    chargeur: 'Lecture',
    chauffeur: 'Lecture',
    gerant_boisson: 'Lecture',
    gerant_ciment: 'Complet',
  },
  {
    module: 'Stock & Prix Boissons',
    super_admin: 'Complet',
    admin_patron: 'Complet',
    caisse: 'Sorties',
    chargeur: 'Lecture',
    chauffeur: 'Lecture',
    gerant_boisson: 'Complet',
    gerant_ciment: 'Lecture',
  },
  {
    module: 'Conversations Équipe',
    super_admin: 'Complet',
    admin_patron: 'Complet',
    caisse: 'Complet',
    chargeur: 'Complet',
    chauffeur: 'Complet',
    gerant_boisson: 'Complet',
    gerant_ciment: 'Complet',
  },
];

export const SuperAdminPage: React.FC<SuperAdminPageProps> = ({
  members,
  products,
  invoices,
  auditLogs,
  settings,
  currentUid,
  previewRole,
  onSetPreviewRole,
  onSaveMember,
  onDeleteMember,
  onAddProduct,
  onUpdateProduct,
  onNavigate,
}) => {
  const [activeSection, setActiveSection] = useState<
    'overview' | 'margins' | 'audit'
  >('overview');
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const admins = members.filter((m) => m.role === 'admin_patron');
  const workers = members.filter((m) => WORKER_ROLES.includes(m.role));

  const cimentQuincTotal = invoices.reduce(
    (sum, i) => sum + i.cimentQuincaillerieSubtotal,
    0
  );
  const boissonsTotal = invoices.reduce(
    (sum, i) => sum + i.boissonsSubtotal,
    0
  );

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (adminName.trim().length < 2) {
      setFormError('Veuillez saisir le nom complet de l’Admin (Patron).');
      return;
    }
    const cleanEmail = adminEmail.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      setFormError('Veuillez saisir une adresse e-mail Google valide.');
      return;
    }
    const alreadyExists = members.some(
      (m) => m.email.toLowerCase() === cleanEmail
    );
    if (alreadyExists) {
      setFormError(
        'Un membre existe déjà avec cet e-mail. Modifiez son rôle dans Membres & Rôles.'
      );
      return;
    }

    const viewerUids = Array.from(
      new Set([
        currentUid,
        ...members.map((m) => m.uid).filter((x): x is string => Boolean(x)),
      ])
    ).slice(0, 30);

    const now = new Date().toISOString();
    const newAdmin: Member = {
      id: `adm-${Date.now()}`,
      fullName: adminName.trim(),
      email: cleanEmail,
      phone: adminPhone.trim(),
      role: 'admin_patron',
      active: true,
      assignedByUid: currentUid,
      staffViewerUids: viewerUids,
      createdAt: now,
      updatedAt: now,
    };

    onSaveMember(newAdmin, true);
    setAdminName('');
    setAdminEmail('');
    setAdminPhone('');
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-[#D9531E]">
            Console Créateur · Accès Universel Super Admin
          </p>
          <h1 className="font-display font-extrabold text-3xl text-slate-900 dark:text-white tracking-tight mt-1">
            Super Admin — Création des Admins & Supervision
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNewProductModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#D9531E] text-white rounded-lg hover:bg-[#B84315] cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouvel article
          </button>
          <button
            type="button"
            onClick={() => onNavigate('members')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#0F2342] text-white rounded-lg hover:bg-[#1A355E] cursor-pointer whitespace-nowrap"
          >
            <Users className="w-3.5 h-3.5" />
            Tous les Employés ({workers.length})
          </button>
          <button
            type="button"
            onClick={() => onNavigate('invoices')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" />
            Toutes les Factures
          </button>
        </div>
      </div>

      {/* Dedicated Section Switcher */}
      <div
        role="tablist"
        aria-label="Vues de la console Super Admin"
        className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/75 dark:bg-slate-800 rounded-lg"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'overview'}
          onClick={() => setActiveSection('overview')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeSection === 'overview'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Supervision & Ventes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'margins'}
          onClick={() => setActiveSection('margins')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeSection === 'margins'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calculator className="w-3.5 h-3.5 text-[#D9531E]" />
          Calculateur de Marge & Prix ({products.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'audit'}
          onClick={() => setActiveSection('audit')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeSection === 'audit'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-[#D9531E]" />
          Historique d’audit complet ({auditLogs.length})
        </button>
      </div>

      {activeSection === 'audit' ? (
        <SuperAdminAuditLogPanel auditLogs={auditLogs} />
      ) : activeSection === 'margins' ? (
        <SuperAdminMarginPanel
          products={products}
          settings={settings}
          onUpdateProduct={onUpdateProduct}
          onOpenNewProduct={() => setIsNewProductModalOpen(true)}
        />
      ) : (
        <>
          {/* Separated Revenue & Operational Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Volume Ciment & Quincaillerie
          </p>
          <p className="font-mono-tabular font-extrabold text-xl text-[#D9531E]">
            {formatFcfa(cimentQuincTotal, settings.currencyLabel)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Volume Vente de Boissons
          </p>
          <p className="font-mono-tabular font-extrabold text-xl text-[#0369A1] dark:text-[#38BDF8]">
            {formatFcfa(boissonsTotal, settings.currencyLabel)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Admins (Patrons) · Employés
          </p>
          <p className="font-mono-tabular font-extrabold text-xl text-slate-900 dark:text-white">
            {admins.length} · {workers.length}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Factures · Catalogue
          </p>
          <p className="font-mono-tabular font-extrabold text-xl text-slate-900 dark:text-white">
            {invoices.length} · {products.length} art.
          </p>
        </div>
      </div>

      {/* Data Visualization: Monthly Sales by Pole (Recharts) */}
      <SuperAdminSalesCharts
        invoices={invoices}
        currencyLabel={settings.currencyLabel}
        isDark={settings.theme === 'dark'}
        onNavigateInvoices={() => onNavigate('invoices')}
      />

      {/* Dedicated Section: Create & Manage Admins (Patrons) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              Créer un Admin (Patron)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              Chaque Admin créé ici reçoit automatiquement le rôle{' '}
              <strong>Admin (Patron)</strong> dès sa connexion avec son adresse Google. Il pourra à son tour créer ses employés et leur attribuer leurs rôles (Caisse, Chargeur, Chauffeur, Gérant Boisson, Gérant Ciment).
            </p>
          </div>

          <form
            onSubmit={handleCreateAdmin}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end"
          >
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nom complet de l’Admin *
              </label>
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Ex. Kouassi Jean-Marc"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                E-mail Google de connexion *
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="patron@gmail.com"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                placeholder="07 06 04 49 79"
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#D9531E] hover:bg-[#B84315] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Créer cet Admin (Patron)
            </button>
          </form>

          {formError && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              {formError}
            </p>
          )}
        </div>

        {/* Admins List */}
        {admins.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Aucun Admin (Patron) créé pour le moment. Ajoutez-en un ci-dessus pour déléguer la gestion des employés.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-3 px-4 font-semibold">Admin (Patron)</th>
                  <th className="py-3 px-4 font-semibold">Téléphone</th>
                  <th className="py-3 px-4 font-semibold">Connexion</th>
                  <th className="py-3 px-4 font-semibold text-center">
                    Employés gérés
                  </th>
                  <th className="py-3 px-4 font-semibold text-center">Statut</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {admins.map((adm) => {
                  const managedCount = adm.uid
                    ? workers.filter((w) => w.assignedByUid === adm.uid).length
                    : 0;
                  return (
                    <tr key={adm.id}>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {adm.fullName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {adm.email}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-xs text-slate-600 dark:text-slate-300">
                        {adm.phone || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {adm.uid ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                            Compte Google lié
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">
                            En attente de 1re connexion
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono-tabular font-semibold">
                        {managedCount}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-xs font-semibold ${
                            adm.active
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {adm.active ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onSaveMember(
                                {
                                  ...adm,
                                  active: !adm.active,
                                  updatedAt: new Date().toISOString(),
                                },
                                false
                              )
                            }
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                            title={adm.active ? 'Suspendre' : 'Réactiver'}
                          >
                            {adm.active ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteMember(adm)}
                            className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                            title="Supprimer cet Admin"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Role Preview Simulator */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-lg">
              Contrôle & Aperçu instantané par rôle
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Testez exactement l’interface vue par un Admin (Patron) ou par chaque employé (Caisse, Chargeur, Chauffeur, Gérants), sans perdre vos droits Super Admin.
            </p>
          </div>
          {previewRole && (
            <button
              type="button"
              onClick={() => onSetPreviewRole(null)}
              className="px-3.5 py-2 text-xs font-semibold bg-[#D9531E] text-white rounded-lg cursor-pointer self-start"
            >
              Revenir en mode Super Admin
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {ALL_STAFF_ROLES.map((r) => {
            const active = (previewRole ?? 'super_admin') === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() =>
                  onSetPreviewRole(r === 'super_admin' ? null : r)
                }
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#0F2342] text-white border-[#0F2342] dark:bg-[#D9531E] dark:border-[#D9531E]'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
              >
                {getRoleLabel(r)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Direct Access to All Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            page: 'catalog' as PageId,
            icon: Layers,
            title: 'Tarifs & Stocks',
            desc: 'Ciment, Quincaillerie & Boissons',
          },
          {
            page: 'invoices' as PageId,
            icon: FileText,
            title: 'Factures & Devis',
            desc: 'Créer, modifier, supprimer, télécharger',
          },
          {
            page: 'chat' as PageId,
            icon: MessageSquare,
            title: 'Messagerie Équipe',
            desc: 'Superviser toutes les discussions',
          },
          {
            page: 'settings' as PageId,
            icon: Settings,
            title: 'Paramètres Globaux',
            desc: 'Identité, horaires, paiements, thème',
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.page}
              type="button"
              onClick={() => onNavigate(card.page)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#0F2342] dark:hover:border-[#D9531E] rounded-xl p-5 text-left space-y-2 transition-colors cursor-pointer"
            >
              <Icon className="w-5 h-5 text-[#D9531E]" />
              <p className="font-display font-bold text-base">{card.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {card.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* RBAC Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#D9531E]" />
          <h2 className="font-display font-bold text-lg">
            Matrice des droits par rôle
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/70">
              <tr>
                <th className="py-3 px-4 font-semibold">Module</th>
                <th className="py-3 px-3 font-semibold">Super Admin</th>
                <th className="py-3 px-3 font-semibold">Admin (Patron)</th>
                <th className="py-3 px-3 font-semibold">Caisse</th>
                <th className="py-3 px-3 font-semibold">Chargeur</th>
                <th className="py-3 px-3 font-semibold">Chauffeur</th>
                <th className="py-3 px-3 font-semibold">Gér. Boisson</th>
                <th className="py-3 px-3 font-semibold">Gér. Ciment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {PERMISSION_MATRIX.map((row, idx) => (
                <tr key={idx}>
                  <td className="py-3 px-4 font-semibold">{row.module}</td>
                  <td className="py-3 px-3 text-emerald-700 dark:text-emerald-400 font-semibold">
                    {row.super_admin}
                  </td>
                  <td className="py-3 px-3">{row.admin_patron}</td>
                  <td className="py-3 px-3">{row.caisse}</td>
                  <td className="py-3 px-3">{row.chargeur}</td>
                  <td className="py-3 px-3">{row.chauffeur}</td>
                  <td className="py-3 px-3">{row.gerant_boisson}</td>
                  <td className="py-3 px-3">{row.gerant_ciment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Audit Log Summary + Link to Dedicated Console */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#D9531E]" />
            <h2 className="font-display font-bold text-lg">
              Dernières actions système ({auditLogs.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveSection('audit');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F2342] hover:bg-[#1A355E] dark:bg-[#D9531E] dark:hover:bg-[#B84315] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <Activity className="w-3.5 h-3.5" />
            Ouvrir l’historique d’audit complet
          </button>
        </div>
        {auditLogs.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 dark:text-slate-400">
            Les actions effectuées sur les admins, employés, factures, prix, stocks et paramètres apparaîtront ici en temps réel.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {auditLogs.slice(0, 8).map((log) => (
              <li
                key={log.id}
                className="px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {log.actorName}
                  </span>{' '}
                  <span className="text-slate-500">
                    ({getRoleLabel(log.actorRole)})
                  </span>{' '}
                  — {log.action}
                  {log.targetLabel ? ` : ${log.targetLabel}` : ''}
                </div>
                <span className="font-mono-tabular text-slate-400 shrink-0">
                  {new Date(log.createdAt).toLocaleString('fr-FR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
        </>
      )}

      {isNewProductModalOpen && (
        <ProductEditorModal
          isOpen={isNewProductModalOpen}
          initialProduct={null}
          settings={settings}
          currentRole="super_admin"
          onClose={() => setIsNewProductModalOpen(false)}
          onSave={(saved, isNew) => {
            if (isNew) {
              onAddProduct(saved);
            } else {
              onUpdateProduct(saved);
            }
          }}
        />
      )}
    </div>
  );
};
