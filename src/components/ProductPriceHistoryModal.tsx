import React, { useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  History,
  Lock,
  Minus,
  Pencil,
  TrendingUp,
  UserCheck,
  X,
} from 'lucide-react';
import { AuditLog, Product, StoreSettings } from '../types/app';
import { formatDateTime, formatFcfa, getPoleLabel, getRoleLabel } from '../utils/formatters';
import { buildProductPriceSummary } from '../utils/priceHistory';

interface ProductPriceHistoryModalProps {
  product: Product | null;
  auditLogs: AuditLog[];
  settings: StoreSettings;
  isAuthenticated: boolean;
  canEditProduct: boolean;
  onClose: () => void;
  onOpenEditor: (product: Product) => void;
  onSignIn?: () => void;
}

export const ProductPriceHistoryModal: React.FC<
  ProductPriceHistoryModalProps
> = ({
  product,
  auditLogs,
  settings,
  isAuthenticated,
  canEditProduct,
  onClose,
  onOpenEditor,
  onSignIn,
}) => {
  const summary = useMemo(() => {
    if (!product) return null;
    return buildProductPriceSummary(product, auditLogs);
  }, [product, auditLogs]);

  const chart = useMemo(() => {
    const pts = summary?.chartPoints ?? [];
    if (pts.length < 2) return null;

    const width = 560;
    const height = 160;
    const padLeft = 56;
    const padRight = 22;
    const padTop = 18;
    const padBottom = 26;
    const innerW = width - padLeft - padRight;
    const innerH = height - padTop - padBottom;

    const allPrices = pts.flatMap((pt) =>
      pt.wholesaleFcfa !== null
        ? [pt.retailFcfa, pt.wholesaleFcfa]
        : [pt.retailFcfa]
    );
    const minVal = Math.min(...allPrices);
    const maxVal = Math.max(...allPrices);
    const span = Math.max(100, maxVal - minVal);
    const yMin = Math.max(0, minVal - span * 0.15);
    const yMax = maxVal + span * 0.15;
    const ySpan = Math.max(1, yMax - yMin);

    const getX = (idx: number) =>
      padLeft + (idx / Math.max(1, pts.length - 1)) * innerW;
    const getY = (val: number) =>
      padTop + innerH - ((val - yMin) / ySpan) * innerH;

    const retailCoords = pts.map((pt, i) => ({
      x: getX(i),
      y: getY(pt.retailFcfa),
      val: pt.retailFcfa,
      label: pt.label,
    }));

    const wholesaleCoords = pts
      .map((pt, i) =>
        pt.wholesaleFcfa !== null
          ? {
              x: getX(i),
              y: getY(pt.wholesaleFcfa),
              val: pt.wholesaleFcfa,
            }
          : null
      )
      .filter((c): c is { x: number; y: number; val: number } => c !== null);

    const retailPolyline = retailCoords.map((c) => `${c.x},${c.y}`).join(' ');
    const wholesalePolyline =
      wholesaleCoords.length >= 2
        ? wholesaleCoords.map((c) => `${c.x},${c.y}`).join(' ')
        : null;

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      yMin,
      yMax,
      retailCoords,
      wholesaleCoords,
      retailPolyline,
      wholesalePolyline,
    };
  }, [summary]);

  if (!product || !summary) return null;

  const formatDelta = (delta: number | null, pct: number | null) => {
    if (delta === null || delta === 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
          <Minus className="w-3 h-3" />
          Inchangé
        </span>
      );
    }
    const isUp = delta > 0;
    const sign = isUp ? '+' : '';
    const pctStr =
      pct !== null ? ` (${sign}${pct.toFixed(1).replace('.', ',')}%)` : '';
    return (
      <span
        className={`inline-flex items-center gap-0.5 text-[11px] font-mono-tabular font-semibold ${
          isUp
            ? 'text-[#D9531E] dark:text-amber-400'
            : 'text-emerald-700 dark:text-emerald-400'
        }`}
      >
        {isUp ? (
          <ArrowUpRight className="w-3.5 h-3.5" />
        ) : (
          <ArrowDownRight className="w-3.5 h-3.5" />
        )}
        {sign}
        {formatFcfa(delta, settings.currencyLabel)}
        {pctStr}
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="price-history-title"
    >
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl max-w-3xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <History className="w-3.5 h-3.5 text-[#D9531E]" />
              <span>
                Historique des modifications de prix · {getPoleLabel(product.pole)} ·{' '}
                {product.category}
              </span>
            </div>
            <h2
              id="price-history-title"
              className="font-display font-bold text-xl text-slate-900 dark:text-white truncate"
            >
              {product.name}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canEditProduct && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEditor(product);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0F2342] hover:bg-[#1A355E] dark:bg-[#D9531E] dark:hover:bg-[#B84315] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <Pencil className="w-3.5 h-3.5" />
                Modifier tarif
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Fermer l’historique tarifaire"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Current Tariff & Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3.5">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Prix détail actuel
              </p>
              <p className="font-mono-tabular font-bold text-lg text-slate-900 dark:text-white mt-0.5">
                {formatFcfa(product.priceFcfa, settings.currencyLabel)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {product.unitLabel}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3.5">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Prix gros actuel
              </p>
              <p className="font-mono-tabular font-bold text-lg text-emerald-700 dark:text-emerald-400 mt-0.5">
                {formatFcfa(product.wholesalePriceFcfa, settings.currencyLabel)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                dès {product.wholesaleMinQty} u.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3.5">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Fluctuations tracées
              </p>
              <p className="font-mono-tabular font-bold text-lg text-slate-900 dark:text-white mt-0.5">
                {summary.changeCount}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Min {formatFcfa(summary.minRetailFcfa, settings.currencyLabel)} · Max{' '}
                {formatFcfa(summary.maxRetailFcfa, settings.currencyLabel)}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3.5">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Variation cumulée
              </p>
              <div className="mt-1">
                {summary.netRetailDeltaFcfa !== null ? (
                  formatDelta(
                    summary.netRetailDeltaFcfa,
                    summary.netRetailDeltaPct
                  )
                ) : (
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Tarif initial
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                {summary.lastUpdatedBy
                  ? `Par ${summary.lastUpdatedBy}`
                  : 'Aucune révision'}
              </p>
            </div>
          </div>

          {!isAuthenticated ? (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center space-y-3">
              <Lock className="w-7 h-7 text-[#D9531E] mx-auto" />
              <div className="space-y-1">
                <p className="font-display font-bold text-sm text-slate-900 dark:text-white">
                  Historique réservé à l’équipe connectée
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  Connectez-vous avec votre compte Google professionnel pour consulter le journal des fluctuations de prix issues des logs d’audit.
                </p>
              </div>
              {onSignIn && (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0F2342] hover:bg-[#1A355E] dark:bg-[#D9531E] dark:hover:bg-[#B84315] rounded-lg cursor-pointer"
                >
                  Se connecter avec Google
                </button>
              )}
            </div>
          ) : (
            <>
              {/* SVG Price Trend Chart */}
              {chart && (
                <section
                  aria-label="Courbe d'évolution tarifaire"
                  className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#D9531E]" />
                      <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                        Évolution des tarifs ({summary.chartPoints.length} points)
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] font-medium">
                      <span className="inline-flex items-center gap-1.5 text-[#0F2342] dark:text-amber-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#D9531E]" />
                        Prix détail
                      </span>
                      {chart.wholesalePolyline && (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                          Prix gros
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-full overflow-x-auto">
                    <svg
                      viewBox={`0 0 ${chart.width} ${chart.height}`}
                      className="w-full min-w-[420px] h-40"
                    >
                      {/* Horizontal gridlines */}
                      {[0, 0.5, 1].map((t) => {
                        const y =
                          chart.padTop +
                          t * (chart.height - chart.padTop - chart.padBottom);
                        const val = Math.round(
                          chart.yMax - t * (chart.yMax - chart.yMin)
                        );
                        return (
                          <g key={t}>
                            <line
                              x1={chart.padLeft}
                              x2={chart.width - chart.padRight}
                              y1={y}
                              y2={y}
                              stroke="currentColor"
                              className="text-slate-200 dark:text-slate-800"
                              strokeDasharray="3 3"
                            />
                            <text
                              x={chart.padLeft - 8}
                              y={y + 4}
                              textAnchor="end"
                              className="fill-slate-400 text-[10px] font-mono-tabular"
                            >
                              {val.toLocaleString('fr-FR')}
                            </text>
                          </g>
                        );
                      })}

                      {/* Wholesale curve */}
                      {chart.wholesalePolyline && (
                        <polyline
                          fill="none"
                          stroke="#059669"
                          strokeWidth="2"
                          strokeDasharray="4 3"
                          points={chart.wholesalePolyline}
                        />
                      )}

                      {/* Retail curve */}
                      <polyline
                        fill="none"
                        stroke="#D9531E"
                        strokeWidth="2.5"
                        points={chart.retailPolyline}
                      />

                      {/* Wholesale dots */}
                      {chart.wholesaleCoords.map((pt, i) => (
                        <circle
                          key={`w-${i}`}
                          cx={pt.x}
                          cy={pt.y}
                          r="3.5"
                          fill="#059669"
                        />
                      ))}

                      {/* Retail dots & X labels */}
                      {chart.retailCoords.map((pt, i) => (
                        <g key={`r-${i}`}>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="4.5"
                            fill="#D9531E"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                          <text
                            x={pt.x}
                            y={chart.height - 6}
                            textAnchor="middle"
                            className="fill-slate-500 dark:fill-slate-400 text-[10px]"
                          >
                            {pt.label}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </section>
              )}

              {/* Audit Logs Timeline */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                    Journal des fluctuations tarifaires ({summary.entries.length})
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Source : Audit Logs
                  </span>
                </div>

                {summary.entries.length === 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center space-y-2">
                    <Clock className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Aucune modification de prix enregistrée pour cet article
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                      Dès qu’un prix détail, prix gros ou coût d’achat est modifié depuis le Catalogue ou l’espace Super Admin, l’historique apparaît automatiquement ici.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {summary.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-4 bg-white dark:bg-slate-900/80 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                                entry.isCreation
                                  ? 'bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300'
                                  : 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300'
                              }`}
                            >
                              {entry.action}
                            </span>
                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                              {entry.actorName} ({getRoleLabel(entry.actorRole)})
                            </span>
                          </div>
                          <span className="font-mono-tabular text-[11px] text-slate-500 dark:text-slate-400">
                            {formatDateTime(entry.createdAt)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                          {/* Retail Transition */}
                          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2 space-y-0.5">
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Tarif détail
                            </p>
                            {entry.oldRetailFcfa !== null &&
                            entry.newRetailFcfa !== null ? (
                              <>
                                <p className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                                  {formatFcfa(
                                    entry.oldRetailFcfa,
                                    settings.currencyLabel
                                  )}{' '}
                                  →{' '}
                                  {formatFcfa(
                                    entry.newRetailFcfa,
                                    settings.currencyLabel
                                  )}
                                </p>
                                <div>
                                  {formatDelta(
                                    entry.retailDeltaFcfa,
                                    entry.retailDeltaPct
                                  )}
                                </div>
                              </>
                            ) : entry.newRetailFcfa !== null ? (
                              <p className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                                {formatFcfa(
                                  entry.newRetailFcfa,
                                  settings.currencyLabel
                                )}
                              </p>
                            ) : (
                              <p className="text-slate-400">—</p>
                            )}
                          </div>

                          {/* Wholesale Transition */}
                          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2 space-y-0.5">
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Tarif gros
                            </p>
                            {entry.oldWholesaleFcfa !== null &&
                            entry.newWholesaleFcfa !== null ? (
                              <>
                                <p className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                                  {formatFcfa(
                                    entry.oldWholesaleFcfa,
                                    settings.currencyLabel
                                  )}{' '}
                                  →{' '}
                                  {formatFcfa(
                                    entry.newWholesaleFcfa,
                                    settings.currencyLabel
                                  )}
                                </p>
                                <div>
                                  {formatDelta(
                                    entry.wholesaleDeltaFcfa,
                                    entry.wholesaleDeltaPct
                                  )}
                                </div>
                              </>
                            ) : entry.newWholesaleFcfa !== null ? (
                              <p className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                                {formatFcfa(
                                  entry.newWholesaleFcfa,
                                  settings.currencyLabel
                                )}
                              </p>
                            ) : (
                              <p className="text-slate-400">—</p>
                            )}
                          </div>

                          {/* Purchase Cost if logged */}
                          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2 space-y-0.5">
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Coût d’achat enregistré
                            </p>
                            {entry.purchaseCostFcfa !== null ? (
                              <p className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                                {formatFcfa(
                                  entry.purchaseCostFcfa,
                                  settings.currencyLabel
                                )}
                              </p>
                            ) : (
                              <p className="text-slate-400">Non renseigné</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
