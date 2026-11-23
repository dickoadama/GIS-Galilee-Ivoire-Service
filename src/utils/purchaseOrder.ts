import {
  Product,
  ProductPole,
  PurchaseOrder,
  PurchaseOrderPoleScope,
  PurchaseOrderStatus,
  StoreSettings,
} from '../types/app';
import { formatFcfa, getPoleLabel } from './formatters';

export interface SupplierPreset {
  poleScope: PurchaseOrderPoleScope;
  supplierName: string;
  supplierPhone: string;
  supplierAddress: string;
}

export const SUPPLIER_PRESETS: Record<PurchaseOrderPoleScope, SupplierPreset> = {
  ciment: {
    poleScope: 'ciment',
    supplierName: 'Centrale Ciments & Liants CI (Grossiste Usine)',
    supplierPhone: '07 00 10 20 30',
    supplierAddress: 'Zone Industrielle Vridi / Abidjan',
  },
  quincaillerie: {
    poleScope: 'quincaillerie',
    supplierName: 'Comptoir Général Quincaillerie & Matériaux',
    supplierPhone: '07 00 40 50 60',
    supplierAddress: 'Zone Industrielle / Dépôt Principal',
  },
  boissons: {
    poleScope: 'boissons',
    supplierName: 'Dépôt Distributeur Boissons & Eaux Minérales',
    supplierPhone: '07 00 70 80 90',
    supplierAddress: 'Entrepôt Régional Boissons',
  },
  mixte: {
    poleScope: 'mixte',
    supplierName: 'Centrale d’Approvisionnement Multi-Pôles GIS',
    supplierPhone: '07 06 04 49 79',
    supplierAddress: 'Plateforme Logistique Fournisseurs',
  },
};

export function calculateRecommendedRestockQty(product: Product): number {
  const threshold = Math.max(1, product.criticalStockThreshold ?? 15);
  const targetStock = Math.max(
    Math.ceil(threshold * 2.5),
    threshold + (product.wholesaleMinQty || 10),
    10
  );
  const deficit = Math.max(1, targetStock - product.stockQty);
  if (deficit >= 15) {
    return Math.ceil(deficit / 5) * 5;
  }
  return deficit;
}

export function estimateSupplierUnitCostFcfa(product: Product): number {
  if (
    typeof product.purchaseCostFcfa === 'number' &&
    product.purchaseCostFcfa > 0
  ) {
    return product.purchaseCostFcfa;
  }
  const base =
    product.wholesalePriceFcfa > 0
      ? product.wholesalePriceFcfa
      : product.priceFcfa;
  if (base <= 0) return 0;
  // Estimate supplier cost at ~88% of wholesale price rounded to nearest 50 FCFA
  return Math.max(50, Math.round((base * 0.88) / 50) * 50);
}

export function inferPoleScopeFromPoles(
  poles: ProductPole[]
): PurchaseOrderPoleScope {
  const unique = Array.from(new Set(poles));
  if (unique.length === 1) {
    return unique[0];
  }
  return 'mixte';
}

export function getPoleScopeLabel(scope: PurchaseOrderPoleScope): string {
  if (scope === 'mixte') return 'Multi-Pôles (Ciment, Quinc. & Boissons)';
  return getPoleLabel(scope);
}

export function getPurchaseOrderStatusLabel(
  status: PurchaseOrderStatus
): string {
  switch (status) {
    case 'brouillon':
      return 'Brouillon';
    case 'envoye':
      return 'Envoyé fournisseur';
    case 'receptionne':
      return 'Réceptionné (+ Stock)';
    case 'annule':
      return 'Annulé';
  }
}

export function getDefaultExpectedDeliveryDate(daysAhead = 2): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

export function generatePurchaseOrderCode(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(100 + Math.random() * 900);
  return `BC-GIS-${y}${m}${d}-${rand}`;
}

export function buildPurchaseOrderWhatsAppSummary(
  po: PurchaseOrder,
  companyName: string,
  currency = 'FCFA'
): string {
  const lines = [
    `*${companyName} — BON DE COMMANDE FOURNISSEUR ${po.code}*`,
    `Fournisseur : ${po.supplierName}${po.supplierPhone ? ` (${po.supplierPhone})` : ''}`,
    `Pôle concerné : ${getPoleScopeLabel(po.poleScope)}`,
    po.expectedDeliveryDate
      ? `Livraison souhaitée le : ${new Date(po.expectedDeliveryDate).toLocaleDateString('fr-FR')}`
      : '',
    '',
    '*Articles à réapprovisionner :*',
    ...po.items.map(
      (item) =>
        `- ${item.quantity}x ${item.name} (${item.unitLabel}) [Stock actuel: ${item.currentStockAtOrder} / Seuil: ${item.criticalThreshold}] — Estimé: ${formatFcfa(item.lineTotalFcfa, currency)}`
    ),
    '',
    `*TOTAL ESTIMÉ COMMANDE : ${formatFcfa(po.totalEstimatedFcfa, currency)}*`,
    po.notes ? `Note : ${po.notes}` : '',
    `Émis par : ${po.createdByName}`,
  ].filter(Boolean);

  return lines.join('\n');
}

export async function downloadPurchaseOrderAsPng(
  po: PurchaseOrder,
  settings: StoreSettings
): Promise<void> {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const w = 1240;
  const rowH = 56;
  const h = Math.max(1100, 600 + po.items.length * rowH + 240);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  // Header
  ctx.fillStyle = '#0F2342';
  ctx.fillRect(0, 0, w, 170);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 32px "Bricolage Grotesque", sans-serif';
  ctx.fillText(
    `${settings.poster.brandAcronym} — ${settings.poster.companyName}`,
    56,
    68
  );

  ctx.fillStyle = '#FDE047';
  ctx.font = '600 17px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `Réapprovisionnement Stock · ${getPoleScopeLabel(po.poleScope)}`,
    56,
    102
  );

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '500 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `Tél GIS : ${settings.poster.phones[0]} / ${settings.poster.phones[1]}`,
    56,
    134
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = '#F59E0B';
  ctx.font = '800 26px "Bricolage Grotesque", sans-serif';
  ctx.fillText('BON DE COMMANDE FOURNISSEUR', w - 56, 66);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 22px "JetBrains Mono", monospace';
  ctx.fillText(po.code, w - 56, 102);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '500 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `Statut : ${getPurchaseOrderStatusLabel(po.status)}`,
    w - 56,
    134
  );
  ctx.textAlign = 'left';

  // Supplier & Delivery Box
  let y = 212;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(56, y, w - 112, 134);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.strokeRect(56, y, w - 112, 134);

  ctx.fillStyle = '#64748B';
  ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('DESTINATAIRE / FOURNISSEUR', 80, y + 32);

  ctx.fillStyle = '#0F172A';
  ctx.font = '700 19px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(po.supplierName.slice(0, 48), 80, y + 64);

  ctx.fillStyle = '#334155';
  ctx.font = '500 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `Tél : ${po.supplierPhone || 'Non renseigné'} · ${po.supplierAddress || 'Adresse à confirmer'}`,
    80,
    y + 94
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748B';
  ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('DATE & RÉCEPTION SOUHAITÉE', w - 80, y + 32);

  ctx.fillStyle = '#0F172A';
  ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `Émis le ${new Date(po.createdAt).toLocaleDateString('fr-FR')}`,
    w - 80,
    y + 64
  );

  ctx.fillStyle = '#D9531E';
  ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    po.expectedDeliveryDate
      ? `Livraison souhaitée : ${new Date(po.expectedDeliveryDate).toLocaleDateString('fr-FR')}`
      : 'Livraison : Dès que possible',
    w - 80,
    y + 94
  );
  ctx.fillStyle = '#475569';
  ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Responsable : ${po.createdByName}`, w - 80, y + 118);
  ctx.textAlign = 'left';

  // Items Table
  y = 382;
  ctx.fillStyle = '#0F2342';
  ctx.fillRect(56, y, w - 112, 46);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('ARTICLE & CONDITIONNEMENT', 74, y + 29);
  ctx.fillText('PÔLE', 500, y + 29);
  ctx.textAlign = 'right';
  ctx.fillText('STOCK / SEUIL', 710, y + 29);
  ctx.fillText('QTÉ CMD', 840, y + 29);
  ctx.fillText('P.U. ESTIMÉ', 1005, y + 29);
  ctx.fillText('TOTAL', w - 74, y + 29);
  ctx.textAlign = 'left';

  y += 46;
  po.items.forEach((item, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    ctx.fillRect(56, y, w - 112, rowH);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(56, y + rowH);
    ctx.lineTo(w - 56, y + rowH);
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(item.name.slice(0, 38), 74, y + 26);
    ctx.fillStyle = '#64748B';
    ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(item.unitLabel, 74, y + 45);

    ctx.fillStyle = item.pole === 'boissons' ? '#0369A1' : '#D9531E';
    ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(getPoleLabel(item.pole).toUpperCase(), 500, y + 34);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#B45309';
    ctx.font = '600 14px "JetBrains Mono", monospace';
    ctx.fillText(
      `${item.currentStockAtOrder} / ${item.criticalThreshold}`,
      710,
      y + 34
    );
    ctx.fillStyle = '#0F172A';
    ctx.font = '700 15px "JetBrains Mono", monospace';
    ctx.fillText(String(item.quantity), 840, y + 34);
    ctx.font = '500 14px "JetBrains Mono", monospace';
    ctx.fillText(
      formatFcfa(item.estimatedUnitCostFcfa, settings.currencyLabel),
      1005,
      y + 34
    );
    ctx.font = '700 15px "JetBrains Mono", monospace';
    ctx.fillText(
      formatFcfa(item.lineTotalFcfa, settings.currencyLabel),
      w - 74,
      y + 34
    );
    ctx.textAlign = 'left';
    y += rowH;
  });

  // Notes + Total
  y += 32;
  if (po.notes) {
    ctx.fillStyle = '#475569';
    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('OBSERVATIONS / CONDITIONS :', 56, y + 22);
    ctx.font = '500 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(po.notes.slice(0, 80), 56, y + 48);
  }

  const boxX = w - 56 - 440;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(boxX, y, 440, 108);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(boxX, y, 440, 108);

  ctx.fillStyle = '#475569';
  ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Nombre d’articles : ${po.items.length}`, boxX + 22, y + 36);

  ctx.fillStyle = '#0F2342';
  ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('TOTAL ESTIMÉ COMMANDE', boxX + 22, y + 78);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#D9531E';
  ctx.font = '800 22px "JetBrains Mono", monospace';
  ctx.fillText(
    formatFcfa(po.totalEstimatedFcfa, settings.currencyLabel),
    boxX + 418,
    y + 78
  );
  ctx.textAlign = 'left';

  // Footer
  ctx.fillStyle = '#64748B';
  ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(settings.poster.location.slice(0, 110), 56, h - 52);
  ctx.fillStyle = '#0F2342';
  ctx.font = '700 14px "Bricolage Grotesque", sans-serif';
  ctx.fillText(
    'Document de réapprovisionnement interne — Visa Gérant / Direction GIS',
    56,
    h - 26
  );

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `${po.code}-bon-fournisseur.png`;
  link.href = dataUrl;
  link.click();
}

export function downloadPurchaseOrderAsCsv(
  po: PurchaseOrder,
  settings: StoreSettings
): void {
  const rows = [
    ['BON DE COMMANDE FOURNISSEUR', po.code, getPurchaseOrderStatusLabel(po.status)],
    ['Fournisseur', po.supplierName, po.supplierPhone],
    ['Adresse fournisseur', po.supplierAddress, po.expectedDeliveryDate],
    ['', '', ''],
    [
      'Article',
      'Pôle',
      'Conditionnement',
      'Stock actuel',
      'Seuil critique',
      'Qté commandée',
      'P.U. achat estimé',
      'Total estimé',
    ],
    ...po.items.map((item) => [
      item.name,
      getPoleLabel(item.pole),
      item.unitLabel,
      String(item.currentStockAtOrder),
      String(item.criticalThreshold),
      String(item.quantity),
      String(item.estimatedUnitCostFcfa),
      String(item.lineTotalFcfa),
    ]),
    ['', '', '', '', '', '', '', ''],
    ['TOTAL ESTIMÉ', String(po.totalEstimatedFcfa), settings.currencyLabel],
  ];

  const csv = rows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${po.code}-bon-fournisseur.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
