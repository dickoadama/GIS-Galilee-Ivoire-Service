import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, FileText, TrendingUp } from 'lucide-react';
import { Invoice } from '../types/app';
import { formatFcfa } from '../utils/formatters';

interface SuperAdminSalesChartsProps {
  invoices: Invoice[];
  currencyLabel: string;
  isDark: boolean;
  onNavigateInvoices?: () => void;
}

type DocScopeFilter = 'factures' | 'payees' | 'tous';
type PeriodFilter = '6m' | '12m' | 'actifs';
type ChartMode = 'bar' | 'stacked' | 'area' | 'share';
type ComparisonBasis = 'ciment_only' | 'ciment_quincaillerie';

interface MonthlySalesDatum {
  monthKey: string;
  monthLabel: string;
  monthFullLabel: string;
  cimentValue: number;
  cimentOnly: number;
  quincaillerieOnly: number;
  boissons: number;
  total: number;
  cimentPct: number;
  boissonsPct: number;
  count: number;
  isCimentPeak: boolean;
  isBoissonsPeak: boolean;
  isTotalPeak: boolean;
}

interface PeakInfo {
  monthKey: string;
  monthFullLabel: string;
  amount: number;
  vsAveragePct: number | null;
}

interface CustomTooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
  payload?: MonthlySalesDatum;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  currencyLabel: string;
  cimentLabel: string;
  isShareMode?: boolean;
}

const SHORT_MONTH_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  month: 'short',
  year: '2-digit',
});

const FULL_MONTH_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
});

function formatCompactAxisFcfa(val: number): string {
  if (val === 0) return '0';
  if (Math.abs(val) >= 1_000_000) {
    const millions = val / 1_000_000;
    return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  if (Math.abs(val) >= 1_000) {
    const thousands = val / 1_000;
    return `${thousands.toFixed(0)}k`;
  }
  return String(Math.round(val));
}

function toMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function monthKeyToDate(key: string): Date {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, 1);
}

const SalesTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  currencyLabel,
  cimentLabel,
  isShareMode = false,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;

  const peakTags: string[] = [];
  if (datum.isCimentPeak) peakTags.push('Pic Ciment');
  if (datum.isBoissonsPeak) peakTags.push('Pic Boissons');

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 shadow-sm text-xs space-y-1.5 min-w-[235px]">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-1.5">
        <span className="font-display font-bold capitalize text-slate-900 dark:text-white">
          {datum.monthFullLabel}
        </span>
        <span className="font-mono-tabular text-[11px] text-slate-500 dark:text-slate-400">
          {datum.count} doc.
        </span>
      </div>

      {peakTags.length > 0 && (
        <p className="text-[11px] font-semibold text-[#D9531E]">
          {peakTags.join(' · ')}
        </p>
      )}

      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#D9531E] inline-block shrink-0" />
          {cimentLabel}
        </span>
        <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
          {isShareMode
            ? `${datum.cimentPct}% (${formatFcfa(datum.cimentValue, currencyLabel)})`
            : formatFcfa(datum.cimentValue, currencyLabel)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#0369A1] dark:bg-[#38BDF8] inline-block shrink-0" />
          Boissons
        </span>
        <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
          {isShareMode
            ? `${datum.boissonsPct}% (${formatFcfa(datum.boissons, currencyLabel)})`
            : formatFcfa(datum.boissons, currencyLabel)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-1.5">
        <span className="font-semibold text-slate-900 dark:text-white">
          Total comparé
        </span>
        <span className="font-mono-tabular font-extrabold text-slate-900 dark:text-white">
          {formatFcfa(datum.total, currencyLabel)}
        </span>
      </div>
    </div>
  );
};

export const SuperAdminSalesCharts: React.FC<SuperAdminSalesChartsProps> = ({
  invoices,
  currencyLabel,
  isDark,
  onNavigateInvoices,
}) => {
  const [comparisonBasis, setComparisonBasis] = useState<ComparisonBasis>(
    'ciment_quincaillerie'
  );
  const [scope, setScope] = useState<DocScopeFilter>('factures');
  const [period, setPeriod] = useState<PeriodFilter>('6m');
  const [chartMode, setChartMode] = useState<ChartMode>('bar');

  const cimentLabel =
    comparisonBasis === 'ciment_only'
      ? 'Pôle Ciment'
      : 'Ciment & Quincaillerie';

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (inv.status === 'annulee') return false;
      if (scope === 'factures') return inv.docType === 'facture';
      if (scope === 'payees') {
        return inv.docType === 'facture' && inv.status === 'payee';
      }
      return true;
    });
  }, [invoices, scope]);

  const {
    monthlyData,
    totalCimentDisplay,
    totalCimentOnly,
    totalQuincOnly,
    totalBoissons,
    grandTotal,
    totalDocs,
    cimentSharePct,
    boissonsSharePct,
    pieData,
    peakCiment,
    peakBoissons,
    peakGlobal,
    avgMonthlyTotal,
  } = useMemo(() => {
    const bucketMap = new Map<
      string,
      {
        cimentQuincaillerie: number;
        cimentOnly: number;
        quincaillerieOnly: number;
        boissons: number;
        count: number;
      }
    >();

    let latestMonthDate = new Date();
    let hasValidInvoiceDate = false;

    for (const inv of filteredInvoices) {
      const parsed = new Date(inv.createdAt);
      const validDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
      if (!hasValidInvoiceDate || validDate > latestMonthDate) {
        latestMonthDate = validDate;
        hasValidInvoiceDate = true;
      }

      const key = toMonthKey(validDate);
      const current = bucketMap.get(key) ?? {
        cimentQuincaillerie: 0,
        cimentOnly: 0,
        quincaillerieOnly: 0,
        boissons: 0,
        count: 0,
      };

      let invCimentOnly = 0;
      let invQuincOnly = 0;
      for (const item of inv.items) {
        if (item.pole === 'ciment') invCimentOnly += item.lineTotal;
        if (item.pole === 'quincaillerie') invQuincOnly += item.lineTotal;
      }

      current.cimentQuincaillerie += inv.cimentQuincaillerieSubtotal;
      current.cimentOnly += invCimentOnly;
      current.quincaillerieOnly += invQuincOnly;
      current.boissons += inv.boissonsSubtotal;
      current.count += 1;
      bucketMap.set(key, current);
    }

    let orderedKeys: string[] = [];
    if (period === 'actifs') {
      orderedKeys = Array.from(bucketMap.keys()).sort();
    } else {
      const monthsCount = period === '6m' ? 6 : 12;
      const anchorYear = latestMonthDate.getFullYear();
      const anchorMonth = latestMonthDate.getMonth();
      for (let i = monthsCount - 1; i >= 0; i--) {
        const d = new Date(anchorYear, anchorMonth - i, 1);
        orderedKeys.push(toMonthKey(d));
      }
    }

    const baseSeries = orderedKeys.map((key) => {
      const d = monthKeyToDate(key);
      const entry = bucketMap.get(key) ?? {
        cimentQuincaillerie: 0,
        cimentOnly: 0,
        quincaillerieOnly: 0,
        boissons: 0,
        count: 0,
      };
      const cimentValue =
        comparisonBasis === 'ciment_only'
          ? entry.cimentOnly
          : entry.cimentQuincaillerie;
      const total = cimentValue + entry.boissons;
      const cimentPct = total > 0 ? Math.round((cimentValue / total) * 100) : 0;
      const boissonsPct = total > 0 ? 100 - cimentPct : 0;

      return {
        monthKey: key,
        monthLabel: SHORT_MONTH_FORMATTER.format(d),
        monthFullLabel: FULL_MONTH_FORMATTER.format(d),
        cimentValue,
        cimentOnly: entry.cimentOnly,
        quincaillerieOnly: entry.quincaillerieOnly,
        boissons: entry.boissons,
        total,
        cimentPct,
        boissonsPct,
        count: entry.count,
      };
    });

    const maxCiment = Math.max(0, ...baseSeries.map((m) => m.cimentValue));
    const maxBoissons = Math.max(0, ...baseSeries.map((m) => m.boissons));
    const maxTotal = Math.max(0, ...baseSeries.map((m) => m.total));

    const series: MonthlySalesDatum[] = baseSeries.map((m) => ({
      ...m,
      isCimentPeak: maxCiment > 0 && m.cimentValue === maxCiment,
      isBoissonsPeak: maxBoissons > 0 && m.boissons === maxBoissons,
      isTotalPeak: maxTotal > 0 && m.total === maxTotal,
    }));

    const activeRows = series.filter((m) => m.total > 0);
    const activeCimentRows = series.filter((m) => m.cimentValue > 0);
    const activeBoissonRows = series.filter((m) => m.boissons > 0);

    const avgCiment =
      activeCimentRows.length > 0
        ? activeCimentRows.reduce((s, m) => s + m.cimentValue, 0) /
          activeCimentRows.length
        : 0;
    const avgBoissons =
      activeBoissonRows.length > 0
        ? activeBoissonRows.reduce((s, m) => s + m.boissons, 0) /
          activeBoissonRows.length
        : 0;
    const avgTotal =
      activeRows.length > 0
        ? activeRows.reduce((s, m) => s + m.total, 0) / activeRows.length
        : 0;

    const peakCimentEntry = series.find((m) => m.isCimentPeak);
    const peakBoissonEntry = series.find((m) => m.isBoissonsPeak);
    const peakTotalEntry = series.find((m) => m.isTotalPeak);

    const buildPeakInfo = (
      entry: MonthlySalesDatum | undefined,
      amount: number,
      avg: number,
      sampleCount: number
    ): PeakInfo | null => {
      if (!entry || amount <= 0) return null;
      const vsAveragePct =
        sampleCount > 1 && avg > 0
          ? Math.round(((amount - avg) / avg) * 100)
          : null;
      return {
        monthKey: entry.monthKey,
        monthFullLabel: entry.monthFullLabel,
        amount,
        vsAveragePct,
      };
    };

    const sumCimentDisplay = series.reduce((s, m) => s + m.cimentValue, 0);
    const sumCimentOnly = series.reduce((s, m) => s + m.cimentOnly, 0);
    const sumQuincOnly = series.reduce((s, m) => s + m.quincaillerieOnly, 0);
    const sumBoissons = series.reduce((s, m) => s + m.boissons, 0);
    const sumAll = sumCimentDisplay + sumBoissons;
    const docsCount = series.reduce((s, m) => s + m.count, 0);

    const cimentPct =
      sumAll > 0 ? Math.round((sumCimentDisplay / sumAll) * 100) : 0;
    const boissonsPct = sumAll > 0 ? 100 - cimentPct : 0;

    return {
      monthlyData: series,
      totalCimentDisplay: sumCimentDisplay,
      totalCimentOnly: sumCimentOnly,
      totalQuincOnly: sumQuincOnly,
      totalBoissons: sumBoissons,
      grandTotal: sumAll,
      totalDocs: docsCount,
      cimentSharePct: cimentPct,
      boissonsSharePct: boissonsPct,
      pieData: [
        {
          name: cimentLabel,
          value: sumCimentDisplay,
          color: '#D9531E',
        },
        {
          name: 'Boissons',
          value: sumBoissons,
          color: isDark ? '#38BDF8' : '#0369A1',
        },
      ],
      peakCiment: buildPeakInfo(
        peakCimentEntry,
        peakCimentEntry?.cimentValue ?? 0,
        avgCiment,
        activeCimentRows.length
      ),
      peakBoissons: buildPeakInfo(
        peakBoissonEntry,
        peakBoissonEntry?.boissons ?? 0,
        avgBoissons,
        activeBoissonRows.length
      ),
      peakGlobal: buildPeakInfo(
        peakTotalEntry,
        peakTotalEntry?.total ?? 0,
        avgTotal,
        activeRows.length
      ),
      avgMonthlyTotal: avgTotal,
    };
  }, [filteredInvoices, period, comparisonBasis, cimentLabel, isDark]);

  const activeMonths = useMemo(
    () => monthlyData.filter((m) => m.count > 0),
    [monthlyData]
  );

  const axisTickColor = isDark ? '#94A3B8' : '#64748B';
  const gridStrokeColor = isDark ? '#1E293B' : '#E2E8F0';
  const boissonColor = isDark ? '#38BDF8' : '#0369A1';
  const cimentColor = '#D9531E';

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      {/* Section Header + Filter Controls */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Répartition mensuelle par secteur</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                {totalDocs} document(s) retenu(s)
              </span>
              <span aria-hidden="true">·</span>
              <span>{cimentLabel} vs Boissons</span>
            </div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white mt-1">
              Comparatif mensuel & pics d’activité (Ciment vs Boissons)
            </h2>
          </div>

          {/* Pole Comparison Basis */}
          <div
            role="group"
            aria-label="Périmètre du pôle Ciment"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start lg:self-auto"
          >
            {(
              [
                { id: 'ciment_only', label: 'Ciment seul vs Boissons' },
                {
                  id: 'ciment_quincaillerie',
                  label: 'Ciment & Quinc. vs Boissons',
                },
              ] as { id: ComparisonBasis; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setComparisonBasis(opt.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  comparisonBasis === opt.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Document Scope Filter */}
            <div
              role="group"
              aria-label="Filtrer les types de documents"
              className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
            >
              {(
                [
                  { id: 'factures', label: 'Factures' },
                  { id: 'payees', label: 'Payées' },
                  { id: 'tous', label: 'Factures & Devis' },
                ] as { id: DocScopeFilter; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setScope(opt.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    scope === opt.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Period Filter */}
            <div
              role="group"
              aria-label="Période d’analyse"
              className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
            >
              {(
                [
                  { id: '6m', label: '6 mois' },
                  { id: '12m', label: '12 mois' },
                  { id: 'actifs', label: 'Mois actifs' },
                ] as { id: PeriodFilter; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPeriod(opt.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    period === opt.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Style Switcher */}
          <div
            role="group"
            aria-label="Mode du graphique"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
          >
            {(
              [
                { id: 'bar', label: 'Barres' },
                { id: 'stacked', label: 'Cumulé' },
                { id: 'area', label: 'Courbes (Pics)' },
                { id: 'share', label: 'Part %' },
              ] as { id: ChartMode; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setChartMode(opt.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  chartMode === opt.id
                    ? 'bg-[#0F2342] dark:bg-[#D9531E] text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Period Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800">
        <div className="px-6 py-4 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total comparé sur la période
          </p>
          <p className="font-mono-tabular font-extrabold text-lg text-slate-900 dark:text-white">
            {formatFcfa(grandTotal, currencyLabel)}
          </p>
        </div>

        <div className="px-6 py-4 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {cimentLabel} ({cimentSharePct}%)
          </p>
          <p className="font-mono-tabular font-extrabold text-lg text-[#D9531E]">
            {formatFcfa(totalCimentDisplay, currencyLabel)}
          </p>
        </div>

        <div className="px-6 py-4 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pôle Boissons ({boissonsSharePct}%)
          </p>
          <p className="font-mono-tabular font-extrabold text-lg text-[#0369A1] dark:text-[#38BDF8]">
            {formatFcfa(totalBoissons, currencyLabel)}
          </p>
        </div>

        <div className="px-6 py-4 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Panier moyen par document
          </p>
          <p className="font-mono-tabular font-extrabold text-lg text-slate-900 dark:text-white">
            {formatFcfa(
              totalDocs > 0 ? grandTotal / totalDocs : 0,
              currencyLabel
            )}
          </p>
        </div>
      </div>

      {/* Sector Activity Peaks Strip */}
      {filteredInvoices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/35">
          <div className="px-6 py-3.5 flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold text-[#D9531E] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                Pic d’activité · {cimentLabel}
              </p>
              <p className="font-display font-bold text-sm capitalize text-slate-900 dark:text-white">
                {peakCiment ? peakCiment.monthFullLabel : 'Aucune vente'}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono-tabular font-bold text-sm text-slate-900 dark:text-white">
                {peakCiment
                  ? formatFcfa(peakCiment.amount, currencyLabel)
                  : '—'}
              </p>
              {peakCiment?.vsAveragePct !== null &&
                peakCiment?.vsAveragePct !== undefined && (
                  <p className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                    +{peakCiment.vsAveragePct}% vs moy.
                  </p>
                )}
            </div>
          </div>

          <div className="px-6 py-3.5 flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold text-[#0369A1] dark:text-[#38BDF8] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                Pic d’activité · Boissons
              </p>
              <p className="font-display font-bold text-sm capitalize text-slate-900 dark:text-white">
                {peakBoissons ? peakBoissons.monthFullLabel : 'Aucune vente'}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono-tabular font-bold text-sm text-slate-900 dark:text-white">
                {peakBoissons
                  ? formatFcfa(peakBoissons.amount, currencyLabel)
                  : '—'}
              </p>
              {peakBoissons?.vsAveragePct !== null &&
                peakBoissons?.vsAveragePct !== undefined && (
                  <p className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                    +{peakBoissons.vsAveragePct}% vs moy.
                  </p>
                )}
            </div>
          </div>

          <div className="px-6 py-3.5 flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                Pic mensuel global
              </p>
              <p className="font-display font-bold text-sm capitalize text-slate-900 dark:text-white">
                {peakGlobal ? peakGlobal.monthFullLabel : 'Aucune vente'}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono-tabular font-bold text-sm text-slate-900 dark:text-white">
                {peakGlobal
                  ? formatFcfa(peakGlobal.amount, currencyLabel)
                  : '—'}
              </p>
              {peakGlobal?.vsAveragePct !== null &&
                peakGlobal?.vsAveragePct !== undefined && (
                  <p className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                    +{peakGlobal.vsAveragePct}% vs moy.
                  </p>
                )}
            </div>
          </div>
        </div>
      )}

      {filteredInvoices.length === 0 ? (
        <div className="p-12 text-center space-y-3">
          <BarChart3 className="w-9 h-9 text-slate-300 dark:text-slate-700 mx-auto" />
          <div className="space-y-1">
            <p className="font-display font-bold text-base text-slate-900 dark:text-white">
              Aucune vente enregistrée pour ce filtre
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Les graphiques mensuels comparant le pôle Ciment et le pôle Boissons s’actualiseront automatiquement dès qu’une facture ou un devis correspondant sera enregistré.
            </p>
          </div>
          {onNavigateInvoices && (
            <button
              type="button"
              onClick={onNavigateInvoices}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#D9531E] hover:bg-[#B84315] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              Créer ou consulter les factures
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Main Recharts Visualization Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
            {/* Monthly Pole Comparison Chart */}
            <div className="lg:col-span-2 p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-5 text-xs">
                  <span className="inline-flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                    <span className="w-3 h-3 rounded-xs bg-[#D9531E] inline-block" />
                    {cimentLabel}
                  </span>
                  <span className="inline-flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                    <span
                      className="w-3 h-3 rounded-xs inline-block"
                      style={{ backgroundColor: boissonColor }}
                    />
                    Boissons
                  </span>
                </div>
                <span className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                  {chartMode === 'share'
                    ? 'Répartition relative (%)'
                    : `Montants en ${currencyLabel}`}
                </span>
              </div>

              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartMode === 'area' ? (
                    <AreaChart
                      data={monthlyData}
                      margin={{ top: 12, right: 14, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="gisGradCiment"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={cimentColor}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor={cimentColor}
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                        <linearGradient
                          id="gisGradBoisson"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={boissonColor}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor={boissonColor}
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke={gridStrokeColor}
                      />
                      <XAxis
                        dataKey="monthLabel"
                        tick={{ fill: axisTickColor, fontSize: 12 }}
                        axisLine={{ stroke: gridStrokeColor }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={formatCompactAxisFcfa}
                        tick={{ fill: axisTickColor, fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={54}
                      />
                      {activeMonths.length > 1 && avgMonthlyTotal > 0 && (
                        <ReferenceLine
                          y={avgMonthlyTotal}
                          stroke={axisTickColor}
                          strokeDasharray="4 4"
                          strokeOpacity={0.55}
                        />
                      )}
                      <Tooltip
                        content={
                          <SalesTooltip
                            currencyLabel={currencyLabel}
                            cimentLabel={cimentLabel}
                          />
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="cimentValue"
                        name={cimentLabel}
                        stroke={cimentColor}
                        strokeWidth={2.5}
                        fill="url(#gisGradCiment)"
                        dot={{ r: 3, fill: cimentColor, strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="boissons"
                        name="Boissons"
                        stroke={boissonColor}
                        strokeWidth={2.5}
                        fill="url(#gisGradBoisson)"
                        dot={{ r: 3, fill: boissonColor, strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  ) : chartMode === 'share' ? (
                    <BarChart
                      data={monthlyData}
                      margin={{ top: 12, right: 14, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke={gridStrokeColor}
                      />
                      <XAxis
                        dataKey="monthLabel"
                        tick={{ fill: axisTickColor, fontSize: 12 }}
                        axisLine={{ stroke: gridStrokeColor }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fill: axisTickColor, fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={46}
                      />
                      <ReferenceLine
                        y={50}
                        stroke={axisTickColor}
                        strokeDasharray="4 4"
                        strokeOpacity={0.5}
                      />
                      <Tooltip
                        cursor={{
                          fill: isDark
                            ? 'rgba(148, 163, 184, 0.08)'
                            : 'rgba(15, 35, 66, 0.04)',
                        }}
                        content={
                          <SalesTooltip
                            currencyLabel={currencyLabel}
                            cimentLabel={cimentLabel}
                            isShareMode={true}
                          />
                        }
                      />
                      <Bar
                        dataKey="cimentPct"
                        name={cimentLabel}
                        stackId="share"
                        fill={cimentColor}
                        maxBarSize={40}
                      />
                      <Bar
                        dataKey="boissonsPct"
                        name="Boissons"
                        stackId="share"
                        fill={boissonColor}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  ) : (
                    <BarChart
                      data={monthlyData}
                      margin={{ top: 12, right: 14, left: 0, bottom: 0 }}
                      barGap={6}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke={gridStrokeColor}
                      />
                      <XAxis
                        dataKey="monthLabel"
                        tick={{ fill: axisTickColor, fontSize: 12 }}
                        axisLine={{ stroke: gridStrokeColor }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={formatCompactAxisFcfa}
                        tick={{ fill: axisTickColor, fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={54}
                      />
                      {activeMonths.length > 1 && avgMonthlyTotal > 0 && (
                        <ReferenceLine
                          y={avgMonthlyTotal}
                          stroke={axisTickColor}
                          strokeDasharray="4 4"
                          strokeOpacity={0.55}
                        />
                      )}
                      <Tooltip
                        cursor={{
                          fill: isDark
                            ? 'rgba(148, 163, 184, 0.08)'
                            : 'rgba(15, 35, 66, 0.04)',
                        }}
                        content={
                          <SalesTooltip
                            currencyLabel={currencyLabel}
                            cimentLabel={cimentLabel}
                          />
                        }
                      />
                      <Bar
                        dataKey="cimentValue"
                        name={cimentLabel}
                        stackId={chartMode === 'stacked' ? 'poles' : undefined}
                        fill={cimentColor}
                        radius={
                          chartMode === 'stacked'
                            ? [0, 0, 0, 0]
                            : [4, 4, 0, 0]
                        }
                        maxBarSize={38}
                      >
                        {monthlyData.map((entry) => (
                          <Cell
                            key={`c-${entry.monthKey}`}
                            fill={cimentColor}
                            fillOpacity={
                              activeMonths.length <= 1 || entry.isCimentPeak
                                ? 1
                                : 0.8
                            }
                          />
                        ))}
                      </Bar>
                      <Bar
                        dataKey="boissons"
                        name="Boissons"
                        stackId={chartMode === 'stacked' ? 'poles' : undefined}
                        fill={boissonColor}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={38}
                      >
                        {monthlyData.map((entry) => (
                          <Cell
                            key={`b-${entry.monthKey}`}
                            fill={boissonColor}
                            fillOpacity={
                              activeMonths.length <= 1 || entry.isBoissonsPeak
                                ? 1
                                : 0.8
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pole Share Donut + Sub-pole Breakdown */}
            <div className="p-6 flex flex-col justify-between gap-5">
              <div>
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                  Répartition globale par pôle
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Part relative {cimentLabel} vs Boissons
                </p>
              </div>

              <div className="relative h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={82}
                      paddingAngle={grandTotal > 0 ? 3 : 0}
                      stroke="none"
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) =>
                        formatFcfa(Number(value ?? 0), currencyLabel)
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ratio Pôles
                  </span>
                  <span className="font-mono-tabular font-extrabold text-sm text-slate-900 dark:text-white">
                    {cimentSharePct}% / {boissonsSharePct}%
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#D9531E] shrink-0" />
                    {cimentLabel}
                  </span>
                  <span className="font-mono-tabular font-bold text-slate-900 dark:text-white">
                    {cimentSharePct}%
                  </span>
                </div>
                {(totalCimentOnly > 0 || totalQuincOnly > 0) && (
                  <div className="pl-4.5 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Ciment seul</span>
                      <span className="font-mono-tabular">
                        {formatFcfa(totalCimentOnly, currencyLabel)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Quincaillerie (hors ciment)</span>
                      <span className="font-mono-tabular">
                        {formatFcfa(totalQuincOnly, currencyLabel)}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: boissonColor }}
                    />
                    Boissons
                  </span>
                  <span className="font-mono-tabular font-bold text-slate-900 dark:text-white">
                    {boissonsSharePct}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Breakdown Table */}
          {activeMonths.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="py-2.5 px-6 font-semibold">
                      Mois avec activité
                    </th>
                    <th className="py-2.5 px-4 font-semibold text-right">
                      Documents
                    </th>
                    <th className="py-2.5 px-4 font-semibold text-right">
                      {cimentLabel}
                    </th>
                    <th className="py-2.5 px-4 font-semibold text-right">
                      Boissons
                    </th>
                    <th className="py-2.5 px-4 font-semibold text-right">
                      Répartition
                    </th>
                    <th className="py-2.5 px-6 font-semibold text-right">
                      Total comparé
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeMonths.map((row) => {
                    const rowPeaks: string[] = [];
                    if (row.isCimentPeak) rowPeaks.push('Pic Ciment');
                    if (row.isBoissonsPeak) rowPeaks.push('Pic Boissons');

                    return (
                      <tr
                        key={row.monthKey}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                      >
                        <td className="py-2.5 px-6">
                          <span className="font-semibold capitalize text-slate-900 dark:text-white">
                            {row.monthFullLabel}
                          </span>
                          {rowPeaks.length > 0 && (
                            <span className="ml-2 text-[11px] font-semibold text-[#D9531E]">
                              · {rowPeaks.join(' · ')}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono-tabular text-slate-600 dark:text-slate-300">
                          {row.count}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono-tabular font-semibold text-[#D9531E]">
                          {formatFcfa(row.cimentValue, currencyLabel)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono-tabular font-semibold text-[#0369A1] dark:text-[#38BDF8]">
                          {formatFcfa(row.boissons, currencyLabel)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono-tabular text-slate-600 dark:text-slate-300">
                          {row.cimentPct}% / {row.boissonsPct}%
                        </td>
                        <td className="py-2.5 px-6 text-right font-mono-tabular font-extrabold text-slate-900 dark:text-white">
                          {formatFcfa(row.total, currencyLabel)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
};
