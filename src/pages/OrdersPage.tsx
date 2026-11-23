import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
} from 'lucide-react';
import {
  Invoice,
  InvoiceDocType,
  InvoiceStatus,
  Member,
  Product,
  StoreSettings,
  UserRole,
} from '../types/app';
import {
  buildInvoiceWhatsAppSummary,
  formatFcfa,
  getDeliveryLabel,
  getInvoiceStatusLabel,
  getPaymentLabel,
  getPoleLabel,
} from '../utils/formatters';
import {
  downloadInvoiceAsCsv,
  downloadInvoiceAsPdf,
  downloadInvoiceAsPng,
} from '../utils/invoiceDownload';
import { InvoiceEditorModal } from '../components/InvoiceEditorModal';
import { DeliveryTrackingPanel } from '../components/DeliveryTrackingPanel';
import { MonthlySalesChart } from '../components/MonthlySalesChart';

interface OrdersPageProps {
  invoices: Invoice[];
  products: Product[];
  members: Member[];
  settings: StoreSettings;
  currentUid: string;
  currentUserName: string;
  currentRole: UserRole;
  staffReaderUids: string[];
  onSaveInvoice: (invoice: Invoice, isNew: boolean) => void;
  onDeleteInvoice: (invoiceId: string) => void;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({
  invoices,
  products,
  members,
  settings,
  currentUid,
  currentUserName,
  currentRole,
  staffReaderUids,
  onSaveInvoice,
  onDeleteInvoice,
}) => {
  const [docTypeFilter, setDocTypeFilter] = useState<InvoiceDocType | 'all'>(
    'all'
  );
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>(
    'all'
  );
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    invoices[0]?.id ?? null
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editorTarget, setEditorTarget] = useState<Invoice | null | 'new'>(
    null
  );

  const canManageInvoices =
    currentRole === 'super_admin' ||
    currentRole === 'admin_patron' ||
    currentRole === 'caisse';

  const canLogisticsUpdate =
    canManageInvoices ||
    currentRole === 'chargeur' ||
    currentRole === 'chauffeur';

  const filteredInvoices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (docTypeFilter !== 'all' && inv.docType !== docTypeFilter) return false;
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (
        q &&
        !inv.code.toLowerCase().includes(q) &&
        !inv.customerName.toLowerCase().includes(q) &&
        !inv.customerPhone.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [invoices, docTypeFilter, statusFilter, query]);

  const activeInvoice =
    filteredInvoices.find((i) => i.id === selectedId) ??
    filteredInvoices[0] ??
    null;

  const handleCopySummary = async (inv: Invoice) => {
    const summary = buildInvoiceWhatsAppSummary(
      inv,
      settings.poster.companyName,
      settings.currencyLabel
    );
    try {
      await navigator.clipboard.writeText(summary);
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  };

  const handleQuickStatus = (inv: Invoice, status: InvoiceStatus) => {
    const updated: Invoice = {
      ...inv,
      status,
      assignedLoaderName:
        currentRole === 'chargeur' && !inv.assignedLoaderName
          ? currentUserName
          : inv.assignedLoaderName,
      assignedDriverName:
        currentRole === 'chauffeur' && !inv.assignedDriverName
          ? currentUserName
          : inv.assignedDriverName,
      updatedAt: new Date().toISOString(),
    };
    onSaveInvoice(updated, false);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 space-y-8">
      <div className="no-print flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Facturation, Devis & Préparation / Livraison
          </p>
          <h1 className="font-display font-extrabold text-3xl text-slate-900 dark:text-white tracking-tight mt-1">
            Factures & Devis
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setEditorTarget('new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#D9531E] hover:bg-[#B84315] rounded-lg transition-colors cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Facture / Devis
        </button>
      </div>

      {/* Graphique Recharts : volume des ventes par jour sur le mois en cours */}
      <MonthlySalesChart invoices={invoices} settings={settings} />

      {/* Suivi de livraison & optimisation des trajets chauffeurs */}
      <DeliveryTrackingPanel
        invoices={invoices}
        members={members}
        settings={settings}
        selectedInvoiceId={activeInvoice?.id ?? null}
        canLogisticsUpdate={canLogisticsUpdate}
        onSelectInvoice={(id) => setSelectedId(id)}
        onSaveInvoice={onSaveInvoice}
        onQuickStatus={handleQuickStatus}
      />

      {/* Filters */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-200/75 dark:bg-slate-800 rounded-lg">
            {(
              [
                { id: 'all', label: 'Tous' },
                { id: 'facture', label: 'Factures' },
                { id: 'devis', label: 'Devis' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDocTypeFilter(t.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  docTypeFilter === t.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as InvoiceStatus | 'all')
            }
            aria-label="Filtrer par statut"
            className="px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
          >
            <option value="all">Tous les statuts</option>
            <option value="brouillon">Brouillon</option>
            <option value="en_attente">En attente</option>
            <option value="en_preparation">En préparation / Chargement</option>
            <option value="prete_livree">Prête / Livrée</option>
            <option value="payee">Payée</option>
            <option value="annulee">Annulée</option>
          </select>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Code, client ou téléphone..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
          />
        </div>
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
          <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
          <p className="font-display font-semibold text-base">
            Aucune facture ou devis trouvé
          </p>
          <button
            type="button"
            onClick={() => setEditorTarget('new')}
            className="px-4 py-2 text-xs font-semibold bg-[#0F2342] text-white rounded-lg cursor-pointer"
          >
            Créer un document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* List */}
          <div className="no-print lg:col-span-5 space-y-3">
            {filteredInvoices.map((inv) => {
              const isSelected = activeInvoice?.id === inv.id;
              return (
                <button
                  key={inv.id}
                  type="button"
                  onClick={() => setSelectedId(inv.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 border-[#0F2342] dark:border-[#D9531E]'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tabular font-bold text-sm">
                      {inv.code}
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {inv.docType === 'facture' ? 'Facture' : 'Devis'} ·{' '}
                      {getInvoiceStatusLabel(inv.status)}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                    {inv.customerName}
                  </p>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2">
                    <span className="font-mono-tabular">
                      Ciment/Quinc. {formatFcfa(inv.cimentQuincaillerieSubtotal, '')} · Bois.{' '}
                      {formatFcfa(inv.boissonsSubtotal, '')}
                    </span>
                    <span className="font-mono-tabular font-bold text-slate-900 dark:text-white">
                      {formatFcfa(inv.totalFcfa, settings.currencyLabel)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail & Download / Edit / Delete */}
          {activeInvoice && (
            <div className="print-only-poster lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {settings.poster.companyName} ·{' '}
                    {activeInvoice.docType === 'facture'
                      ? 'Facture'
                      : 'Devis estimatif'}
                  </p>
                  <h2 className="font-display font-extrabold text-2xl font-mono-tabular mt-0.5">
                    {activeInvoice.code}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Émis par {activeInvoice.createdByName} ·{' '}
                    {new Date(activeInvoice.createdAt).toLocaleDateString(
                      'fr-FR',
                      { day: '2-digit', month: 'short', year: 'numeric' }
                    )}
                  </p>
                </div>

                <div className="no-print flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      downloadInvoiceAsPdf(activeInvoice, settings)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0F2342] text-white rounded-lg hover:bg-[#1A355E] cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    Exporter PDF
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadInvoiceAsPng(activeInvoice, settings)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    PNG
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadInvoiceAsCsv(activeInvoice, settings)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Imprimer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopySummary(activeInvoice)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {copiedId === activeInvoice.id ? (
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Client
                  </p>
                  <p className="font-semibold">{activeInvoice.customerName}</p>
                  {activeInvoice.customerPhone && (
                    <p className="font-mono-tabular text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {activeInvoice.customerPhone}
                    </p>
                  )}
                  {activeInvoice.customerAddress && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {activeInvoice.customerAddress}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Logistique & Règlement
                  </p>
                  <p className="font-semibold">
                    {getDeliveryLabel(activeInvoice.deliveryMode)}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    {getPaymentLabel(activeInvoice.paymentMethod)}
                  </p>
                  {(activeInvoice.assignedLoaderName ||
                    activeInvoice.assignedDriverName) && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {activeInvoice.assignedLoaderName
                        ? `Chargeur : ${activeInvoice.assignedLoaderName}`
                        : ''}
                      {activeInvoice.assignedLoaderName &&
                      activeInvoice.assignedDriverName
                        ? ' · '
                        : ''}
                      {activeInvoice.assignedDriverName
                        ? `Chauffeur : ${activeInvoice.assignedDriverName}`
                        : ''}
                    </p>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/70">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Article</th>
                      <th className="py-2.5 px-3 font-semibold">Pôle</th>
                      <th className="py-2.5 px-3 font-semibold text-right">
                        Qté
                      </th>
                      <th className="py-2.5 px-3 font-semibold text-right">
                        P.U.
                      </th>
                      <th className="py-2.5 px-3 font-semibold text-right">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeInvoice.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-3">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {item.unitLabel}
                            {item.isWholesale ? ' · Tarif gros' : ''}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 text-xs font-semibold">
                          {getPoleLabel(item.pole)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular">
                          {formatFcfa(
                            item.appliedUnitPrice,
                            settings.currencyLabel
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular font-semibold">
                          {formatFcfa(item.lineTotal, settings.currencyLabel)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Separated Subtotals */}
              <div className="space-y-1.5 text-sm border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">
                    Sous-total Ciment & Quincaillerie
                  </span>
                  <span className="font-mono-tabular font-semibold text-[#D9531E]">
                    {formatFcfa(
                      activeInvoice.cimentQuincaillerieSubtotal,
                      settings.currencyLabel
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">
                    Sous-total Boissons
                  </span>
                  <span className="font-mono-tabular font-semibold text-[#0369A1] dark:text-[#38BDF8]">
                    {formatFcfa(
                      activeInvoice.boissonsSubtotal,
                      settings.currencyLabel
                    )}
                  </span>
                </div>
                {activeInvoice.discountFcfa > 0 && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                    <span>Remise</span>
                    <span className="font-mono-tabular">
                      -{formatFcfa(activeInvoice.discountFcfa, settings.currencyLabel)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Livraison</span>
                  <span className="font-mono-tabular">
                    {activeInvoice.deliveryFeeFcfa === 0
                      ? 'Offerte / Retrait'
                      : formatFcfa(
                          activeInvoice.deliveryFeeFcfa,
                          settings.currencyLabel
                        )}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span>Total TTC</span>
                  <span className="font-mono-tabular">
                    {formatFcfa(
                      activeInvoice.totalFcfa,
                      settings.currencyLabel
                    )}
                  </span>
                </div>
              </div>

              {/* Actions: Edit, Delete, Status progression */}
              <div className="no-print pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                {canLogisticsUpdate && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: 'en_attente', label: 'En attente' },
                        { id: 'en_preparation', label: 'Chargement' },
                        { id: 'prete_livree', label: 'Livrée' },
                        { id: 'payee', label: 'Payée' },
                      ] as const
                    ).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleQuickStatus(activeInvoice, st.id)}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-md border cursor-pointer ${
                          activeInvoice.status === st.id
                            ? 'bg-[#0F2342] text-white border-[#0F2342] dark:bg-[#D9531E] dark:border-[#D9531E]'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                )}

                {canManageInvoices && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditorTarget(activeInvoice)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteInvoice(activeInvoice.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {editorTarget !== null && (
        <InvoiceEditorModal
          key={editorTarget === 'new' ? 'new' : editorTarget.id}
          isOpen={true}
          initialInvoice={editorTarget === 'new' ? null : editorTarget}
          products={products}
          members={members}
          settings={settings}
          currentUid={currentUid}
          currentUserName={currentUserName}
          staffReaderUids={staffReaderUids}
          onClose={() => setEditorTarget(null)}
          onSave={onSaveInvoice}
        />
      )}
    </div>
  );
};
