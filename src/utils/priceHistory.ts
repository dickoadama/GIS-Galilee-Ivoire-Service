import { AuditLog, Product } from '../types/app';

export interface ProductPriceHistoryEntry {
  id: string;
  createdAt: string;
  actorName: string;
  actorRole: AuditLog['actorRole'];
  action: string;
  rawDetail: string;
  isCreation: boolean;
  oldRetailFcfa: number | null;
  newRetailFcfa: number | null;
  retailDeltaFcfa: number | null;
  retailDeltaPct: number | null;
  oldWholesaleFcfa: number | null;
  newWholesaleFcfa: number | null;
  wholesaleDeltaFcfa: number | null;
  wholesaleDeltaPct: number | null;
  purchaseCostFcfa: number | null;
}

export interface ProductPriceChartPoint {
  id: string;
  createdAt: string;
  label: string;
  retailFcfa: number;
  wholesaleFcfa: number | null;
  actorName: string;
}

export interface ProductPriceSummary {
  entries: ProductPriceHistoryEntry[];
  chartPoints: ProductPriceChartPoint[];
  changeCount: number;
  minRetailFcfa: number;
  maxRetailFcfa: number;
  netRetailDeltaFcfa: number | null;
  netRetailDeltaPct: number | null;
  lastUpdatedAt: string | null;
  lastUpdatedBy: string | null;
}

function isProductPriceAction(action: string): boolean {
  const lower = action.toLowerCase();
  return (
    lower.includes('prix') ||
    lower.includes('tarif') ||
    lower.includes('marge') ||
    lower.includes('ajout article catalogue')
  );
}

function extractTargetProductName(targetLabel: string): string {
  const trimmed = targetLabel.trim();
  const detailIdx = trimmed.search(/\s+\((?:Détail|Stock|Coût)\b/i);
  if (detailIdx > 0) {
    return trimmed.slice(0, detailIdx).trim();
  }
  const tagIdx = trimmed.indexOf(' [#');
  if (tagIdx > 0) {
    return trimmed.slice(0, tagIdx).trim();
  }
  return trimmed;
}

export function doesAuditLogMatchProduct(
  log: AuditLog,
  product: Product
): boolean {
  if (!isProductPriceAction(log.action)) return false;
  const target = (log.targetLabel || '').trim();
  if (!target) return false;

  if (target.includes(`[#${product.id}]`)) return true;

  const prodNameLower = product.name.trim().toLowerCase();
  const extractedLower = extractTargetProductName(target).toLowerCase();
  if (extractedLower === prodNameLower) return true;

  const targetLower = target.toLowerCase();
  if (
    targetLower === prodNameLower ||
    targetLower.startsWith(`${prodNameLower} (détail`) ||
    targetLower.startsWith(`${prodNameLower} (stock`) ||
    targetLower.startsWith(`${prodNameLower} ·`)
  ) {
    return true;
  }

  return false;
}

function computePct(oldVal: number, newVal: number): number | null {
  if (oldVal <= 0) return null;
  return ((newVal - oldVal) / oldVal) * 100;
}

export function parseProductPriceEntry(
  log: AuditLog
): ProductPriceHistoryEntry {
  const detail = log.targetLabel || '';
  const isCreation = log.action.toLowerCase().includes('ajout article');

  // Format: Détail 4800→5000 (or ->)
  const retailTransition = detail.match(
    /Détail\s+(\d+)\s*(?:→|->)\s*(\d+)/i
  );
  // Format at creation: Détail 4800 · Gros 4550
  const retailInitial = !retailTransition
    ? detail.match(/Détail\s+(\d+)\b/i)
    : null;

  const wholesaleTransition = detail.match(
    /Gros\s+(\d+)\s*(?:→|->)\s*(\d+)/i
  );
  const wholesaleInitial = !wholesaleTransition
    ? detail.match(/Gros\s+(\d+)\b/i)
    : null;

  const costMatch = detail.match(/Coût\s+(?:\d+\s*(?:→|->)\s*)?(\d+)/i);

  const oldRetailFcfa = retailTransition ? Number(retailTransition[1]) : null;
  const newRetailFcfa = retailTransition
    ? Number(retailTransition[2])
    : retailInitial
      ? Number(retailInitial[1])
      : null;

  const retailDeltaFcfa =
    oldRetailFcfa !== null && newRetailFcfa !== null
      ? newRetailFcfa - oldRetailFcfa
      : null;
  const retailDeltaPct =
    oldRetailFcfa !== null && newRetailFcfa !== null
      ? computePct(oldRetailFcfa, newRetailFcfa)
      : null;

  const oldWholesaleFcfa = wholesaleTransition
    ? Number(wholesaleTransition[1])
    : null;
  const newWholesaleFcfa = wholesaleTransition
    ? Number(wholesaleTransition[2])
    : wholesaleInitial
      ? Number(wholesaleInitial[1])
      : null;

  const wholesaleDeltaFcfa =
    oldWholesaleFcfa !== null && newWholesaleFcfa !== null
      ? newWholesaleFcfa - oldWholesaleFcfa
      : null;
  const wholesaleDeltaPct =
    oldWholesaleFcfa !== null && newWholesaleFcfa !== null
      ? computePct(oldWholesaleFcfa, newWholesaleFcfa)
      : null;

  const purchaseCostFcfa = costMatch ? Number(costMatch[1]) : null;

  return {
    id: log.id,
    createdAt: log.createdAt,
    actorName: log.actorName,
    actorRole: log.actorRole,
    action: log.action,
    rawDetail: detail,
    isCreation,
    oldRetailFcfa,
    newRetailFcfa,
    retailDeltaFcfa,
    retailDeltaPct,
    oldWholesaleFcfa,
    newWholesaleFcfa,
    wholesaleDeltaFcfa,
    wholesaleDeltaPct,
    purchaseCostFcfa,
  };
}

export function buildProductPriceSummary(
  product: Product,
  auditLogs: AuditLog[]
): ProductPriceSummary {
  const matchedLogs = auditLogs
    .filter((log) => doesAuditLogMatchProduct(log, product))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const entries = matchedLogs.map(parseProductPriceEntry);

  // Build chronological points (oldest -> newest) for fluctuation chart
  const chronological = [...entries].reverse();
  const chartPoints: ProductPriceChartPoint[] = [];

  if (chronological.length > 0) {
    const first = chronological[0];
    if (first.oldRetailFcfa !== null) {
      chartPoints.push({
        id: `${first.id}-initial`,
        createdAt: first.createdAt,
        label: 'Initial',
        retailFcfa: first.oldRetailFcfa,
        wholesaleFcfa: first.oldWholesaleFcfa,
        actorName: 'Tarif précédent',
      });
    }

    for (const entry of chronological) {
      if (entry.newRetailFcfa !== null) {
        const dt = new Date(entry.createdAt);
        const label = Number.isNaN(dt.getTime())
          ? 'MAJ'
          : dt.toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
            });
        chartPoints.push({
          id: entry.id,
          createdAt: entry.createdAt,
          label,
          retailFcfa: entry.newRetailFcfa,
          wholesaleFcfa: entry.newWholesaleFcfa,
          actorName: entry.actorName,
        });
      }
    }
  }

  // Ensure current live price is represented if chart has points but latest differs
  if (
    chartPoints.length > 0 &&
    chartPoints[chartPoints.length - 1].retailFcfa !== product.priceFcfa
  ) {
    chartPoints.push({
      id: `${product.id}-current`,
      createdAt: product.updatedAt || new Date().toISOString(),
      label: 'Actuel',
      retailFcfa: product.priceFcfa,
      wholesaleFcfa: product.wholesalePriceFcfa,
      actorName: 'Tarif actuel',
    });
  }

  const allObservedRetail = [
    product.priceFcfa,
    ...entries
      .flatMap((e) => [e.oldRetailFcfa, e.newRetailFcfa])
      .filter((v): v is number => v !== null && v > 0),
  ];

  const minRetailFcfa = Math.min(...allObservedRetail);
  const maxRetailFcfa = Math.max(...allObservedRetail);

  const firstBaselineRetail =
    chartPoints.length > 0 ? chartPoints[0].retailFcfa : null;
  const netRetailDeltaFcfa =
    firstBaselineRetail !== null
      ? product.priceFcfa - firstBaselineRetail
      : null;
  const netRetailDeltaPct =
    firstBaselineRetail !== null && firstBaselineRetail > 0
      ? ((product.priceFcfa - firstBaselineRetail) / firstBaselineRetail) * 100
      : null;

  const latest = entries[0] ?? null;

  return {
    entries,
    chartPoints,
    changeCount: entries.filter((e) => !e.isCreation).length,
    minRetailFcfa,
    maxRetailFcfa,
    netRetailDeltaFcfa,
    netRetailDeltaPct,
    lastUpdatedAt: latest?.createdAt ?? product.updatedAt ?? null,
    lastUpdatedBy: latest?.actorName ?? null,
  };
}
