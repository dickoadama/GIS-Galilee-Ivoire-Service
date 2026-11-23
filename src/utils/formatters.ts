import {
  DeliveryMode,
  Invoice,
  InvoiceStatus,
  PaymentMethod,
  Product,
  ProductPole,
  ProductSortOption,
  ROLE_LABELS,
  UserRole,
} from '../types/app';

export function formatFcfa(amount: number, currency = 'FCFA'): string {
  return `${new Intl.NumberFormat('fr-FR').format(Math.round(amount))} ${currency}`;
}

export function formatDateTime(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getUnitPriceForQty(
  product: Product,
  quantity: number
): { price: number; isWholesale: boolean } {
  if (quantity >= product.wholesaleMinQty) {
    return { price: product.wholesalePriceFcfa, isWholesale: true };
  }
  return { price: product.priceFcfa, isWholesale: false };
}

export function sortProducts(
  list: Product[],
  sortBy: ProductSortOption
): Product[] {
  const copy = [...list];
  switch (sortBy) {
    case 'alpha_asc':
      return copy.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    case 'alpha_desc':
      return copy.sort((a, b) => b.name.localeCompare(a.name, 'fr'));
    case 'price_asc':
      return copy.sort((a, b) => a.priceFcfa - b.priceFcfa);
    case 'price_desc':
      return copy.sort((a, b) => b.priceFcfa - a.priceFcfa);
    case 'priority_orders':
      return copy.sort((a, b) => {
        const scoreA = a.priorityScore * 10 + a.orderCount * 3 + a.outflowQty * 0.1;
        const scoreB = b.priorityScore * 10 + b.orderCount * 3 + b.outflowQty * 0.1;
        return scoreB - scoreA;
      });
  }
}

export function getPoleLabel(pole: ProductPole): string {
  switch (pole) {
    case 'ciment':
      return 'Ciment';
    case 'quincaillerie':
      return 'Quincaillerie';
    case 'boissons':
      return 'Boissons';
  }
}

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? role;
}

export function getPaymentLabel(method: PaymentMethod): string {
  switch (method) {
    case 'especes':
      return 'Espèces (à la livraison ou au magasin)';
    case 'orange_money':
      return 'Orange Money';
    case 'wave':
      return 'Wave';
    case 'mtn_momo':
      return 'MTN Mobile Money';
  }
}

export function getDeliveryLabel(mode: DeliveryMode): string {
  return mode === 'retrait_magasin'
    ? 'Retrait au magasin (Gare TSR)'
    : 'Livraison locale';
}

export function getInvoiceStatusLabel(status: InvoiceStatus): string {
  switch (status) {
    case 'brouillon':
      return 'Brouillon';
    case 'en_attente':
      return 'En attente';
    case 'en_preparation':
      return 'En préparation / Chargement';
    case 'prete_livree':
      return 'Prête / Livrée';
    case 'payee':
      return 'Payée';
    case 'annulee':
      return 'Annulée';
  }
}

export function buildInvoiceWhatsAppSummary(
  invoice: Invoice,
  companyName: string,
  currency = 'FCFA'
): string {
  const docLabel = invoice.docType === 'facture' ? 'FACTURE' : 'DEVIS';
  const lines = [
    `*${companyName} — ${docLabel} ${invoice.code}*`,
    `Client : ${invoice.customerName}${invoice.customerPhone ? ` (${invoice.customerPhone})` : ''}`,
    `Mode : ${getDeliveryLabel(invoice.deliveryMode)}`,
    invoice.customerAddress ? `Adresse : ${invoice.customerAddress}` : '',
    `Paiement : ${getPaymentLabel(invoice.paymentMethod)}`,
    '',
    '*Articles :*',
    ...invoice.items.map(
      (item) =>
        `- ${item.quantity}x ${item.name} [${getPoleLabel(item.pole)}] : ${formatFcfa(item.lineTotal, currency)}`
    ),
    '',
    `Sous-total Ciment & Quincaillerie : ${formatFcfa(invoice.cimentQuincaillerieSubtotal, currency)}`,
    `Sous-total Boissons : ${formatFcfa(invoice.boissonsSubtotal, currency)}`,
    invoice.discountFcfa > 0
      ? `Remise : -${formatFcfa(invoice.discountFcfa, currency)}`
      : '',
    `Livraison : ${invoice.deliveryFeeFcfa === 0 ? 'Offerte / Retrait' : formatFcfa(invoice.deliveryFeeFcfa, currency)}`,
    `*TOTAL TTC : ${formatFcfa(invoice.totalFcfa, currency)}*`,
  ].filter(Boolean);

  return lines.join('\n');
}
