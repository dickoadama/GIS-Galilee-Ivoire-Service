import {
  DEFAULT_POSTER_CONTENT,
  type PosterContent,
  type PosterFormat,
  type PosterModelId,
} from './poster.ts';

export type PageId =
  | 'home'
  | 'dashboard'
  | 'catalog'
  | 'studio'
  | 'invoices'
  | 'chat'
  | 'members'
  | 'super_admin'
  | 'settings';

export type ProductPole = 'ciment' | 'quincaillerie' | 'boissons';

export type ProductSortOption =
  | 'priority_orders'
  | 'alpha_asc'
  | 'alpha_desc'
  | 'price_asc'
  | 'price_desc';

export type UserRole =
  | 'super_admin'
  | 'admin_patron'
  | 'caisse'
  | 'chargeur'
  | 'chauffeur'
  | 'gerant_boisson'
  | 'gerant_ciment'
  | 'client';

export type StaffRole = Exclude<UserRole, 'client'>;

export interface Member {
  id: string;
  uid?: string;
  fullName: string;
  email: string;
  phone: string;
  role: StaffRole;
  active: boolean;
  assignedByUid: string;
  staffViewerUids: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  barcode?: string;
  pole: ProductPole;
  category: string;
  name: string;
  unitLabel: string;
  priceFcfa: number;
  wholesalePriceFcfa: number;
  wholesaleMinQty: number;
  purchaseCostFcfa?: number;
  targetMarginPct?: number;
  inStock: boolean;
  stockQty: number;
  criticalStockThreshold: number;
  priorityScore: number;
  orderCount: number;
  outflowQty: number;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export type InvoiceDocType = 'facture' | 'devis';

export type InvoiceStatus =
  | 'brouillon'
  | 'en_attente'
  | 'en_preparation'
  | 'prete_livree'
  | 'payee'
  | 'annulee';

export type DeliveryMode = 'retrait_magasin' | 'livraison_locale';

export type PaymentMethod =
  | 'especes'
  | 'orange_money'
  | 'wave'
  | 'mtn_momo';

export interface InvoiceLineItem {
  id: string;
  productId: string;
  pole: ProductPole;
  name: string;
  unitLabel: string;
  quantity: number;
  appliedUnitPrice: number;
  isWholesale: boolean;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  docType: InvoiceDocType;
  code: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deliveryMode: DeliveryMode;
  paymentMethod: PaymentMethod;
  notes: string;
  status: InvoiceStatus;
  items: InvoiceLineItem[];
  discountFcfa: number;
  deliveryFeeFcfa: number;
  cimentQuincaillerieSubtotal: number;
  boissonsSubtotal: number;
  totalFcfa: number;
  createdByUid: string;
  createdByName: string;
  assignedLoaderName?: string;
  assignedDriverName?: string;
  staffReaderUids: string[];
}

export type PurchaseOrderPoleScope =
  | 'ciment'
  | 'quincaillerie'
  | 'boissons'
  | 'mixte';

export type PurchaseOrderStatus =
  | 'brouillon'
  | 'envoye'
  | 'receptionne'
  | 'annule';

export interface PurchaseOrderLineItem {
  id: string;
  productId: string;
  pole: ProductPole;
  name: string;
  unitLabel: string;
  currentStockAtOrder: number;
  criticalThreshold: number;
  quantity: number;
  estimatedUnitCostFcfa: number;
  lineTotalFcfa: number;
}

export interface PurchaseOrder {
  id: string;
  code: string;
  poleScope: PurchaseOrderPoleScope;
  supplierName: string;
  supplierPhone: string;
  supplierAddress: string;
  expectedDeliveryDate: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderLineItem[];
  totalEstimatedFcfa: number;
  notes: string;
  createdByUid: string;
  createdByName: string;
  staffReaderUids: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  type: 'groupe' | 'direct';
  isTeamChannel: boolean;
  participantUids: string[];
  lastMessageText: string;
  lastSenderName: string;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  senderUid: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  participantUids: string[];
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetLabel?: string;
  createdAt: string;
}

export interface ContactInquiry {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  pole: ProductPole | 'tous';
  message: string;
}

export interface StoreSettings {
  poster: PosterContent;
  defaultModel: PosterModelId;
  defaultFormat: PosterFormat;
  theme: 'light' | 'dark';
  currencyLabel: string;
  deliveryFeeFcfa: number;
  freeDeliveryThresholdFcfa: number;
  hoursWeekdays: string;
  hoursSaturday: string;
  hoursSunday: string;
  whatsappPhone: string;
  email: string;
  acceptedPayments: PaymentMethod[];
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin (Créateur)',
  admin_patron: 'Admin (Patron)',
  caisse: 'Caisse',
  chargeur: 'Chargeur',
  chauffeur: 'Chauffeur',
  gerant_boisson: 'Gérant Boisson (Stock Boissons)',
  gerant_ciment: 'Gérant Ciment (Stock Ciment & Quincaillerie)',
  client: 'Client',
};

export const WORKER_ROLES: StaffRole[] = [
  'caisse',
  'chargeur',
  'chauffeur',
  'gerant_boisson',
  'gerant_ciment',
];

export const ALL_STAFF_ROLES: StaffRole[] = [
  'super_admin',
  'admin_patron',
  'caisse',
  'chargeur',
  'chauffeur',
  'gerant_boisson',
  'gerant_ciment',
];

export const DEFAULT_SETTINGS: StoreSettings = {
  poster: DEFAULT_POSTER_CONTENT,
  defaultModel: 'editorial',
  defaultFormat: 'landscape',
  theme: 'light',
  currencyLabel: 'FCFA',
  deliveryFeeFcfa: 2000,
  freeDeliveryThresholdFcfa: 50000,
  hoursWeekdays: '07h30 – 19h30',
  hoursSaturday: '07h30 – 19h00',
  hoursSunday: '09h00 – 14h00 (Boissons & Dépannage)',
  whatsappPhone: '0706044979',
  email: 'contact@galilee-ivoire-service.ci',
  acceptedPayments: ['especes', 'orange_money', 'wave', 'mtn_momo'],
};

export const DEFAULT_PRODUCTS: Product[] = [
  // CIMENT (Tarif Ciment dédié — prix indicatifs à modifier dans Super Admin / Catalogue)
  {
    id: 'c-ciment-cpj425',
    barcode: '6181000100014',
    pole: 'ciment',
    category: 'Ciments & Liants',
    name: 'Ciment 42,5 (CIMEN 42,5)',
    unitLabel: 'Sac de 50 kg',
    priceFcfa: 4800,
    wholesalePriceFcfa: 4550,
    wholesaleMinQty: 20,
    purchaseCostFcfa: 4000,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 300,
    criticalStockThreshold: 60,
    priorityScore: 100,
    orderCount: 142,
    outflowQty: 1850,
    description:
      'Ciment 42,5 — tarif indicatif, prix à modifier selon le barème en vigueur.',
  },

  // QUINCAILLERIE — Fers à béton & Fils
  {
    id: 'q-fer-6',
    barcode: '6181000200011',
    pole: 'quincaillerie',
    category: 'Fers à béton & Fils',
    name: 'FER 6',
    unitLabel: 'Barre',
    priceFcfa: 1800,
    wholesalePriceFcfa: 1650,
    wholesaleMinQty: 25,
    purchaseCostFcfa: 1450,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 160,
    criticalStockThreshold: 40,
    priorityScore: 95,
    orderCount: 64,
    outflowQty: 620,
    description:
      'Fer à béton Ø 6 — tarif indicatif, prix à modifier selon arrivage.',
  },
  {
    id: 'q-fer-8-noir',
    barcode: '6181000200028',
    pole: 'quincaillerie',
    category: 'Fers à béton & Fils',
    name: 'FER 8 NOIR',
    unitLabel: 'Barre',
    priceFcfa: 2700,
    wholesalePriceFcfa: 2500,
    wholesaleMinQty: 25,
    purchaseCostFcfa: 2200,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 180,
    criticalStockThreshold: 40,
    priorityScore: 94,
    orderCount: 72,
    outflowQty: 740,
    description:
      'Fer à béton Ø 8 noir — tarif indicatif, prix à modifier selon arrivage.',
  },
  {
    id: 'q-fer-8-blanc',
    barcode: '6181000200035',
    pole: 'quincaillerie',
    category: 'Fers à béton & Fils',
    name: 'FER 8 BLANC',
    unitLabel: 'Barre',
    priceFcfa: 2900,
    wholesalePriceFcfa: 2700,
    wholesaleMinQty: 25,
    purchaseCostFcfa: 2350,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 140,
    criticalStockThreshold: 35,
    priorityScore: 93,
    orderCount: 58,
    outflowQty: 510,
    description:
      'Fer à béton Ø 8 blanc — tarif indicatif, prix à modifier selon arrivage.',
  },
  {
    id: 'q-fer-10-noir',
    barcode: '6181000200042',
    pole: 'quincaillerie',
    category: 'Fers à béton & Fils',
    name: 'FER 10 NOIR',
    unitLabel: 'Barre',
    priceFcfa: 3800,
    wholesalePriceFcfa: 3550,
    wholesaleMinQty: 25,
    purchaseCostFcfa: 3100,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 190,
    criticalStockThreshold: 45,
    priorityScore: 92,
    orderCount: 88,
    outflowQty: 940,
    description:
      'Fer à béton Ø 10 noir — tarif indicatif, prix à modifier selon arrivage.',
  },
  {
    id: 'q-fer-10-blanc',
    barcode: '6181000200059',
    pole: 'quincaillerie',
    category: 'Fers à béton & Fils',
    name: 'FER 10 BLANC',
    unitLabel: 'Barre',
    priceFcfa: 4100,
    wholesalePriceFcfa: 3850,
    wholesaleMinQty: 25,
    purchaseCostFcfa: 3350,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 150,
    criticalStockThreshold: 40,
    priorityScore: 91,
    orderCount: 61,
    outflowQty: 590,
    description:
      'Fer à béton Ø 10 blanc — tarif indicatif, prix à modifier selon arrivage.',
  },
  {
    id: 'q-fer-12-noir',
    barcode: '6181000200066',
    pole: 'quincaillerie',
    category: 'Fers à béton & Fils',
    name: 'FER 12 NOIR',
    unitLabel: 'Barre',
    priceFcfa: 5400,
    wholesalePriceFcfa: 5100,
    wholesaleMinQty: 20,
    purchaseCostFcfa: 4450,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 130,
    criticalStockThreshold: 35,
    priorityScore: 90,
    orderCount: 54,
    outflowQty: 480,
    description:
      'Fer à béton Ø 12 noir — tarif indicatif, prix à modifier selon arrivage.',
  },
  {
    id: 'q-fer-12-blanc',
    barcode: '6181000200073',
    pole: 'quincaillerie',
    category: 'Fers à béton & Fils',
    name: 'FER 12 BLANC',
    unitLabel: 'Barre',
    priceFcfa: 5700,
    wholesalePriceFcfa: 5400,
    wholesaleMinQty: 20,
    purchaseCostFcfa: 4700,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 110,
    criticalStockThreshold: 30,
    priorityScore: 89,
    orderCount: 45,
    outflowQty: 390,
    description:
      'Fer à béton Ø 12 blanc — tarif indicatif, prix à modifier selon arrivage.',
  },
  {
    id: 'q-fil-attache',
    barcode: '6181000200080',
    pole: 'quincaillerie',
    category: 'Fers à béton & Fils',
    name: 'FIL ATTACHE',
    unitLabel: 'Rouleau / Botte',
    priceFcfa: 1500,
    wholesalePriceFcfa: 1350,
    wholesaleMinQty: 10,
    purchaseCostFcfa: 1200,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 95,
    criticalStockThreshold: 25,
    priorityScore: 88,
    orderCount: 49,
    outflowQty: 310,
    description:
      'Fil d’attache pour ligature ferraillage — tarif indicatif, prix à modifier.',
  },
  {
    id: 'q-fer-21',
    barcode: '6181000200097',
    pole: 'quincaillerie',
    category: 'Fers à béton & Fils',
    name: 'FER 21',
    unitLabel: 'Barre',
    priceFcfa: 6500,
    wholesalePriceFcfa: 6100,
    wholesaleMinQty: 15,
    purchaseCostFcfa: 5300,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 80,
    criticalStockThreshold: 20,
    priorityScore: 87,
    orderCount: 28,
    outflowQty: 180,
    description:
      'Fer 21 — tarif indicatif, prix à modifier selon arrivage.',
  },
  {
    id: 'q-fer-attache-g',
    barcode: '6181000200103',
    pole: 'quincaillerie',
    category: 'Fers à béton & Fils',
    name: 'FER ATTACHE G',
    unitLabel: 'Rouleau / Botte',
    priceFcfa: 2000,
    wholesalePriceFcfa: 1800,
    wholesaleMinQty: 10,
    purchaseCostFcfa: 1600,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 75,
    criticalStockThreshold: 20,
    priorityScore: 86,
    orderCount: 34,
    outflowQty: 210,
    description:
      'Fer / Fil attache G — tarif indicatif, prix à modifier selon arrivage.',
  },

  // QUINCAILLERIE — Tôles & Faîtières
  {
    id: 'q-tole-5-etoiles',
    barcode: '6181000200110',
    pole: 'quincaillerie',
    category: 'Tôles & Faîtières',
    name: 'TOLE 5 ETOILE',
    unitLabel: 'Feuille',
    priceFcfa: 5500,
    wholesalePriceFcfa: 5200,
    wholesaleMinQty: 20,
    purchaseCostFcfa: 4500,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 140,
    criticalStockThreshold: 30,
    priorityScore: 85,
    orderCount: 52,
    outflowQty: 410,
    description:
      'Tôle 5 Étoiles — tarif indicatif, prix à modifier selon le barème.',
  },
  {
    id: 'q-tole-super',
    barcode: '6181000200127',
    pole: 'quincaillerie',
    category: 'Tôles & Faîtières',
    name: 'TOLE SUPER',
    unitLabel: 'Feuille',
    priceFcfa: 4800,
    wholesalePriceFcfa: 4500,
    wholesaleMinQty: 20,
    purchaseCostFcfa: 3900,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 120,
    criticalStockThreshold: 30,
    priorityScore: 84,
    orderCount: 44,
    outflowQty: 340,
    description:
      'Tôle Super — tarif indicatif, prix à modifier selon le barème.',
  },
  {
    id: 'q-tole-1-etoile',
    barcode: '6181000200134',
    pole: 'quincaillerie',
    category: 'Tôles & Faîtières',
    name: 'TOLE 1 ETOILE',
    unitLabel: 'Feuille',
    priceFcfa: 3900,
    wholesalePriceFcfa: 3650,
    wholesaleMinQty: 20,
    purchaseCostFcfa: 3200,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 150,
    criticalStockThreshold: 35,
    priorityScore: 83,
    orderCount: 48,
    outflowQty: 380,
    description:
      'Tôle 1 Étoile — tarif indicatif, prix à modifier selon le barème.',
  },
  {
    id: 'q-tole-tim',
    barcode: '6181000200141',
    pole: 'quincaillerie',
    category: 'Tôles & Faîtières',
    name: 'TOLE TIM',
    unitLabel: 'Feuille',
    priceFcfa: 4500,
    wholesalePriceFcfa: 4200,
    wholesaleMinQty: 20,
    purchaseCostFcfa: 3700,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 100,
    criticalStockThreshold: 25,
    priorityScore: 82,
    orderCount: 33,
    outflowQty: 245,
    description:
      'Tôle TIM — tarif indicatif, prix à modifier selon le barème.',
  },
  {
    id: 'q-tole-couleur',
    barcode: '6181000200158',
    pole: 'quincaillerie',
    category: 'Tôles & Faîtières',
    name: 'TOLE COULEUR',
    unitLabel: 'Feuille',
    priceFcfa: 6200,
    wholesalePriceFcfa: 5850,
    wholesaleMinQty: 20,
    purchaseCostFcfa: 5100,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 115,
    criticalStockThreshold: 30,
    priorityScore: 81,
    orderCount: 46,
    outflowQty: 330,
    description:
      'Tôle prélaquée couleur — tarif indicatif, prix à modifier selon le barème.',
  },
  {
    id: 'q-tole-plant-ele',
    barcode: '6181000200165',
    pole: 'quincaillerie',
    category: 'Tôles & Faîtières',
    name: 'TOLE PLANT/ELE',
    unitLabel: 'Feuille',
    priceFcfa: 5000,
    wholesalePriceFcfa: 4700,
    wholesaleMinQty: 20,
    purchaseCostFcfa: 4100,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 90,
    criticalStockThreshold: 25,
    priorityScore: 80,
    orderCount: 29,
    outflowQty: 205,
    description:
      'Tôle Plant / Éléphant — tarif indicatif, prix à modifier selon le barème.',
  },
  {
    id: 'q-faitiere-ord',
    barcode: '6181000200172',
    pole: 'quincaillerie',
    category: 'Tôles & Faîtières',
    name: 'FAITIERE ORD',
    unitLabel: 'Pièce',
    priceFcfa: 2500,
    wholesalePriceFcfa: 2300,
    wholesaleMinQty: 10,
    purchaseCostFcfa: 2000,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 75,
    criticalStockThreshold: 20,
    priorityScore: 77,
    orderCount: 26,
    outflowQty: 155,
    description:
      'Faîtière ordinaire de toiture — tarif indicatif, prix à modifier.',
  },
  {
    id: 'q-faitiere-couleur',
    barcode: '6181000200189',
    pole: 'quincaillerie',
    category: 'Tôles & Faîtières',
    name: 'FAITIERE COULEUR',
    unitLabel: 'Pièce',
    priceFcfa: 3500,
    wholesalePriceFcfa: 3250,
    wholesaleMinQty: 10,
    purchaseCostFcfa: 2850,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 68,
    criticalStockThreshold: 20,
    priorityScore: 76,
    orderCount: 24,
    outflowQty: 140,
    description:
      'Faîtière couleur assortie — tarif indicatif, prix à modifier.',
  },
  {
    id: 'q-tole-bac-met',
    barcode: '6181000200196',
    pole: 'quincaillerie',
    category: 'Tôles & Faîtières',
    name: 'TOLE BAC MET',
    unitLabel: 'Feuille',
    priceFcfa: 7500,
    wholesalePriceFcfa: 7100,
    wholesaleMinQty: 15,
    purchaseCostFcfa: 6150,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 85,
    criticalStockThreshold: 20,
    priorityScore: 75,
    orderCount: 38,
    outflowQty: 260,
    description:
      'Tôle Bac Métallique — tarif indicatif, prix à modifier selon le barème.',
  },

  // QUINCAILLERIE — Contreplaqués & Bois
  {
    id: 'q-contre-plaq-5mm',
    barcode: '6181000200202',
    pole: 'quincaillerie',
    category: 'Contreplaqués & Bois',
    name: 'CONTRE PLAQ 5MM',
    unitLabel: 'Plaque',
    priceFcfa: 4500,
    wholesalePriceFcfa: 4200,
    wholesaleMinQty: 10,
    purchaseCostFcfa: 3700,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 70,
    criticalStockThreshold: 20,
    priorityScore: 79,
    orderCount: 35,
    outflowQty: 220,
    description:
      'Contre-plaqué épaisseur 5 mm — tarif indicatif, prix à modifier.',
  },
  {
    id: 'q-contre-plaq-8mm',
    barcode: '6181000200219',
    pole: 'quincaillerie',
    category: 'Contreplaqués & Bois',
    name: 'CONTRE PLAQUET 8',
    unitLabel: 'Plaque',
    priceFcfa: 6800,
    wholesalePriceFcfa: 6400,
    wholesaleMinQty: 10,
    purchaseCostFcfa: 5600,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 55,
    criticalStockThreshold: 15,
    priorityScore: 74,
    orderCount: 29,
    outflowQty: 175,
    description:
      'Contre-plaqué épaisseur 8 mm — tarif indicatif, prix à modifier.',
  },

  // QUINCAILLERIE — Outils et équipements (Brouettes)
  {
    id: 'q-brouette-bleue',
    barcode: '6181000200226',
    pole: 'quincaillerie',
    category: 'Outils et équipements',
    name: 'BROUETTE BLEUE',
    unitLabel: 'Unité',
    priceFcfa: 28000,
    wholesalePriceFcfa: 26000,
    wholesaleMinQty: 5,
    purchaseCostFcfa: 23000,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 24,
    criticalStockThreshold: 8,
    priorityScore: 78,
    orderCount: 22,
    outflowQty: 68,
    description:
      'Brouette bleue de chantier — tarif indicatif, prix à modifier.',
  },
  {
    id: 'q-brouette-verte',
    barcode: '6181000200233',
    pole: 'quincaillerie',
    category: 'Outils et équipements',
    name: 'BROUETTE VERTE',
    unitLabel: 'Unité',
    priceFcfa: 28000,
    wholesalePriceFcfa: 26000,
    wholesaleMinQty: 5,
    purchaseCostFcfa: 23000,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 20,
    criticalStockThreshold: 8,
    priorityScore: 77,
    orderCount: 19,
    outflowQty: 55,
    description:
      'Brouette verte de chantier — tarif indicatif, prix à modifier.',
  },
  {
    id: 'q-brouette',
    barcode: '6181000200240',
    pole: 'quincaillerie',
    category: 'Outils et équipements',
    name: 'BROUETTE',
    unitLabel: 'Unité',
    priceFcfa: 25000,
    wholesalePriceFcfa: 23500,
    wholesaleMinQty: 5,
    purchaseCostFcfa: 20500,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 28,
    criticalStockThreshold: 10,
    priorityScore: 73,
    orderCount: 25,
    outflowQty: 80,
    description:
      'Brouette standard — tarif indicatif, prix à modifier selon le barème.',
  },

  // QUINCAILLERIE — Pointes & Tirefonds
  {
    id: 'q-pointe-n3',
    barcode: '6181000200257',
    pole: 'quincaillerie',
    category: 'Pointes & Tirefonds',
    name: 'POINTE N3',
    unitLabel: 'Paquet',
    priceFcfa: 1000,
    wholesalePriceFcfa: 900,
    wholesaleMinQty: 10,
    purchaseCostFcfa: 800,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 110,
    criticalStockThreshold: 25,
    priorityScore: 72,
    orderCount: 41,
    outflowQty: 260,
    description: 'Pointe N° 3 — tarif indicatif, prix à modifier.',
  },
  {
    id: 'q-pointe-n4',
    barcode: '6181000200264',
    pole: 'quincaillerie',
    category: 'Pointes & Tirefonds',
    name: 'POINTE N4',
    unitLabel: 'Paquet',
    priceFcfa: 1000,
    wholesalePriceFcfa: 900,
    wholesaleMinQty: 10,
    purchaseCostFcfa: 800,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 105,
    criticalStockThreshold: 25,
    priorityScore: 71,
    orderCount: 38,
    outflowQty: 240,
    description: 'Pointe N° 4 — tarif indicatif, prix à modifier.',
  },
  {
    id: 'q-pointe-n5',
    barcode: '6181000200271',
    pole: 'quincaillerie',
    category: 'Pointes & Tirefonds',
    name: 'POINTE N5',
    unitLabel: 'Paquet',
    priceFcfa: 1000,
    wholesalePriceFcfa: 900,
    wholesaleMinQty: 10,
    purchaseCostFcfa: 800,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 120,
    criticalStockThreshold: 25,
    priorityScore: 70,
    orderCount: 45,
    outflowQty: 290,
    description: 'Pointe N° 5 — tarif indicatif, prix à modifier.',
  },
  {
    id: 'q-pointe-n6',
    barcode: '6181000200288',
    pole: 'quincaillerie',
    category: 'Pointes & Tirefonds',
    name: 'POINTE N6',
    unitLabel: 'Paquet',
    priceFcfa: 1000,
    wholesalePriceFcfa: 900,
    wholesaleMinQty: 10,
    purchaseCostFcfa: 800,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 130,
    criticalStockThreshold: 25,
    priorityScore: 69,
    orderCount: 50,
    outflowQty: 320,
    description: 'Pointe N° 6 — tarif indicatif, prix à modifier.',
  },
  {
    id: 'q-pointe-n7',
    barcode: '6181000200295',
    pole: 'quincaillerie',
    category: 'Pointes & Tirefonds',
    name: 'POINTE N7',
    unitLabel: 'Paquet',
    priceFcfa: 1100,
    wholesalePriceFcfa: 980,
    wholesaleMinQty: 10,
    purchaseCostFcfa: 880,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 125,
    criticalStockThreshold: 25,
    priorityScore: 68,
    orderCount: 47,
    outflowQty: 300,
    description: 'Pointe N° 7 — tarif indicatif, prix à modifier.',
  },
  {
    id: 'q-pointe-n8',
    barcode: '6181000200301',
    pole: 'quincaillerie',
    category: 'Pointes & Tirefonds',
    name: 'POINTE N8',
    unitLabel: 'Paquet',
    priceFcfa: 1100,
    wholesalePriceFcfa: 980,
    wholesaleMinQty: 10,
    purchaseCostFcfa: 880,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 115,
    criticalStockThreshold: 25,
    priorityScore: 67,
    orderCount: 42,
    outflowQty: 270,
    description: 'Pointe N° 8 — tarif indicatif, prix à modifier.',
  },
  {
    id: 'q-pointe-n9',
    barcode: '6181000200318',
    pole: 'quincaillerie',
    category: 'Pointes & Tirefonds',
    name: 'POINTE N9',
    unitLabel: 'Paquet',
    priceFcfa: 1200,
    wholesalePriceFcfa: 1080,
    wholesaleMinQty: 10,
    purchaseCostFcfa: 960,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 95,
    criticalStockThreshold: 25,
    priorityScore: 66,
    orderCount: 34,
    outflowQty: 215,
    description: 'Pointe N° 9 — tarif indicatif, prix à modifier.',
  },
  {
    id: 'q-pointe-n10',
    barcode: '6181000200325',
    pole: 'quincaillerie',
    category: 'Pointes & Tirefonds',
    name: 'POINTE N10',
    unitLabel: 'Paquet',
    priceFcfa: 1200,
    wholesalePriceFcfa: 1080,
    wholesaleMinQty: 10,
    purchaseCostFcfa: 960,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 100,
    criticalStockThreshold: 25,
    priorityScore: 65,
    orderCount: 39,
    outflowQty: 250,
    description: 'Pointe N° 10 — tarif indicatif, prix à modifier.',
  },
  {
    id: 'q-pointe-n12',
    barcode: '6181000200332',
    pole: 'quincaillerie',
    category: 'Pointes & Tirefonds',
    name: 'POINTE N12',
    unitLabel: 'Paquet',
    priceFcfa: 1300,
    wholesalePriceFcfa: 1150,
    wholesaleMinQty: 10,
    purchaseCostFcfa: 1040,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 90,
    criticalStockThreshold: 20,
    priorityScore: 64,
    orderCount: 31,
    outflowQty: 195,
    description: 'Pointe N° 12 — tarif indicatif, prix à modifier.',
  },
  {
    id: 'q-tirfond-80',
    barcode: '6181000200349',
    pole: 'quincaillerie',
    category: 'Pointes & Tirefonds',
    name: 'TIRFOND80',
    unitLabel: 'Paquet / Pièce',
    priceFcfa: 1500,
    wholesalePriceFcfa: 1350,
    wholesaleMinQty: 10,
    purchaseCostFcfa: 1200,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 85,
    criticalStockThreshold: 20,
    priorityScore: 63,
    orderCount: 28,
    outflowQty: 165,
    description: 'Tirefond 80 mm — tarif indicatif, prix à modifier.',
  },
  {
    id: 'q-tirfond-100',
    barcode: '6181000200356',
    pole: 'quincaillerie',
    category: 'Pointes & Tirefonds',
    name: 'TIRFOND100',
    unitLabel: 'Paquet / Pièce',
    priceFcfa: 1800,
    wholesalePriceFcfa: 1650,
    wholesaleMinQty: 10,
    purchaseCostFcfa: 1450,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 80,
    criticalStockThreshold: 20,
    priorityScore: 62,
    orderCount: 26,
    outflowQty: 150,
    description: 'Tirefond 100 mm — tarif indicatif, prix à modifier.',
  },

  // QUINCAILLERIE — Étanchéité & Peinture
  {
    id: 'q-mastilex-05',
    barcode: '6181000200363',
    pole: 'quincaillerie',
    category: 'Étanchéité & Peinture',
    name: 'MASTILEX 0,5',
    unitLabel: 'Boîte 0,5 kg',
    priceFcfa: 2500,
    wholesalePriceFcfa: 2300,
    wholesaleMinQty: 10,
    purchaseCostFcfa: 2000,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 60,
    criticalStockThreshold: 15,
    priorityScore: 61,
    orderCount: 23,
    outflowQty: 115,
    description: 'Mastilex 0,5 kg — tarif indicatif, prix à modifier.',
  },
  {
    id: 'q-perical-1l',
    barcode: '6181000200370',
    pole: 'quincaillerie',
    category: 'Étanchéité & Peinture',
    name: 'PERICAL 1L',
    unitLabel: 'Bidon 1 L',
    priceFcfa: 3500,
    wholesalePriceFcfa: 3200,
    wholesaleMinQty: 10,
    purchaseCostFcfa: 2850,
    targetMarginPct: 18,
    inStock: true,
    stockQty: 50,
    criticalStockThreshold: 15,
    priorityScore: 60,
    orderCount: 20,
    outflowQty: 95,
    description: 'Perical 1 L — tarif indicatif, prix à modifier.',
  },

  // VENTE DE BOISSONS (Tarifs Boissons séparés)
  {
    id: 'b-eau-15l',
    barcode: '6181000300018',
    pole: 'boissons',
    category: 'Eaux minérales',
    name: 'Eau minérale naturelle 1,5 L',
    unitLabel: 'Pack de 6 bouteilles',
    priceFcfa: 2400,
    wholesalePriceFcfa: 2150,
    wholesaleMinQty: 15,
    inStock: true,
    stockQty: 220,
    criticalStockThreshold: 60,
    priorityScore: 96,
    orderCount: 165,
    outflowQty: 1480,
    description:
      'Eau de source pure et équilibrée, disponible à température ambiante ou réfrigérée.',
  },
  {
    id: 'b-eau-05l',
    barcode: '6181000300025',
    pole: 'boissons',
    category: 'Eaux minérales',
    name: 'Eau minérale format nomade 50 cl',
    unitLabel: 'Pack de 12 bouteilles',
    priceFcfa: 2200,
    wholesalePriceFcfa: 1950,
    wholesaleMinQty: 15,
    inStock: true,
    stockQty: 175,
    criticalStockThreshold: 50,
    priorityScore: 88,
    orderCount: 102,
    outflowQty: 760,
    description:
      'Format pratique pour réunions, cérémonies, chantiers et déplacements.',
  },
  {
    id: 'b-coca-pack',
    barcode: '5449000054227',
    pole: 'boissons',
    category: 'Boissons gazeuses',
    name: 'Coca-Cola Original 1,5 L',
    unitLabel: 'Pack de 6 bouteilles',
    priceFcfa: 5400,
    wholesalePriceFcfa: 5000,
    wholesaleMinQty: 10,
    inStock: true,
    stockQty: 130,
    criticalStockThreshold: 40,
    priorityScore: 94,
    orderCount: 134,
    outflowQty: 890,
    description:
      'Pack familial ou événementiel servi bien frais sur demande.',
  },
  {
    id: 'b-fanta-sprite',
    barcode: '5449000011527',
    pole: 'boissons',
    category: 'Boissons gazeuses',
    name: 'Fanta Orange / Sprite Citron 1,5 L',
    unitLabel: 'Pack de 6 bouteilles',
    priceFcfa: 5400,
    wholesalePriceFcfa: 5000,
    wholesaleMinQty: 10,
    inStock: true,
    stockQty: 115,
    criticalStockThreshold: 35,
    priorityScore: 87,
    orderCount: 98,
    outflowQty: 640,
    description:
      'Boissons gazeuses fruitées et citronnées pour rafraîchissement immédiat.',
  },
  {
    id: 'b-canettes-24',
    barcode: '5449000000996',
    pole: 'boissons',
    category: 'Boissons gazeuses',
    name: 'Plateau Canettes 33 cl (Coca, Fanta, Sprite)',
    unitLabel: 'Plateau de 24 canettes',
    priceFcfa: 10800,
    wholesalePriceFcfa: 10000,
    wholesaleMinQty: 6,
    inStock: true,
    stockQty: 64,
    criticalStockThreshold: 20,
    priorityScore: 83,
    orderCount: 61,
    outflowQty: 310,
    description:
      'Assortiment prêt à refroidir pour événements, boutiques et réceptions.',
  },
  {
    id: 'b-jus-bissap',
    barcode: '6181000300063',
    pole: 'boissons',
    category: 'Jus naturels',
    name: 'Jus naturels locaux (Bissap / Gingembre)',
    unitLabel: 'Lot de 6 × 1 L',
    priceFcfa: 7200,
    wholesalePriceFcfa: 6500,
    wholesaleMinQty: 8,
    inStock: true,
    stockQty: 45,
    criticalStockThreshold: 50,
    priorityScore: 78,
    orderCount: 49,
    outflowQty: 225,
    description:
      'Préparation naturelle rafraîchissante conservée au frais.',
  },
  {
    id: 'b-jus-ananas',
    barcode: '6181000300070',
    pole: 'boissons',
    category: 'Jus naturels',
    name: 'Nectar Ananas & Multifruits 1 L',
    unitLabel: 'Carton de 6 briques',
    priceFcfa: 7500,
    wholesalePriceFcfa: 6900,
    wholesaleMinQty: 8,
    inStock: true,
    stockQty: 58,
    criticalStockThreshold: 20,
    priorityScore: 74,
    orderCount: 43,
    outflowQty: 190,
    description:
      'Jus de fruits sélectionnés sans colorants ajoutés.',
  },
  {
    id: 'b-castel-casier',
    barcode: '6181000300087',
    pole: 'boissons',
    category: 'Bières',
    name: 'Castel Beer 65 cl',
    unitLabel: 'Casier de 12 bouteilles',
    priceFcfa: 8400,
    wholesalePriceFcfa: 7900,
    wholesaleMinQty: 10,
    inStock: true,
    stockQty: 86,
    criticalStockThreshold: 30,
    priorityScore: 95,
    orderCount: 128,
    outflowQty: 920,
    description:
      'Bière blonde rafraîchissante servie fraîche au dépôt ou en gros.',
  },
  {
    id: 'b-biere-33',
    barcode: '6181000300094',
    pole: 'boissons',
    category: 'Bières',
    name: 'Bière Blonde Format 33 cl',
    unitLabel: 'Pack de 12 bouteilles',
    priceFcfa: 7800,
    wholesalePriceFcfa: 7300,
    wholesaleMinQty: 10,
    inStock: true,
    stockQty: 72,
    criticalStockThreshold: 25,
    priorityScore: 81,
    orderCount: 57,
    outflowQty: 340,
    description:
      'Conditionnement pratique pour réceptions et débits de boissons.',
  },
  {
    id: 'b-autres-malt',
    barcode: '6181000300100',
    pole: 'boissons',
    category: 'Autres boissons',
    name: 'Boissons maltées & énergisantes sans alcool',
    unitLabel: 'Pack de 6 × 33 cl',
    priceFcfa: 4500,
    wholesalePriceFcfa: 4100,
    wholesaleMinQty: 10,
    inStock: true,
    stockQty: 95,
    criticalStockThreshold: 25,
    priorityScore: 75,
    orderCount: 46,
    outflowQty: 270,
    description:
      'Boissons toniques et sirops concentrés pour toute la famille.',
  },
];

export const DEFAULT_INVOICES: Invoice[] = [
  {
    id: 'inv-sample-1',
    docType: 'facture',
    code: 'FAC-GIS-1001',
    createdAt: '2026-11-18T08:45:00.000Z',
    updatedAt: '2026-11-18T08:45:00.000Z',
    customerName: 'Kouamé Entreprise BTP',
    customerPhone: '0708123456',
    customerAddress: 'Quartier Commerce, près de la gare TSR',
    deliveryMode: 'livraison_locale',
    paymentMethod: 'orange_money',
    notes: 'Livraison souhaitée avant 14h sur chantier.',
    status: 'en_preparation',
    items: [
      {
        id: 'li-1',
        productId: 'c-ciment-cpj425',
        pole: 'ciment',
        name: 'Ciment 42,5 (CIMEN 42,5)',
        unitLabel: 'Sac de 50 kg',
        quantity: 20,
        appliedUnitPrice: 4550,
        isWholesale: true,
        lineTotal: 91000,
      },
      {
        id: 'li-2',
        productId: 'b-eau-15l',
        pole: 'boissons',
        name: 'Eau minérale naturelle 1,5 L',
        unitLabel: 'Pack de 6 bouteilles',
        quantity: 4,
        appliedUnitPrice: 2400,
        isWholesale: false,
        lineTotal: 9600,
      },
    ],
    discountFcfa: 0,
    deliveryFeeFcfa: 0,
    cimentQuincaillerieSubtotal: 91000,
    boissonsSubtotal: 9600,
    totalFcfa: 100600,
    createdByUid: 'system',
    createdByName: 'Caisse GIS',
    assignedLoaderName: 'Moussa (Chargeur)',
    assignedDriverName: 'Yao (Chauffeur)',
    staffReaderUids: [],
  },
];
