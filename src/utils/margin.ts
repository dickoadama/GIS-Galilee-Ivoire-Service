import { Product } from '../types/app';

export type MarginFormulaMode = 'on_selling_price' | 'on_cost';
export type MarginHealthStatus = 'deficit' | 'below_target' | 'on_target';

export interface ProductMarginMetrics {
  costFcfa: number;
  retailPriceFcfa: number;
  wholesalePriceFcfa: number;
  targetPct: number;
  retailProfitFcfa: number;
  retailMarginPct: number;
  wholesaleProfitFcfa: number;
  wholesaleMarginPct: number;
  stockProfitPotentialFcfa: number;
  stockCostValueFcfa: number;
  status: MarginHealthStatus;
}

export function getDefaultPurchaseCostFcfa(product: Product): number {
  if (
    typeof product.purchaseCostFcfa === 'number' &&
    product.purchaseCostFcfa >= 0
  ) {
    return product.purchaseCostFcfa;
  }
  const base =
    product.wholesalePriceFcfa > 0
      ? product.wholesalePriceFcfa
      : product.priceFcfa;
  if (base <= 0) return 0;
  return Math.max(50, Math.round((base * 0.88) / 50) * 50);
}

export function getDefaultTargetMarginPct(product: Product): number {
  if (
    typeof product.targetMarginPct === 'number' &&
    product.targetMarginPct >= 0
  ) {
    return product.targetMarginPct;
  }
  return 18;
}

export function calculateMarginPct(
  sellingPrice: number,
  cost: number,
  mode: MarginFormulaMode
): number {
  if (sellingPrice <= 0 && cost <= 0) return 0;
  const profit = sellingPrice - cost;
  if (mode === 'on_selling_price') {
    return sellingPrice > 0 ? (profit / sellingPrice) * 100 : -100;
  }
  return cost > 0 ? (profit / cost) * 100 : sellingPrice > 0 ? 100 : 0;
}

export function roundPriceFcfa(rawPrice: number, step: number): number {
  const safe = Math.max(0, rawPrice);
  if (step <= 1) return Math.round(safe);
  return Math.ceil(safe / step) * step;
}

export function calculateRecommendedSellingPrice(
  cost: number,
  targetPct: number,
  mode: MarginFormulaMode,
  roundingStep = 50
): number {
  const safeCost = Math.max(0, cost);
  const safePct = Math.max(0, targetPct);
  let raw = safeCost;
  if (mode === 'on_selling_price') {
    const cappedPct = Math.min(90, safePct);
    raw = safeCost / (1 - cappedPct / 100);
  } else {
    raw = safeCost * (1 + safePct / 100);
  }
  return roundPriceFcfa(raw, roundingStep);
}

export function computeProductMarginMetrics(
  product: Product,
  costFcfa: number,
  retailPriceFcfa: number,
  wholesalePriceFcfa: number,
  targetPct: number,
  mode: MarginFormulaMode
): ProductMarginMetrics {
  const retailProfitFcfa = retailPriceFcfa - costFcfa;
  const wholesaleProfitFcfa = wholesalePriceFcfa - costFcfa;
  const retailMarginPct = calculateMarginPct(retailPriceFcfa, costFcfa, mode);
  const wholesaleMarginPct = calculateMarginPct(
    wholesalePriceFcfa,
    costFcfa,
    mode
  );

  let status: MarginHealthStatus = 'on_target';
  if (retailProfitFcfa <= 0 || wholesaleProfitFcfa < 0) {
    status = 'deficit';
  } else if (retailMarginPct + 0.05 < targetPct) {
    status = 'below_target';
  }

  return {
    costFcfa,
    retailPriceFcfa,
    wholesalePriceFcfa,
    targetPct,
    retailProfitFcfa,
    retailMarginPct,
    wholesaleProfitFcfa,
    wholesaleMarginPct,
    stockProfitPotentialFcfa: retailProfitFcfa * product.stockQty,
    stockCostValueFcfa: costFcfa * product.stockQty,
    status,
  };
}
