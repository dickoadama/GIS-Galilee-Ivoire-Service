import React, { useMemo, useState } from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import { ALL_STAFF_ROLES, AuditLog, UserRole } from '../types/app';
import { getRoleLabel } from '../utils/formatters';

interface SuperAdminAuditLogPanelProps {
  auditLogs: AuditLog[];
}

type AuditCategory =
  | 'all'
  | 'catalogue_prix'
  | 'factures'
  | 'membres'
  | 'systeme';

type AuditOpType = 'all' | 'create' | 'update' | 'delete';
type AuditPeriodFilter = 'all' | 'today' | '7d' | '30d' | 'custom';

interface ClassifiedLog {
  log: AuditLog;
  category: Exclude<AuditCategory, 'all'>;
  categoryLabel: string;
  opType: Exclude<AuditOpType, 'all'>;
  opLabel: string;
  timestampMs: number;
}

const PAGE_SIZE = 25;

function classifyAuditLog(log: AuditLog): ClassifiedLog {
  const act = log.action.toLowerCase();
  const target = (log.targetLabel || '').toLowerCase();
  const combined = `${act} ${target}`;

  let category: Exclude<AuditCategory, 'all'> = 'systeme';
  let categoryLabel = 'Système & Comms';

  if (
    act.includes('facture') ||
    act.includes('devis') ||
    target.includes('fac-') ||
    target.includes('dev-')
  ) {
    category = 'factures';
    categoryLabel = 'Factures & Devis';
  } else if (
    act.includes('membre') ||
    act.includes('admin') ||
    act.includes('rôle') ||
    act.includes('role')
  ) {
    category = 'membres';
    categoryLabel = 'Membres & Rôles';
  } else if (
    act.includes('prix') ||
    act.includes('produit') ||
    act.includes('article') ||
    act.includes('stock') ||
    act.includes('catalogue')
  ) {
    category = 'catalogue_prix';
    categoryLabel = 'Prix & Catalogue';
  } else if (combined.includes('paramètre') || combined.includes('parametre')) {
    category = 'systeme';
    categoryLabel = 'Paramètres & Comms';
  }

  let opType: Exclude<AuditOpType, 'all'> = 'update';
  let opLabel = 'Modification';

  if (
    act.includes('suppression') ||
    act.includes('supprim') ||
    act.includes('retrait')
  ) {
    opType = 'delete';
    opLabel = 'Suppression';
  } else if (
    act.includes('création') ||
    act.includes('creation') ||
    act.includes('ajout')
  ) {
    opType = 'create';
    opLabel = 'Création / Ajout';
  }

  const parsedMs = new Date(log.createdAt).getTime();

  return {
    log,
    category,
    categoryLabel,
    opType,
    opLabel,
    timestampMs: Number.isNaN(parsedMs) ? 0 : parsedMs,
  };
}

function csvEscape(value: string): string {
  const clean = value.replace(/"/g, '""');
  return `"${clean}"`;
}

export const SuperAdminAuditLogPanel: React.FC<SuperAdminAuditLogPanelProps> = ({
  auditLogs,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory>('all');
  const [opFilter, setOpFilter] = useState<AuditOpType>('all');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [periodFilter, setPeriodFilter] = useState<AuditPeriodFilter>('all');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [inspectedLog, setInspectedLog] = useState<ClassifiedLog | null>(null);

  const classifiedLogs = useMemo(
    () => auditLogs.map(classifyAuditLog),
    [auditLogs]
  );

  const summaryCounts = useMemo(() => {
    let priceCatalogue = 0;
    let invoicesDocs = 0;
    let membersCount = 0;
    let deletionsCount = 0;

    for (const item of classifiedLogs) {
      if (item.category === 'catalogue_prix') priceCatalogue += 1;
      if (item.category === 'factures') invoicesDocs += 1;
      if (item.category === 'membres') membersCount += 1;
      if (item.opType === 'delete') deletionsCount += 1;
    }

    return {
      total: classifiedLogs.length,
      priceCatalogue,
      invoicesDocs,
      membersCount,
      deletionsCount,
    };
  }, [classifiedLogs]);

  const filteredLogs = useMemo(() => {
    const tokens = searchQuery
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    const customFromMs = customFromDate
      ? new Date(`${customFromDate}T00:00:00`).getTime()
      : null;
    const customToMs = customToDate
      ? new Date(`${customToDate}T23:59:59.999`).getTime()
      : null;

    return classifiedLogs.filter((entry) => {
      if (categoryFilter !== 'all' && entry.category !== categoryFilter) {
        return false;
      }
      if (opFilter !== 'all' && entry.opType !== opFilter) {
        return false;
      }
      if (roleFilter !== 'all' && entry.log.actorRole !== roleFilter) {
        return false;
      }

      if (periodFilter === 'today' && entry.timestampMs < startOfToday) {
        return false;
      }
      if (periodFilter === '7d' && entry.timestampMs < sevenDaysAgo) {
        return false;
      }
      if (periodFilter === '30d' && entry.timestampMs < thirtyDaysAgo) {
        return false;
      }
      if (periodFilter === 'custom') {
        if (customFromMs !== null && entry.timestampMs < customFromMs) {
          return false;
        }
        if (customToMs !== null && entry.timestampMs > customToMs) {
          return false;
        }
      }

      if (tokens.length > 0) {
        const haystack = [
          entry.log.action,
          entry.log.targetLabel || '',
          entry.log.actorName,
          getRoleLabel(entry.log.actorRole),
          entry.log.actorUid,
          entry.log.id,
          entry.categoryLabel,
          entry.opLabel,
        ]
          .join(' ')
          .toLowerCase();

        for (const t of tokens) {
          if (!haystack.includes(t)) return false;
        }
      }

      return true;
    });
  }, [
    classifiedLogs,
    searchQuery,
    categoryFilter,
    opFilter,
    roleFilter,
    periodFilter,
    customFromDate,
    customToDate,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedLogs = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, safePage]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    categoryFilter !== 'all' ||
    opFilter !== 'all' ||
    roleFilter !== 'all' ||
    periodFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setOpFilter('all');
    setRoleFilter('all');
    setPeriodFilter('all');
    setCustomFromDate('');
    setCustomToDate('');
    setCurrentPage(1);
  };

  const handleExportCsv = () => {
    const headers = [
      'ID Log',
      'Date et Heure',
      'Acteur',
      'UID Acteur',
      'Role',
      'Categorie',
      'Operation',
      'Action',
      'Cible / Details',
    ];
    const rows = filteredLogs.map((entry) => [
      csvEscape(entry.log.id),
      csvEscape(new Date(entry.log.createdAt).toLocaleString('fr-FR')),
      csvEscape(entry.log.actorName),
      csvEscape(entry.log.actorUid),
      csvEscape(getRoleLabel(entry.log.actorRole)),
      csvEscape(entry.categoryLabel),
      csvEscape(entry.opLabel),
      csvEscape(entry.log.action),
      csvEscape(entry.log.targetLabel || ''),
    ]);

    const csvContent =
      '\uFEFF' + [headers.map(csvEscape).join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gis-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderOpIcon = (opType: ClassifiedLog['opType']) => {
    if (opType === 'delete') {
      return <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />;
    }
    if (opType === 'create') {
      return <Plus className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />;
    }
    return <Pencil className="w-3.5 h-3.5 text-[#D9531E] shrink-0" />;
  };

  return (
    <section
      aria-label="Historique complet d’audit système"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
    >
      {/* Header + Export */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Collection Firestore : auditLogs</span>
            <span aria-hidden="true">·</span>
            <span>Piste d’audit immuable</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              {filteredLogs.length} / {auditLogs.length} événement(s)
            </span>
          </div>
          <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white mt-1">
            Historique complet des actions système
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#D9531E] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Réinitialiser
            </button>
          )}
          <button
            type="button"
            disabled={filteredLogs.length === 0}
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F2342] hover:bg-[#1A355E] dark:bg-[#D9531E] dark:hover:bg-[#B84315] rounded-lg transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter CSV ({filteredLogs.length})
          </button>
        </div>
      </div>

      {/* Audit KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800">
        <div className="px-6 py-4 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total actions tracées
          </p>
          <p className="font-mono-tabular font-extrabold text-lg text-slate-900 dark:text-white">
            {summaryCounts.total}
          </p>
        </div>

        <div className="px-6 py-4 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Prix, stocks & catalogue
          </p>
          <p className="font-mono-tabular font-extrabold text-lg text-[#D9531E]">
            {summaryCounts.priceCatalogue}
          </p>
        </div>

        <div className="px-6 py-4 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Factures, devis & suppressions
          </p>
          <p className="font-mono-tabular font-extrabold text-lg text-[#0369A1] dark:text-[#38BDF8]">
            {summaryCounts.invoicesDocs}{' '}
            <span className="text-xs font-semibold text-red-600 dark:text-red-400">
              ({summaryCounts.deletionsCount} suppr.)
            </span>
          </p>
        </div>

        <div className="px-6 py-4 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Membres, admins & rôles
          </p>
          <p className="font-mono-tabular font-extrabold text-lg text-slate-900 dark:text-white">
            {summaryCounts.membersCount}
          </p>
        </div>
      </div>

      {/* Search & Multi-Facet Filter Bar */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/35 space-y-4">
        {/* Category Segmented Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/75 dark:bg-slate-800 rounded-lg self-start w-fit">
          {(
            [
              { id: 'all', label: `Toutes (${summaryCounts.total})` },
              {
                id: 'catalogue_prix',
                label: `Prix & Catalogue (${summaryCounts.priceCatalogue})`,
              },
              {
                id: 'factures',
                label: `Factures & Devis (${summaryCounts.invoicesDocs})`,
              },
              {
                id: 'membres',
                label: `Membres & Rôles (${summaryCounts.membersCount})`,
              },
              { id: 'systeme', label: 'Paramètres & Comms' },
            ] as { id: AuditCategory; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setCategoryFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                categoryFilter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search + Operation Type + Actor Role + Period */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label
              htmlFor="audit-search-input"
              className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
            >
              Rechercher dans l’historique (action, cible, acteur, code facture...)
            </label>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                id="audit-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Ex. Modification prix, FAC-GIS, Kouamé, Suppression..."
                className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#0F2342] dark:focus:border-[#D9531E]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  aria-label="Effacer la recherche"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="audit-op-filter"
              className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
            >
              Type d’opération
            </label>
            <select
              id="audit-op-filter"
              value={opFilter}
              onChange={(e) => {
                setOpFilter(e.target.value as AuditOpType);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option value="all">Toutes opérations</option>
              <option value="create">Créations / Ajouts</option>
              <option value="update">Modifications</option>
              <option value="delete">Suppressions</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="audit-role-filter"
              className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
            >
              Rôle de l’acteur
            </label>
            <select
              id="audit-role-filter"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as UserRole | 'all');
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option value="all">Tous les rôles</option>
              {ALL_STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {getRoleLabel(r)}
                </option>
              ))}
              <option value="client">Client</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="audit-period-filter"
              className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
            >
              Période
            </label>
            <select
              id="audit-period-filter"
              value={periodFilter}
              onChange={(e) => {
                setPeriodFilter(e.target.value as AuditPeriodFilter);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option value="all">Tout l’historique</option>
              <option value="today">Aujourd’hui</option>
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
              <option value="custom">Plage personnalisée</option>
            </select>
          </div>
        </div>

        {periodFilter === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 max-w-md">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Du
              </label>
              <input
                type="date"
                value={customFromDate}
                onChange={(e) => {
                  setCustomFromDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-1.5 text-xs font-mono-tabular bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Au
              </label>
              <input
                type="date"
                value={customToDate}
                onChange={(e) => {
                  setCustomToDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-1.5 text-xs font-mono-tabular bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>
        )}
      </div>

      {/* Audit Table / Empty States */}
      {auditLogs.length === 0 ? (
        <div className="p-12 text-center space-y-2">
          <Activity className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
          <p className="font-display font-bold text-base text-slate-900 dark:text-white">
            Aucun événement enregistré dans auditLogs
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Chaque modification de prix ou de stock, suppression de facture/devis, création de membre ou changement de paramètres apparaîtra ici en temps réel.
          </p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 text-center space-y-3">
          <Search className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
          <p className="font-display font-bold text-base text-slate-900 dark:text-white">
            Aucune entrée d’audit ne correspond à ces filtres
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#0F2342] dark:bg-[#D9531E] rounded-lg cursor-pointer"
          >
            Afficher tout l’historique
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-3 px-5 font-semibold whitespace-nowrap">
                    Date & Heure
                  </th>
                  <th className="py-3 px-4 font-semibold">Acteur & Rôle</th>
                  <th className="py-3 px-4 font-semibold">Catégorie · Type</th>
                  <th className="py-3 px-4 font-semibold">Action effectuée</th>
                  <th className="py-3 px-4 font-semibold">Cible / Détails</th>
                  <th className="py-3 px-5 font-semibold text-right">
                    Détails
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedLogs.map((entry) => {
                  const { log, categoryLabel, opType, opLabel } = entry;
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-5 font-mono-tabular text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {log.actorName || 'Système'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {getRoleLabel(log.actorRole)}
                        </p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {renderOpIcon(opType)}
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {categoryLabel}
                          </span>
                          <span
                            aria-hidden="true"
                            className="text-slate-300 dark:text-slate-600"
                          >
                            ·
                          </span>
                          <span
                            className={`font-semibold ${
                              opType === 'delete'
                                ? 'text-red-600 dark:text-red-400'
                                : opType === 'create'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {opLabel}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        {log.targetLabel || '—'}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => setInspectedLog(entry)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer whitespace-nowrap"
                        >
                          <Eye className="w-3 h-3" />
                          Inspecter
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-mono-tabular">
              Page {safePage} sur {totalPages} · Affichage de{' '}
              {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filteredLogs.length)} sur{' '}
              {filteredLogs.length}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer whitespace-nowrap"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Précédent
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer whitespace-nowrap"
              >
                Suivant
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Detailed Audit Log Inspector Modal */}
      {inspectedLog && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-inspector-title"
        >
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-[#D9531E] shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Document auditLogs · {inspectedLog.categoryLabel}
                  </p>
                  <h3
                    id="audit-inspector-title"
                    className="font-display font-bold text-base"
                  >
                    Détail complet de l’événement
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedLog(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Fermer les détails d’audit"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Acteur</p>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                    {inspectedLog.log.actorName || 'Système'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Rôle</p>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                    {getRoleLabel(inspectedLog.log.actorRole)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Horodatage local
                  </p>
                  <p className="font-mono-tabular text-slate-900 dark:text-white mt-0.5">
                    {new Date(inspectedLog.log.createdAt).toLocaleString(
                      'fr-FR'
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Opération
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                    {renderOpIcon(inspectedLog.opType)}
                    {inspectedLog.opLabel}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Action</p>
                  <p className="font-semibold text-sm text-slate-900 dark:text-white mt-0.5">
                    {inspectedLog.log.action}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Cible / Détails enregistrés
                  </p>
                  <p className="text-sm text-slate-800 dark:text-slate-200 mt-0.5 leading-relaxed">
                    {inspectedLog.log.targetLabel || 'Aucun détail complémentaire'}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 gap-1.5 text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                  <p>ID Document : {inspectedLog.log.id}</p>
                  <p>UID Acteur : {inspectedLog.log.actorUid}</p>
                  <p>ISO 8601 : {inspectedLog.log.createdAt}</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedLog(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0F2342] dark:bg-[#D9531E] rounded-lg cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
