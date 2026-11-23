import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull().default(''),
  role: text('role').notNull().default('client'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const members = pgTable('members', {
  id: text('id').primaryKey(),
  uid: text('uid'),
  fullName: text('full_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull().default(''),
  role: text('role').notNull(),
  active: boolean('active').notNull().default(true),
  assignedByUid: text('assigned_by_uid').notNull(),
  staffViewerUids: jsonb('staff_viewer_uids')
    .$type<string[]>()
    .notNull()
    .default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const storeSettings = pgTable('store_settings', {
  id: text('id').primaryKey(),
  brandAcronym: text('brand_acronym').notNull(),
  companyName: text('company_name').notNull(),
  tagline: text('tagline').notNull(),
  location: text('location').notNull(),
  closingSlogan: text('closing_slogan').notNull(),
  phones: jsonb('phones').$type<[string, string]>().notNull(),
  hardware: jsonb('hardware')
    .$type<{ title: string; subtitle: string; items: string[] }>()
    .notNull(),
  beverages: jsonb('beverages')
    .$type<{ title: string; subtitle: string; items: string[] }>()
    .notNull(),
  commitments: jsonb('commitments')
    .$type<[string, string, string, string]>()
    .notNull(),
  theme: text('theme').notNull().default('light'),
  defaultModel: text('default_model').notNull().default('editorial'),
  defaultFormat: text('default_format').notNull().default('landscape'),
  currencyLabel: text('currency_label').notNull().default('FCFA'),
  deliveryFeeFcfa: integer('delivery_fee_fcfa').notNull().default(2000),
  freeDeliveryThresholdFcfa: integer('free_delivery_threshold_fcfa')
    .notNull()
    .default(50000),
  hoursWeekdays: text('hours_weekdays').notNull(),
  hoursSaturday: text('hours_saturday').notNull(),
  hoursSunday: text('hours_sunday').notNull(),
  whatsappPhone: text('whatsapp_phone').notNull(),
  email: text('email').notNull(),
  acceptedPayments: jsonb('accepted_payments').$type<string[]>().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  barcode: text('barcode').notNull().default(''),
  pole: text('pole').notNull(),
  category: text('category').notNull(),
  name: text('name').notNull(),
  unitLabel: text('unit_label').notNull(),
  priceFcfa: integer('price_fcfa').notNull().default(0),
  wholesalePriceFcfa: integer('wholesale_price_fcfa').notNull().default(0),
  wholesaleMinQty: integer('wholesale_min_qty').notNull().default(10),
  purchaseCostFcfa: integer('purchase_cost_fcfa').notNull().default(0),
  targetMarginPct: doublePrecision('target_margin_pct').notNull().default(18),
  inStock: boolean('in_stock').notNull().default(true),
  stockQty: integer('stock_qty').notNull().default(0),
  criticalStockThreshold: integer('critical_stock_threshold')
    .notNull()
    .default(15),
  priorityScore: integer('priority_score').notNull().default(50),
  orderCount: integer('order_count').notNull().default(0),
  outflowQty: integer('outflow_qty').notNull().default(0),
  description: text('description').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  docType: text('doc_type').notNull(),
  code: text('code').notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull().default(''),
  customerAddress: text('customer_address').notNull().default(''),
  deliveryMode: text('delivery_mode').notNull(),
  paymentMethod: text('payment_method').notNull(),
  notes: text('notes').notNull().default(''),
  status: text('status').notNull(),
  discountFcfa: integer('discount_fcfa').notNull().default(0),
  deliveryFeeFcfa: integer('delivery_fee_fcfa').notNull().default(0),
  cimentQuincaillerieSubtotal: integer('ciment_quincaillerie_subtotal')
    .notNull()
    .default(0),
  boissonsSubtotal: integer('boissons_subtotal').notNull().default(0),
  totalFcfa: integer('total_fcfa').notNull().default(0),
  createdByUid: text('created_by_uid').notNull(),
  createdByName: text('created_by_name').notNull(),
  assignedLoaderName: text('assigned_loader_name').notNull().default(''),
  assignedDriverName: text('assigned_driver_name').notNull().default(''),
  staffReaderUids: jsonb('staff_reader_uids')
    .$type<string[]>()
    .notNull()
    .default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const invoiceItems = pgTable('invoice_items', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull(),
  pole: text('pole').notNull(),
  name: text('name').notNull(),
  unitLabel: text('unit_label').notNull(),
  quantity: integer('quantity').notNull(),
  appliedUnitPrice: integer('applied_unit_price').notNull(),
  isWholesale: boolean('is_wholesale').notNull().default(false),
  lineTotal: integer('line_total').notNull(),
});

export const purchaseOrders = pgTable('purchase_orders', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  poleScope: text('pole_scope').notNull(),
  supplierName: text('supplier_name').notNull(),
  supplierPhone: text('supplier_phone').notNull().default(''),
  supplierAddress: text('supplier_address').notNull().default(''),
  expectedDeliveryDate: text('expected_delivery_date').notNull().default(''),
  status: text('status').notNull(),
  totalEstimatedFcfa: integer('total_estimated_fcfa').notNull().default(0),
  notes: text('notes').notNull().default(''),
  createdByUid: text('created_by_uid').notNull(),
  createdByName: text('created_by_name').notNull(),
  staffReaderUids: jsonb('staff_reader_uids')
    .$type<string[]>()
    .notNull()
    .default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: text('id').primaryKey(),
  purchaseOrderId: text('purchase_order_id')
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull(),
  pole: text('pole').notNull(),
  name: text('name').notNull(),
  unitLabel: text('unit_label').notNull(),
  currentStockAtOrder: integer('current_stock_at_order').notNull().default(0),
  criticalThreshold: integer('critical_threshold').notNull().default(15),
  quantity: integer('quantity').notNull(),
  estimatedUnitCostFcfa: integer('estimated_unit_cost_fcfa')
    .notNull()
    .default(0),
  lineTotalFcfa: integer('line_total_fcfa').notNull().default(0),
});

export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type').notNull(),
  isTeamChannel: boolean('is_team_channel').notNull().default(false),
  participantUids: jsonb('participant_uids')
    .$type<string[]>()
    .notNull()
    .default([]),
  lastMessageText: text('last_message_text').notNull().default(''),
  lastSenderName: text('last_sender_name').notNull().default(''),
  createdByUid: text('created_by_uid').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  senderUid: text('sender_uid').notNull(),
  senderName: text('sender_name').notNull(),
  senderRole: text('sender_role').notNull(),
  text: text('text').notNull(),
  participantUids: jsonb('participant_uids')
    .$type<string[]>()
    .notNull()
    .default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  actorUid: text('actor_uid').notNull(),
  actorName: text('actor_name').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  targetLabel: text('target_label'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const invoicesRelations = relations(invoices, ({ many }) => ({
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const purchaseOrdersRelations = relations(
  purchaseOrders,
  ({ many }) => ({
    items: many(purchaseOrderItems),
  })
);

export const purchaseOrderItemsRelations = relations(
  purchaseOrderItems,
  ({ one }) => ({
    purchaseOrder: one(purchaseOrders, {
      fields: [purchaseOrderItems.purchaseOrderId],
      references: [purchaseOrders.id],
    }),
  })
);

export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));
