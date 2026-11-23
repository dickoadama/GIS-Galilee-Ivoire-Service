import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Layers,
  PackageCheck,
  TrendingUp,
} from 'lucide-react';
import {
  Invoice,
  Member,
  PageId,
  Product,
  ProductPole,
  PurchaseOrder,
  StoreSettings,
  UserRole,
} from '../types/app';
import { formatFcfa, getPoleLabel, getRoleLabel } from '../utils/formatters';

interface DashboardPageProps {
  products: Product[];
  invoices: Invoice[];
  purchaseOrders: PurchaseOrder[];
  members: Member[];
  settings: StoreSettings;
  currentUserName: string;
  currentRole: UserRole;
  onNavigate: (page: PageId, poleFilter?: ProductPole | 'separated') => void;
}

type WindowDays = 7 | 14 | 30;
type DocScope = 'factures' | 'payees' | 'tous';
type DailyChartStyle = 'area' | 'bar';

interface DailyRevenuePoint {
  dateKey: string;
  shortLabel: string;
  fullLabel: string;
  ciment: number;
  quincaillerie: number;
  boissons: number;
  total: number;
  count: number;
}

interface PoleSalesDatum {
  pole: ProductPole;
  name: string;
  amount: number;
  units: number;
  sharePct: number;
  color: string;
}

interface CriticalStockDatum {
  id: string;
  name: string;
  shortName: string;
  pole: ProductPole;
  stockQty: number;
  threshold: number;
  deficit: number;
  isOut: boolean;
}

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatCompactFcfa(val: number): string {
  if (val === 0) return '0';
  if (Math.abs(val) >= 1_000_000) {
    const m = val / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1).replace('.', ',')}M`;
  }
  if (Math.abs(val) >= 1_000) {
    return `${Math.round(val / 1_000)}k`;
  }
  return String(Math.round(val));
}

const DailyRevenueTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload?: DailyRevenuePoint }>;
  currencyLabel: string;
}> = ({ active, payload, currencyLabel }) => {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 text-xs space-y-1.5 min-w-[220px]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-1.5">
        <span className="font-semibold text-slate-900 dark:text-white capitalize">
          {row.fullLabel}
        </span>
        <span className="font-mono-tabular text-[11px] text-slate-500 dark:text-slate-400">
          {row.count} doc.
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="w-2 h-2 rounded-xs bg-[#D9531E]" />
          Ciment
        </span>
        <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
          {formatFcfa(row.ciment, currencyLabel)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="w-2 h-2 rounded-xs bg-[#F59E0B]" />
          Quincaillerie
        </span>
        <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
          {formatFcfa(row.quincaillerie, currencyLabel)}
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
        <span className="text-slate-800 dark:text-slate-200">Total CA</span>
        <span className="font-mono-tabular text-[#0F2342] dark:text-[#FDBA74]">
          {formatFcfa(row.total, currencyLabel)}
        </span>
      </div>
    </div>
  );
};

const CriticalStockTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload?: CriticalStockDatum }>;
}> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 text-xs space-y-1 min-w-[200px]">
      <p className="font-semibold text-slate-900 dark:text-white">
        {item.name}
      </p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        {getPoleLabel(item.pole)}
      </p>
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
        <span className="text-slate-600 dark:text-slate-300">Stock actuel</span>
        <span
          className={`font-mono-tabular font-bold ${
            item.isOut ? 'text-red-600' : 'text-[#D9531E]'
          }`}
        >
          {item.stockQty}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-slate-600 dark:text-slate-300">Seuil alerte</span>
        <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
          {item.threshold}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-slate-600 dark:text-slate-300">Manque estimé</span>
        <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
          {item.deficit} u.
        </span>
      </div>
    </div>
  );
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  products,
  invoices,
  purchaseOrders,
  members,
  settings,
  currentUserName,
  currentRole,
  onNavigate,
}) => {
  const [windowDays, setWindowDays] = useState<WindowDays>(14);
  const [docScope, setDocScope] = useState<DocScope>('factures');
  const [dailyChartStyle, setDailyChartStyle] =
    useState<DailyChartStyle>('area');

  const isDark = settings.theme === 'dark';
  const axisTickColor = isDark ? '#94A3B8' : '#64748B';
  const gridStrokeColor = isDark ? '#1E293B' : '#E2E8F0';
  const boissonColor = isDark ? '#38BDF8' : '#0369A1';

  const scopedInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (inv.status === 'annulee') return false;
      if (docScope === 'factures') return inv.docType === 'facture';
      if (docScope === 'payees') {
        return inv.docType === 'facture' && inv.status === 'payee';
      }
      return true;
    });
  }, [invoices, docScope]);

  const {
    dailySeries,
    todayRevenue,
    todayCount,
    yesterdayRevenue,
    windowRevenue,
    windowCount,
    dailyAvg,
    poleSales,
    totalPoleRevenue,
  } = useMemo(() => {
    const now = new Date();
    const todayKey = toLocalDateKey(now);
    const yesterdayDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1
    );
    const yesterdayKey = toLocalDateKey(yesterdayDate);

    // Build contiguous calendar buckets for the selected window
    const buckets: DailyRevenuePoint[] = [];
    const indexByKey: Record<string, number> = {};

    for (let offset = windowDays - 1; offset >= 0; offset--) {
      const d = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - offset
      );
      const key = toLocalDateKey(d);
      indexByKey[key] = buckets.length;
      buckets.push({
        dateKey: key,
        shortLabel: d.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
        }),
        fullLabel: d.toLocaleDateString('fr-FR', {
          weekday: 'short',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        ciment: 0,
        quincaillerie: 0,
        boissons: 0,
        total: 0,
        count: 0,
      });
    }

    let todaySum = 0;
    let todayDocs = 0;
    let yesterdaySum = 0;

    let poleCimentAmount = 0;
    let poleQuincAmount = 0;
    let poleBoissonsAmount = 0;
    let poleCimentUnits = 0;
    let poleQuincUnits = 0;
    let poleBoissonsUnits = 0;

    for (const inv of scopedInvoices) {
      const parsed = new Date(inv.createdAt);
      if (Number.isNaN(parsed.getTime())) continue;
      const key = toLocalDateKey(parsed);

      let invCiment = 0;
      let invQuinc = 0;
      let invBoissons = 0;

      for (const item of inv.items) {
        if (item.pole === 'ciment') {
          invCiment += item.lineTotal;
          poleCimentUnits += item.quantity;
        } else if (item.pole === 'quincaillerie') {
          invQuinc += item.lineTotal;
          poleQuincUnits += item.quantity;
        } else if (item.pole === 'boissons') {
          invBoissons += item.lineTotal;
          poleBoissonsUnits += item.quantity;
        }
      }

      // Fallback if invoice has subtotals without pole breakdown on items
      if (
        invCiment === 0 &&
        invQuinc === 0 &&
        inv.cimentQuincaillerieSubtotal > 0
      ) {
        invQuinc = inv.cimentQuincaillerieSubtotal;
      }
      if (invBoissons === 0 && inv.boissonsSubtotal > 0) {
        invBoissons = inv.boissonsSubtotal;
      }

      poleCimentAmount += invCiment;
      poleQuincAmount += invQuinc;
      poleBoissonsAmount += invBoissons;

      if (key === todayKey) {
        todaySum += inv.totalFcfa;
        todayDocs += 1;
      } else if (key === yesterdayKey) {
        yesterdaySum += inv.totalFcfa;
      }

      const idx = indexByKey[key];
      if (idx !== undefined) {
        const bucket = buckets[idx];
        bucket.ciment += invCiment;
        bucket.quincaillerie += invQuinc;
        bucket.boissons += invBoissons;
        bucket.total += inv.totalFcfa;
        bucket.count += 1;
      }
    }

    const totalWinRev = buckets.reduce((sum, b) => sum + b.total, 0);
    const totalWinCount = buckets.reduce((sum, b) => sum + b.count, 0);
    const avgPerDay = windowDays > 0 ? totalWinRev / windowDays : 0;

    const totalPoles = poleCimentAmount + poleQuincAmount + poleBoissonsAmount;
    const toPct = (val: number) =>
      totalPoles > 0 ? Math.round((val / totalPoles) * 100) : 0;

    const poles: PoleSalesDatum[] = [
      {
        pole: 'ciment',
        name: 'Ciment',
        amount: poleCimentAmount,
        units: poleCimentUnits,
        sharePct: toPct(poleCimentAmount),
        color: '#D9531E',
      },
      {
        pole: 'quincaillerie',
        name: 'Quincaillerie',
        amount: poleQuincAmount,
        units: poleQuincUnits,
        sharePct: toPct(poleQuincAmount),
        color: '#F59E0B',
      },
      {
        pole: 'boissons',
        name: 'Boissons',
        amount: poleBoissonsAmount,
        units: poleBoissonsUnits,
        sharePct: toPct(poleBoissonsAmount),
        color: boissonColor,
      },
    ];

    return {
      dailySeries: buckets,
      todayRevenue: todaySum,
      todayCount: todayDocs,
      yesterdayRevenue: yesterdaySum,
      windowRevenue: totalWinRev,
      windowCount: totalWinCount,
      dailyAvg: avgPerDay,
      poleSales: poles,
      totalPoleRevenue: totalPoles,
    };
  }, [scopedInvoices, windowDays, boissonColor]);

  // Critical & out-of-stock products analysis
  const {
    criticalProducts,
    outOfStockCount,
    lowStockCount,
    stockHealthByPole,
  } = useMemo(() => {
    const criticalList: CriticalStockDatum[] = [];
    let outCount = 0;
    let lowCount = 0;

    const poleStats: Record<
      ProductPole,
      { totalSku: number; criticalSku: number; totalUnits: number; retailValue: number }
    > = {
      ciment: { totalSku: 0, criticalSku: 0, totalUnits: 0, retailValue: 0 },
      quincaillerie: {
        totalSku: 0,
        criticalSku: 0,
        totalUnits: 0,
        retailValue: 0,
      },
      boissons: { totalSku: 0, criticalSku: 0, totalUnits: 0, retailValue: 0 },
    };

    for (const p of products) {
      const bucket = poleStats[p.pole];
      bucket.totalSku += 1;
      bucket.totalUnits += p.stockQty;
      bucket.retailValue += p.stockQty * p.priceFcfa;

      const isOut = !p.inStock || p.stockQty <= 0;
      const isCrit = p.stockQty <= p.criticalStockThreshold;

      if (isOut) {
        outCount += 1;
      } else if (isCrit) {
        lowCount += 1;
      }

      if (isOut || isCrit) {
        bucket.criticalSku += 1;
        const target = Math.max(1, p.criticalStockThreshold);
        const deficit = Math.max(0, target - p.stockQty);
        criticalList.push({
          id: p.id,
          name: p.name,
          shortName:
            p.name.length > 22 ? `${p.name.slice(0, 20).trim()}…` : p.name,
          pole: p.pole,
          stockQty: p.stockQty,
          threshold: p.criticalStockThreshold,
          deficit,
          isOut,
        });
      }
    }

    criticalList.sort((a, b) => {
      if (a.isOut !== b.isOut) return a.isOut ? -1 : 1;
      const ratioA = a.stockQty / Math.max(1, a.threshold);
      const ratioB = b.stockQty / Math.max(1, b.threshold);
      return ratioA - ratioB;
    });

    return {
      criticalProducts: criticalList,
      outOfStockCount: outCount,
      lowStockCount: lowCount,
      stockHealthByPole: poleStats,
    };
  }, [products]);

  const topCriticalChartData = useMemo(
    () => criticalProducts.slice(0, 10),
    [criticalProducts]
  );

  const pendingDeliveriesCount = useMemo(
    () =>
      invoices.filter(
        (i) =>
          i.deliveryMode === 'livraison_locale' &&
          (i.status === 'en_attente' || i.status === 'en_preparation')
      ).length,
    [invoices]
  );

  const openPoCount = useMemo(
    () =>
      purchaseOrders.filter(
        (po) => po.status === 'brouillon' || po.status === 'envoye'
      ).length,
    [purchaseOrders]
  );

  const activeStaffCount = useMemo(
    () => members.filter((m) => m.active).length,
    [members]
  );

  const todayDeltaPct =
    yesterdayRevenue > 0
      ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
      : null;

  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 space-y-8">
      {/* Page Header & Global Filters */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{settings.poster.companyName}</span>
            <span aria-hidden="true">·</span>
            <span>{getRoleLabel(currentRole)}</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{todayLabel}</span>
          </div>
          <h1 className="font-display font-extrabold text-3xl text-slate-900 dark:text-white tracking-tight">
            Tableau de bord Direction
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Pilotage du chiffre d’affaires journalier, des ventes par pôle et des niveaux de stock critique pour {currentUserName}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Fenêtre d'analyse journalière"
            className="inline-flex items-center gap-1 p-1 bg-slate-200/75 dark:bg-slate-800 rounded-lg"
          >
            {([7, 14, 30] as WindowDays[]).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setWindowDays(days)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  windowDays === days
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {days} jours
              </button>
            ))}
          </div>

          <div
            role="group"
            aria-label="Périmètre des ventes"
            className="inline-flex items-center gap-1 p-1 bg-slate-200/75 dark:bg-slate-800 rounded-lg"
          >
            {(
              [
                { id: 'factures', label: 'Factures' },
                { id: 'payees', label: 'Payées' },
                { id: 'tous', label: 'Factures + Devis' },
              ] as { id: DocScope; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDocScope(opt.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  docScope === opt.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Strip (4 high-signal metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>CA du jour</span>
            <span className="font-mono-tabular">{todayCount} doc.</span>
          </div>
          <p className="font-display font-extrabold text-2xl font-mono-tabular text-slate-900 dark:text-white">
            {formatFcfa(todayRevenue, settings.currencyLabel)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
            {todayDeltaPct !== null
              ? `${todayDeltaPct >= 0 ? '+' : ''}${todayDeltaPct}% vs hier`
              : `Moy. ${windowDays}j : ${formatFcfa(
                  Math.round(dailyAvg),
                  settings.currencyLabel
                )}`}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>CA cumulé ({windowDays} jours)</span>
            <span className="font-mono-tabular">{windowCount} doc.</span>
          </div>
          <p className="font-display font-extrabold text-2xl font-mono-tabular text-[#0F2342] dark:text-white">
            {formatFcfa(windowRevenue, settings.currencyLabel)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
            Moy. / jour :{' '}
            {formatFcfa(Math.round(dailyAvg), settings.currencyLabel)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Stock critique</span>
            <AlertTriangle className="w-4 h-4 text-[#D9531E]" />
          </div>
          <p className="font-display font-extrabold text-2xl font-mono-tabular text-[#D9531E]">
            {criticalProducts.length} article{criticalProducts.length > 1 ? 's' : ''}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
            {outOfStockCount} en rupture · {lowStockCount} sous seuil ·{' '}
            {products.length} total
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Opérations en cours</span>
            <span className="font-mono-tabular">{activeStaffCount} actifs</span>
          </div>
          <p className="font-display font-extrabold text-2xl font-mono-tabular text-slate-900 dark:text-white">
            {pendingDeliveriesCount} livraison
            {pendingDeliveriesCount > 1 ? 's' : ''}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
            {openPoCount} bon{openPoCount > 1 ? 's' : ''} fournisseur ouvert
            {openPoCount > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Primary Charts Grid: Daily Revenue + Sales by Pole */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Daily Revenue Chart */}
        <section
          aria-label="Chiffre d'affaires journalier"
          className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between gap-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <TrendingUp className="w-3.5 h-3.5 text-[#D9531E]" />
                <span>Tendance quotidienne ({windowDays} derniers jours)</span>
              </div>
              <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white mt-0.5">
                Chiffre d’affaires journalier
              </h2>
            </div>

            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setDailyChartStyle('area')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  dailyChartStyle === 'area'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Courbe
              </button>
              <button
                type="button"
                onClick={() => setDailyChartStyle('bar')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  dailyChartStyle === 'bar'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Barres par pôle
              </button>
            </div>
          </div>

          <div className="w-full h-[290px]">
            <ResponsiveContainer width="100%" height="100%">
              {dailyChartStyle === 'area' ? (
                <AreaChart
                  data={dailySeries}
                  margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="dashCaGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#D9531E"
                        stopOpacity={0.32}
                      />
                      <stop
                        offset="95%"
                        stopColor="#D9531E"
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
                    dataKey="shortLabel"
                    tick={{ fontSize: 11, fill: axisTickColor }}
                    tickLine={false}
                    axisLine={{ stroke: gridStrokeColor }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={formatCompactFcfa}
                    tick={{ fontSize: 11, fill: axisTickColor }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                  />
                  {dailyAvg > 0 && (
                    <ReferenceLine
                      y={dailyAvg}
                      stroke={axisTickColor}
                      strokeDasharray="4 4"
                      strokeOpacity={0.6}
                    />
                  )}
                  <Tooltip
                    content={
                      <DailyRevenueTooltip
                        currencyLabel={settings.currencyLabel}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="CA Journalier"
                    stroke="#D9531E"
                    strokeWidth={2.5}
                    fill="url(#dashCaGradient)"
                    dot={{ r: 3, fill: '#D9531E', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              ) : (
                <BarChart
                  data={dailySeries}
                  margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={gridStrokeColor}
                  />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fontSize: 11, fill: axisTickColor }}
                    tickLine={false}
                    axisLine={{ stroke: gridStrokeColor }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={formatCompactFcfa}
                    tick={{ fontSize: 11, fill: axisTickColor }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                    content={
                      <DailyRevenueTooltip
                        currencyLabel={settings.currencyLabel}
                      />
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Bar
                    dataKey="ciment"
                    name="Ciment"
                    stackId="ca"
                    fill="#D9531E"
                    maxBarSize={24}
                  />
                  <Bar
                    dataKey="quincaillerie"
                    name="Quincaillerie"
                    stackId="ca"
                    fill="#F59E0B"
                    maxBarSize={24}
                  />
                  <Bar
                    dataKey="boissons"
                    name="Boissons"
                    stackId="ca"
                    fill={boissonColor}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </section>

        {/* Sales by Pole Donut + Breakdown */}
        <section
          aria-label="Ventes par pôle"
          className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <BarChart3 className="w-3.5 h-3.5 text-[#0369A1]" />
              <span>Toutes périodes ({docScope})</span>
            </div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white mt-0.5">
              Ventes par pôle
            </h2>
          </div>

          <div className="relative h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={
                    totalPoleRevenue > 0
                      ? poleSales
                      : [{ name: 'Aucune vente', amount: 1, color: '#CBD5E1' }]
                  }
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={82}
                  paddingAngle={totalPoleRevenue > 0 ? 3 : 0}
                  stroke="none"
                >
                  {(totalPoleRevenue > 0
                    ? poleSales
                    : [{ name: 'Aucune vente', color: '#CBD5E1' }]
                  ).map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                {totalPoleRevenue > 0 && (
                  <Tooltip
                    formatter={(value) =>
                      formatFcfa(Number(value ?? 0), settings.currencyLabel)
                    }
                  />
                )}
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Total ventes
              </span>
              <span className="font-mono-tabular font-extrabold text-sm text-slate-900 dark:text-white">
                {formatCompactFcfa(totalPoleRevenue)} {settings.currencyLabel}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            {poleSales.map((p) => (
              <div
                key={p.pole}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {p.name}
                  </span>
                  <span className="font-mono-tabular text-[11px] text-slate-500 dark:text-slate-400">
                    ({p.sharePct}%)
                  </span>
                </div>
                <span className="font-mono-tabular font-bold text-slate-900 dark:text-white shrink-0">
                  {formatFcfa(p.amount, settings.currencyLabel)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Critical Stock Visualization + Action Table */}
      <section
        aria-label="Analyse du stock critique"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Layers className="w-3.5 h-3.5 text-[#D9531E]" />
              <span>
                Surveillance des seuils d’alerte · {criticalProducts.length}{' '}
                article(s) sous seuil
              </span>
            </div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white mt-0.5">
              Stock critique & santé par pôle
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('catalog', 'separated')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F2342] hover:bg-[#1A355E] dark:bg-[#D9531E] dark:hover:bg-[#B84315] rounded-lg transition-colors cursor-pointer"
            >
              Ouvrir le catalogue & stock
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('invoices')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Factures & Livraisons
            </button>
          </div>
        </div>

        {/* Pole Stock Health Summary Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30">
          {(
            [
              { pole: 'ciment', label: 'Pôle Ciment' },
              { pole: 'quincaillerie', label: 'Pôle Quincaillerie' },
              { pole: 'boissons', label: 'Pôle Boissons' },
            ] as { pole: ProductPole; label: string }[]
          ).map(({ pole, label }) => {
            const stat = stockHealthByPole[pole];
            return (
              <div key={pole} className="px-6 py-4 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {label}
                  </span>
                  <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
                    {stat.totalSku} réf. · {stat.totalUnits} u.
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono-tabular font-bold text-base text-slate-900 dark:text-white">
                    {formatFcfa(stat.retailValue, settings.currencyLabel)}
                  </span>
                  <span
                    className={`font-mono-tabular text-xs font-semibold ${
                      stat.criticalSku > 0
                        ? 'text-[#D9531E]'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {stat.criticalSku > 0
                      ? `${stat.criticalSku} critique(s)`
                      : 'Stock sain'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {criticalProducts.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <PackageCheck className="w-10 h-10 text-emerald-600 mx-auto" />
            <p className="font-display font-bold text-base text-slate-900 dark:text-white">
              Aucun article en stock critique
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Tous les produits des pôles Ciment, Quincaillerie et Boissons disposent d’un stock supérieur à leur seuil d’alerte.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
            {/* Horizontal Bar Chart of Top Critical Articles */}
            <div className="lg:col-span-6 p-6 space-y-3">
              <div>
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                  Top {topCriticalChartData.length} articles les plus critiques
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Comparaison du stock actuel face au seuil d’alerte configuré
                </p>
              </div>
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topCriticalChartData}
                    layout="vertical"
                    margin={{ top: 6, right: 18, left: 6, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke={gridStrokeColor}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: axisTickColor }}
                      tickLine={false}
                      axisLine={{ stroke: gridStrokeColor }}
                    />
                    <YAxis
                      type="category"
                      dataKey="shortName"
                      width={132}
                      tick={{ fontSize: 11, fill: axisTickColor }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                      content={<CriticalStockTooltip />}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
                    <Bar
                      dataKey="stockQty"
                      name="Stock actuel"
                      fill="#D9531E"
                      radius={[0, 3, 3, 0]}
                      barSize={10}
                    >
                      {topCriticalChartData.map((entry) => (
                        <Cell
                          key={entry.id}
                          fill={entry.isOut ? '#DC2626' : '#D9531E'}
                        />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="threshold"
                      name="Seuil alerte"
                      fill="#94A3B8"
                      radius={[0, 3, 3, 0]}
                      barSize={10}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Actionable Critical Stock Table */}
            <div className="lg:col-span-6 overflow-x-auto max-h-[380px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Article</th>
                    <th className="py-2.5 px-3 font-semibold">Pôle</th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      Stock
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      Seuil
                    </th>
                    <th className="py-2.5 px-4 font-semibold text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {criticalProducts.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">
                        {item.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {getPoleLabel(item.pole)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono-tabular font-bold ${
                          item.isOut
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-[#D9531E]'
                        }`}
                      >
                        {item.stockQty}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular text-slate-500 dark:text-slate-400">
                        {item.threshold}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onNavigate('catalog', item.pole)}
                          className="text-xs font-semibold text-[#0F2342] dark:text-[#FDBA74] hover:underline cursor-pointer"
                        >
                          Réapprovisionner
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
