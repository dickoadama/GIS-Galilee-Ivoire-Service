import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { Invoice, StoreSettings } from '../types/app';
import { formatFcfa } from '../utils/formatters';

interface MonthlySalesChartProps {
  invoices: Invoice[];
  settings: StoreSettings;
}

interface DailySalesDatum {
  day: number;
  dayLabel: string;
  fullDateLabel: string;
  cimentQuincaillerie: number;
  boissons: number;
  total: number;
  count: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: DailySalesDatum;
  }>;
  currencyLabel: string;
}

const DailySalesTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  currencyLabel,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 text-xs space-y-1.5 min-w-[210px]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-1.5">
        <span className="font-semibold text-slate-900 dark:text-white capitalize">
          {row.fullDateLabel}
        </span>
        <span className="font-mono-tabular text-[11px] text-slate-500 dark:text-slate-400">
          {row.count} doc{row.count > 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="w-2 h-2 rounded-xs bg-[#D9531E]" />
          Ciment & Quinc.
        </span>
        <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
          {formatFcfa(row.cimentQuincaillerie, currencyLabel)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="w-2 h-2 rounded-xs bg-[#0369A1]" />
          Boissons
        </span>
        <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
          {formatFcfa(row.boissons, currencyLabel)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100 dark:border-slate-800 font-bold">
        <span className="text-slate-800 dark:text-slate-200">Total jour</span>
        <span className="font-mono-tabular text-[#0F2342] dark:text-[#FDBA74]">
          {formatFcfa(row.total, currencyLabel)}
        </span>
      </div>
    </div>
  );
};

function formatCompactYAxis(value: number): string {
  if (value === 0) return '0';
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1).replace('.', ',')}M`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  return String(value);
}

export const MonthlySalesChart: React.FC<MonthlySalesChartProps> = ({
  invoices,
  settings,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [includeQuotes, setIncludeQuotes] = useState(false);

  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthTitle = now.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const { dailyData, monthTotal, monthCount, peakDay } = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const buckets: DailySalesDatum[] = Array.from(
      { length: daysInMonth },
      (_, idx) => {
        const dayNum = idx + 1;
        const d = new Date(currentYear, currentMonth, dayNum);
        return {
          day: dayNum,
          dayLabel: String(dayNum).padStart(2, '0'),
          fullDateLabel: d.toLocaleDateString('fr-FR', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          cimentQuincaillerie: 0,
          boissons: 0,
          total: 0,
          count: 0,
        };
      }
    );

    let totalSum = 0;
    let docCount = 0;

    for (const inv of invoices) {
      if (inv.status === 'annulee') continue;
      if (!includeQuotes && inv.docType !== 'facture') continue;

      const created = new Date(inv.createdAt);
      if (Number.isNaN(created.getTime())) continue;
      if (
        created.getFullYear() !== currentYear ||
        created.getMonth() !== currentMonth
      ) {
        continue;
      }

      const dayIdx = created.getDate() - 1;
      const bucket = buckets[dayIdx];
      if (!bucket) continue;

      bucket.cimentQuincaillerie += inv.cimentQuincaillerieSubtotal || 0;
      bucket.boissons += inv.boissonsSubtotal || 0;
      bucket.total += inv.totalFcfa || 0;
      bucket.count += 1;

      totalSum += inv.totalFcfa || 0;
      docCount += 1;
    }

    let best: DailySalesDatum | null = null;
    for (const b of buckets) {
      if (b.total > 0 && (!best || b.total > best.total)) {
        best = b;
      }
    }

    return {
      dailyData: buckets,
      monthTotal: totalSum,
      monthCount: docCount,
      peakDay: best,
    };
  }, [invoices, includeQuotes, currentYear, currentMonth]);

  return (
    <section
      aria-label="Volume des ventes par jour sur le mois en cours"
      className="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#D9531E] text-white flex items-center justify-center shrink-0">
            <BarChart3 className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                Volume des ventes par jour
              </h2>
              <span className="px-2 py-0.5 text-[11px] font-semibold capitalize rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                {monthTitle}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Répartition journalière par pôle (Ciment & Quincaillerie / Boissons) sur le mois en cours
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-200/75 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setIncludeQuotes(false)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                !includeQuotes
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Factures
            </button>
            <button
              type="button"
              onClick={() => setIncludeQuotes(true)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                includeQuotes
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Factures + Devis
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Réduire
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Déplier
              </>
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 space-y-5">
          {/* KPI Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Volume total du mois
              </p>
              <p className="font-display font-extrabold text-xl font-mono-tabular text-slate-900 dark:text-white mt-0.5">
                {formatFcfa(monthTotal, settings.currencyLabel)}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Documents comptabilisés
              </p>
              <p className="font-display font-extrabold text-xl font-mono-tabular text-slate-900 dark:text-white mt-0.5">
                {monthCount} {includeQuotes ? 'document(s)' : 'facture(s)'}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Meilleure journée
              </p>
              <p className="font-display font-extrabold text-xl font-mono-tabular text-[#D9531E] mt-0.5 truncate">
                {peakDay
                  ? `Le ${peakDay.dayLabel} · ${formatFcfa(
                      peakDay.total,
                      settings.currencyLabel
                    )}`
                  : 'Aucune vente'}
              </p>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="w-full h-[270px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyData}
                margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#94a3b8"
                  strokeOpacity={0.22}
                />
                <XAxis
                  dataKey="dayLabel"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.4 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={formatCompactYAxis}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  width={46}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                  content={
                    <DailySalesTooltip currencyLabel={settings.currencyLabel} />
                  }
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                />
                <Bar
                  dataKey="cimentQuincaillerie"
                  name="Ciment & Quincaillerie"
                  stackId="sales"
                  fill="#D9531E"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={24}
                />
                <Bar
                  dataKey="boissons"
                  name="Boissons"
                  stackId="sales"
                  fill="#0369A1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
};
