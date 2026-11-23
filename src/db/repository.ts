import { desc, eq, ilike, or } from 'drizzle-orm';
import { db } from './index.ts';
import {
  auditLogs,
  conversations,
  invoiceItems,
  invoices,
  members,
  messages,
  products,
  purchaseOrderItems,
  purchaseOrders,
  storeSettings,
  users,
} from './schema.ts';
import {
  type AuditLog,
  type ChatMessage,
  type Conversation,
  DEFAULT_INVOICES,
  DEFAULT_PRODUCTS,
  DEFAULT_SETTINGS,
  type DeliveryMode,
  type Invoice,
  type InvoiceDocType,
  type InvoiceLineItem,
  type InvoiceStatus,
  type Member,
  type PaymentMethod,
  type Product,
  type ProductPole,
  type PurchaseOrder,
  type PurchaseOrderLineItem,
  type PurchaseOrderPoleScope,
  type PurchaseOrderStatus,
  type StaffRole,
  type StoreSettings,
  type UserRole,
} from '../types/app.ts';
import { type PosterFormat, type PosterModelId } from '../types/poster.ts';
import {
  deleteInvoiceFromSupabase,
  deleteMemberFromSupabase,
  deleteProductFromSupabase,
  deletePurchaseOrderFromSupabase,
  syncAuditLogToSupabase,
  syncConversationToSupabase,
  syncInvoiceToSupabase,
  syncMemberToSupabase,
  syncMessageToSupabase,
  syncProductsToSupabase,
  syncPurchaseOrderToSupabase,
  syncSettingsToSupabase,
  syncUserToSupabase,
  updatePurchaseOrderStatusInSupabase,
} from './supabaseSync.ts';

function toIso(d: Date | string | null | undefined): string {
  if (!d) return new Date().toISOString();
  return d instanceof Date ? d.toISOString() : String(d);
}

function mapProductRow(row: typeof products.$inferSelect): Product {
  return {
    id: row.id,
    barcode: row.barcode || '',
    pole: row.pole as ProductPole,
    category: row.category,
    name: row.name,
    unitLabel: row.unitLabel,
    priceFcfa: row.priceFcfa,
    wholesalePriceFcfa: row.wholesalePriceFcfa,
    wholesaleMinQty: row.wholesaleMinQty,
    purchaseCostFcfa: row.purchaseCostFcfa,
    targetMarginPct: row.targetMarginPct,
    inStock: row.inStock,
    stockQty: row.stockQty,
    criticalStockThreshold: row.criticalStockThreshold,
    priorityScore: row.priorityScore,
    orderCount: row.orderCount,
    outflowQty: row.outflowQty,
    description: row.description,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapSettingsRow(row: typeof storeSettings.$inferSelect): StoreSettings {
  return {
    poster: {
      brandAcronym: row.brandAcronym,
      companyName: row.companyName,
      tagline: row.tagline,
      location: row.location,
      closingSlogan: row.closingSlogan,
      phones: row.phones,
      hardware: {
        title: row.hardware.title,
        subtitle: row.hardware.subtitle ?? '',
        items: row.hardware.items,
      },
      beverages: {
        title: row.beverages.title,
        subtitle: row.beverages.subtitle ?? '',
        items: row.beverages.items,
      },
      commitments: [
        row.commitments[0] ?? DEFAULT_SETTINGS.poster.commitments[0],
        row.commitments[1] ?? DEFAULT_SETTINGS.poster.commitments[1],
        row.commitments[2] ?? DEFAULT_SETTINGS.poster.commitments[2],
        row.commitments[3] ?? DEFAULT_SETTINGS.poster.commitments[3],
      ],
    },
    theme: (row.theme as 'light' | 'dark') || 'light',
    defaultModel: (row.defaultModel as PosterModelId) || 'editorial',
    defaultFormat: (row.defaultFormat as PosterFormat) || 'landscape',
    currencyLabel: row.currencyLabel,
    deliveryFeeFcfa: row.deliveryFeeFcfa,
    freeDeliveryThresholdFcfa: row.freeDeliveryThresholdFcfa,
    hoursWeekdays: row.hoursWeekdays,
    hoursSaturday: row.hoursSaturday,
    hoursSunday: row.hoursSunday,
    whatsappPhone: row.whatsappPhone,
    email: row.email,
    acceptedPayments: row.acceptedPayments as PaymentMethod[],
  };
}

function mapMemberRow(row: typeof members.$inferSelect): Member {
  return {
    id: row.id,
    uid: row.uid ?? undefined,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    role: row.role as StaffRole,
    active: row.active,
    assignedByUid: row.assignedByUid,
    staffViewerUids: row.staffViewerUids || [],
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export async function listOrSeedProducts(): Promise<Product[]> {
  try {
    let rows = await db
      .select()
      .from(products)
      .orderBy(desc(products.priorityScore));

    if (rows.length === 0) {
      await db
        .insert(products)
        .values(
          DEFAULT_PRODUCTS.map((p) => ({
            id: p.id,
            barcode: p.barcode || '',
            pole: p.pole,
            category: p.category,
            name: p.name,
            unitLabel: p.unitLabel,
            priceFcfa: p.priceFcfa,
            wholesalePriceFcfa: p.wholesalePriceFcfa,
            wholesaleMinQty: p.wholesaleMinQty,
            purchaseCostFcfa:
              p.purchaseCostFcfa ??
              Math.max(0, Math.round((p.wholesalePriceFcfa * 0.88) / 50) * 50),
            targetMarginPct: p.targetMarginPct ?? 18,
            inStock: p.inStock,
            stockQty: p.stockQty,
            criticalStockThreshold: p.criticalStockThreshold ?? 15,
            priorityScore: p.priorityScore,
            orderCount: p.orderCount,
            outflowQty: p.outflowQty,
            description: p.description || '',
          }))
        )
        .onConflictDoNothing();

      rows = await db
        .select()
        .from(products)
        .orderBy(desc(products.priorityScore));

      void syncProductsToSupabase(rows.map(mapProductRow));
    }

    return rows.map(mapProductRow);
  } catch (error) {
    console.error('Database query failed in listOrSeedProducts:', error);
    throw new Error('Impossible de charger le catalogue produits.', {
      cause: error,
    });
  }
}

export async function upsertProduct(product: Product): Promise<Product> {
  try {
    const defaultCost = Math.max(
      0,
      Math.round((product.wholesalePriceFcfa * 0.88) / 50) * 50
    );
    const now = new Date();
    const [saved] = await db
      .insert(products)
      .values({
        id: product.id,
        barcode: (product.barcode || '').trim().slice(0, 64),
        pole: product.pole,
        category: product.category,
        name: product.name,
        unitLabel: product.unitLabel,
        priceFcfa: Math.max(0, Math.round(product.priceFcfa)),
        wholesalePriceFcfa: Math.max(0, Math.round(product.wholesalePriceFcfa)),
        wholesaleMinQty: Math.max(1, Math.round(product.wholesaleMinQty)),
        purchaseCostFcfa: Math.max(
          0,
          Math.round(product.purchaseCostFcfa ?? defaultCost)
        ),
        targetMarginPct: Math.min(
          500,
          Math.max(0, Number(product.targetMarginPct ?? 18))
        ),
        inStock: product.inStock,
        stockQty: Math.max(0, Math.round(product.stockQty)),
        criticalStockThreshold: Math.max(
          0,
          Math.round(product.criticalStockThreshold ?? 15)
        ),
        priorityScore: Math.min(100, Math.max(0, Math.round(product.priorityScore))),
        orderCount: Math.max(0, Math.round(product.orderCount)),
        outflowQty: Math.max(0, Math.round(product.outflowQty)),
        description: product.description || '',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: products.id,
        set: {
          barcode: (product.barcode || '').trim().slice(0, 64),
          pole: product.pole,
          category: product.category,
          name: product.name,
          unitLabel: product.unitLabel,
          priceFcfa: Math.max(0, Math.round(product.priceFcfa)),
          wholesalePriceFcfa: Math.max(
            0,
            Math.round(product.wholesalePriceFcfa)
          ),
          wholesaleMinQty: Math.max(1, Math.round(product.wholesaleMinQty)),
          purchaseCostFcfa: Math.max(
            0,
            Math.round(product.purchaseCostFcfa ?? defaultCost)
          ),
          targetMarginPct: Math.min(
            500,
            Math.max(0, Number(product.targetMarginPct ?? 18))
          ),
          inStock: product.inStock,
          stockQty: Math.max(0, Math.round(product.stockQty)),
          criticalStockThreshold: Math.max(
            0,
            Math.round(product.criticalStockThreshold ?? 15)
          ),
          priorityScore: Math.min(
            100,
            Math.max(0, Math.round(product.priorityScore))
          ),
          orderCount: Math.max(0, Math.round(product.orderCount)),
          outflowQty: Math.max(0, Math.round(product.outflowQty)),
          description: product.description || '',
          updatedAt: now,
        },
      })
      .returning();

    const mapped = mapProductRow(saved);
    void syncProductsToSupabase([mapped]);
    return mapped;
  } catch (error) {
    console.error('Database query failed in upsertProduct:', error);
    throw new Error("Impossible d'enregistrer le produit.", { cause: error });
  }
}

export async function removeProduct(productId: string): Promise<void> {
  try {
    await db.delete(products).where(eq(products.id, productId));
    void deleteProductFromSupabase(productId);
  } catch (error) {
    console.error('Database query failed in removeProduct:', error);
    throw new Error('Impossible de supprimer le produit.', { cause: error });
  }
}

export async function getOrSeedSettings(): Promise<StoreSettings> {
  try {
    let rows = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.id, 'main'))
      .limit(1);

    if (rows.length === 0) {
      await db
        .insert(storeSettings)
        .values({
          id: 'main',
          brandAcronym: DEFAULT_SETTINGS.poster.brandAcronym,
          companyName: DEFAULT_SETTINGS.poster.companyName,
          tagline: DEFAULT_SETTINGS.poster.tagline,
          location: DEFAULT_SETTINGS.poster.location,
          closingSlogan: DEFAULT_SETTINGS.poster.closingSlogan,
          phones: DEFAULT_SETTINGS.poster.phones,
          hardware: DEFAULT_SETTINGS.poster.hardware,
          beverages: DEFAULT_SETTINGS.poster.beverages,
          commitments: DEFAULT_SETTINGS.poster.commitments,
          theme: DEFAULT_SETTINGS.theme,
          defaultModel: DEFAULT_SETTINGS.defaultModel,
          defaultFormat: DEFAULT_SETTINGS.defaultFormat,
          currencyLabel: DEFAULT_SETTINGS.currencyLabel,
          deliveryFeeFcfa: DEFAULT_SETTINGS.deliveryFeeFcfa,
          freeDeliveryThresholdFcfa: DEFAULT_SETTINGS.freeDeliveryThresholdFcfa,
          hoursWeekdays: DEFAULT_SETTINGS.hoursWeekdays,
          hoursSaturday: DEFAULT_SETTINGS.hoursSaturday,
          hoursSunday: DEFAULT_SETTINGS.hoursSunday,
          whatsappPhone: DEFAULT_SETTINGS.whatsappPhone,
          email: DEFAULT_SETTINGS.email,
          acceptedPayments: DEFAULT_SETTINGS.acceptedPayments,
          updatedAt: new Date(),
        })
        .onConflictDoNothing();

      rows = await db
        .select()
        .from(storeSettings)
        .where(eq(storeSettings.id, 'main'))
        .limit(1);

      void syncSettingsToSupabase(mapSettingsRow(rows[0]));
    }

    return mapSettingsRow(rows[0]);
  } catch (error) {
    console.error('Database query failed in getOrSeedSettings:', error);
    throw new Error('Impossible de charger les paramètres magasin.', {
      cause: error,
    });
  }
}

export async function upsertSettings(
  next: StoreSettings
): Promise<StoreSettings> {
  try {
    const now = new Date();
    const [saved] = await db
      .insert(storeSettings)
      .values({
        id: 'main',
        brandAcronym: next.poster.brandAcronym,
        companyName: next.poster.companyName,
        tagline: next.poster.tagline,
        location: next.poster.location,
        closingSlogan: next.poster.closingSlogan,
        phones: next.poster.phones,
        hardware: next.poster.hardware,
        beverages: next.poster.beverages,
        commitments: next.poster.commitments,
        theme: next.theme,
        defaultModel: next.defaultModel,
        defaultFormat: next.defaultFormat,
        currencyLabel: next.currencyLabel,
        deliveryFeeFcfa: next.deliveryFeeFcfa,
        freeDeliveryThresholdFcfa: next.freeDeliveryThresholdFcfa,
        hoursWeekdays: next.hoursWeekdays,
        hoursSaturday: next.hoursSaturday,
        hoursSunday: next.hoursSunday,
        whatsappPhone: next.whatsappPhone,
        email: next.email,
        acceptedPayments: next.acceptedPayments,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: storeSettings.id,
        set: {
          brandAcronym: next.poster.brandAcronym,
          companyName: next.poster.companyName,
          tagline: next.poster.tagline,
          location: next.poster.location,
          closingSlogan: next.poster.closingSlogan,
          phones: next.poster.phones,
          hardware: next.poster.hardware,
          beverages: next.poster.beverages,
          commitments: next.poster.commitments,
          theme: next.theme,
          defaultModel: next.defaultModel,
          defaultFormat: next.defaultFormat,
          currencyLabel: next.currencyLabel,
          deliveryFeeFcfa: next.deliveryFeeFcfa,
          freeDeliveryThresholdFcfa: next.freeDeliveryThresholdFcfa,
          hoursWeekdays: next.hoursWeekdays,
          hoursSaturday: next.hoursSaturday,
          hoursSunday: next.hoursSunday,
          whatsappPhone: next.whatsappPhone,
          email: next.email,
          acceptedPayments: next.acceptedPayments,
          updatedAt: now,
        },
      })
      .returning();

    const mapped = mapSettingsRow(saved);
    void syncSettingsToSupabase(mapped);
    return mapped;
  } catch (error) {
    console.error('Database query failed in upsertSettings:', error);
    throw new Error("Impossible d'enregistrer les paramètres magasin.", {
      cause: error,
    });
  }
}

export async function listMembersForUser(
  uid: string,
  role: UserRole
): Promise<Member[]> {
  try {
    const rows = await db
      .select()
      .from(members)
      .orderBy(desc(members.createdAt));
    const all = rows.map(mapMemberRow);
    if (role === 'super_admin') return all;
    if (role !== 'client') {
      return all.filter(
        (m) => m.uid === uid || m.staffViewerUids.includes(uid) || m.active
      );
    }
    return all.filter((m) => m.uid === uid);
  } catch (error) {
    console.error('Database query failed in listMembersForUser:', error);
    throw new Error('Impossible de charger les membres.', { cause: error });
  }
}

export async function upsertMember(member: Member): Promise<Member> {
  try {
    const cleanEmail = member.email.trim().toLowerCase();
    const now = new Date();
    const [saved] = await db
      .insert(members)
      .values({
        id: member.id,
        uid: member.uid ?? null,
        fullName: member.fullName.trim(),
        email: cleanEmail,
        phone: member.phone.trim(),
        role: member.role,
        active: member.active,
        assignedByUid: member.assignedByUid,
        staffViewerUids: member.staffViewerUids || [],
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: members.id,
        set: {
          uid: member.uid ?? null,
          fullName: member.fullName.trim(),
          email: cleanEmail,
          phone: member.phone.trim(),
          role: member.role,
          active: member.active,
          assignedByUid: member.assignedByUid,
          staffViewerUids: member.staffViewerUids || [],
          updatedAt: now,
        },
      })
      .returning();

    const mapped = mapMemberRow(saved);
    void syncMemberToSupabase(mapped);
    return mapped;
  } catch (error) {
    console.error('Database query failed in upsertMember:', error);
    throw new Error("Impossible d'enregistrer le membre.", { cause: error });
  }
}

export async function removeMember(memberId: string): Promise<void> {
  try {
    await db.delete(members).where(eq(members.id, memberId));
    void deleteMemberFromSupabase(memberId);
  } catch (error) {
    console.error('Database query failed in removeMember:', error);
    throw new Error('Impossible de supprimer le membre.', { cause: error });
  }
}

export async function listInvoicesForUser(
  uid: string,
  role: UserRole
): Promise<Invoice[]> {
  try {
    let invRows = await db
      .select()
      .from(invoices)
      .orderBy(desc(invoices.createdAt));

    if (invRows.length === 0 && role !== 'client') {
      for (const sample of DEFAULT_INVOICES) {
        await upsertInvoiceWithItems(sample);
      }
      invRows = await db
        .select()
        .from(invoices)
        .orderBy(desc(invoices.createdAt));
    }

    const visibleInvoices = invRows.filter((row) => {
      if (role === 'super_admin') return true;
      if (role !== 'client') {
        return (
          row.createdByUid === uid ||
          row.createdByUid === 'system' ||
          (row.staffReaderUids || []).includes(uid)
        );
      }
      return row.createdByUid === uid;
    });

    const itemRows = await db.select().from(invoiceItems);
    const itemsByInv = new Map<string, InvoiceLineItem[]>();
    for (const item of itemRows) {
      const list = itemsByInv.get(item.invoiceId) ?? [];
      list.push({
        id: item.id,
        productId: item.productId,
        pole: item.pole as ProductPole,
        name: item.name,
        unitLabel: item.unitLabel,
        quantity: item.quantity,
        appliedUnitPrice: item.appliedUnitPrice,
        isWholesale: item.isWholesale,
        lineTotal: item.lineTotal,
      });
      itemsByInv.set(item.invoiceId, list);
    }

    return visibleInvoices.map((row) => ({
      id: row.id,
      docType: row.docType as InvoiceDocType,
      code: row.code,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      customerAddress: row.customerAddress,
      deliveryMode: row.deliveryMode as DeliveryMode,
      paymentMethod: row.paymentMethod as PaymentMethod,
      notes: row.notes,
      status: row.status as InvoiceStatus,
      items: itemsByInv.get(row.id) ?? [],
      discountFcfa: row.discountFcfa,
      deliveryFeeFcfa: row.deliveryFeeFcfa,
      cimentQuincaillerieSubtotal: row.cimentQuincaillerieSubtotal,
      boissonsSubtotal: row.boissonsSubtotal,
      totalFcfa: row.totalFcfa,
      createdByUid: row.createdByUid,
      createdByName: row.createdByName,
      assignedLoaderName: row.assignedLoaderName,
      assignedDriverName: row.assignedDriverName,
      staffReaderUids: row.staffReaderUids || [],
    }));
  } catch (error) {
    console.error('Database query failed in listInvoicesForUser:', error);
    throw new Error('Impossible de charger les factures.', { cause: error });
  }
}

export async function upsertInvoiceWithItems(invoice: Invoice): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      const now = new Date();
      await tx
        .insert(invoices)
        .values({
          id: invoice.id,
          docType: invoice.docType,
          code: invoice.code,
          customerName: invoice.customerName,
          customerPhone: invoice.customerPhone || '',
          customerAddress: invoice.customerAddress || '',
          deliveryMode: invoice.deliveryMode,
          paymentMethod: invoice.paymentMethod,
          notes: invoice.notes || '',
          status: invoice.status,
          discountFcfa: invoice.discountFcfa,
          deliveryFeeFcfa: invoice.deliveryFeeFcfa,
          cimentQuincaillerieSubtotal: invoice.cimentQuincaillerieSubtotal,
          boissonsSubtotal: invoice.boissonsSubtotal,
          totalFcfa: invoice.totalFcfa,
          createdByUid: invoice.createdByUid,
          createdByName: invoice.createdByName,
          assignedLoaderName: invoice.assignedLoaderName || '',
          assignedDriverName: invoice.assignedDriverName || '',
          staffReaderUids: invoice.staffReaderUids || [],
          createdAt: invoice.createdAt ? new Date(invoice.createdAt) : now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: invoices.id,
          set: {
            docType: invoice.docType,
            code: invoice.code,
            customerName: invoice.customerName,
            customerPhone: invoice.customerPhone || '',
            customerAddress: invoice.customerAddress || '',
            deliveryMode: invoice.deliveryMode,
            paymentMethod: invoice.paymentMethod,
            notes: invoice.notes || '',
            status: invoice.status,
            discountFcfa: invoice.discountFcfa,
            deliveryFeeFcfa: invoice.deliveryFeeFcfa,
            cimentQuincaillerieSubtotal: invoice.cimentQuincaillerieSubtotal,
            boissonsSubtotal: invoice.boissonsSubtotal,
            totalFcfa: invoice.totalFcfa,
            assignedLoaderName: invoice.assignedLoaderName || '',
            assignedDriverName: invoice.assignedDriverName || '',
            staffReaderUids: invoice.staffReaderUids || [],
            updatedAt: now,
          },
        });

      await tx
        .delete(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoice.id));

      if (invoice.items.length > 0) {
        await tx.insert(invoiceItems).values(
          invoice.items.map((item, idx) => ({
            id: `${invoice.id}__${item.id || idx}`,
            invoiceId: invoice.id,
            productId: item.productId,
            pole: item.pole,
            name: item.name,
            unitLabel: item.unitLabel,
            quantity: item.quantity,
            appliedUnitPrice: item.appliedUnitPrice,
            isWholesale: item.isWholesale,
            lineTotal: item.lineTotal,
          }))
        );
      }
    });
    void syncInvoiceToSupabase(invoice);
  } catch (error) {
    console.error('Database query failed in upsertInvoiceWithItems:', error);
    throw new Error("Impossible d'enregistrer la facture.", { cause: error });
  }
}

export async function removeInvoice(invoiceId: string): Promise<void> {
  try {
    await db.delete(invoices).where(eq(invoices.id, invoiceId));
    void deleteInvoiceFromSupabase(invoiceId);
  } catch (error) {
    console.error('Database query failed in removeInvoice:', error);
    throw new Error('Impossible de supprimer la facture.', { cause: error });
  }
}

export async function listPurchaseOrdersForUser(
  uid: string,
  role: UserRole
): Promise<PurchaseOrder[]> {
  try {
    if (
      role !== 'super_admin' &&
      role !== 'admin_patron' &&
      role !== 'gerant_ciment' &&
      role !== 'gerant_boisson'
    ) {
      return [];
    }

    const poRows = await db
      .select()
      .from(purchaseOrders)
      .orderBy(desc(purchaseOrders.createdAt));

    const visible = poRows.filter((row) => {
      if (role === 'super_admin') return true;
      return (
        row.createdByUid === uid || (row.staffReaderUids || []).includes(uid)
      );
    });

    const itemRows = await db.select().from(purchaseOrderItems);
    const itemsByPo = new Map<string, PurchaseOrderLineItem[]>();
    for (const item of itemRows) {
      const list = itemsByPo.get(item.purchaseOrderId) ?? [];
      list.push({
        id: item.id,
        productId: item.productId,
        pole: item.pole as ProductPole,
        name: item.name,
        unitLabel: item.unitLabel,
        currentStockAtOrder: item.currentStockAtOrder,
        criticalThreshold: item.criticalThreshold,
        quantity: item.quantity,
        estimatedUnitCostFcfa: item.estimatedUnitCostFcfa,
        lineTotalFcfa: item.lineTotalFcfa,
      });
      itemsByPo.set(item.purchaseOrderId, list);
    }

    return visible.map((row) => ({
      id: row.id,
      code: row.code,
      poleScope: row.poleScope as PurchaseOrderPoleScope,
      supplierName: row.supplierName,
      supplierPhone: row.supplierPhone,
      supplierAddress: row.supplierAddress,
      expectedDeliveryDate: row.expectedDeliveryDate,
      status: row.status as PurchaseOrderStatus,
      items: itemsByPo.get(row.id) ?? [],
      totalEstimatedFcfa: row.totalEstimatedFcfa,
      notes: row.notes,
      createdByUid: row.createdByUid,
      createdByName: row.createdByName,
      staffReaderUids: row.staffReaderUids || [],
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    }));
  } catch (error) {
    console.error('Database query failed in listPurchaseOrdersForUser:', error);
    throw new Error('Impossible de charger les bons de commande.', {
      cause: error,
    });
  }
}

export async function upsertPurchaseOrderWithItems(
  po: PurchaseOrder
): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      const now = new Date();
      await tx
        .insert(purchaseOrders)
        .values({
          id: po.id,
          code: po.code,
          poleScope: po.poleScope,
          supplierName: po.supplierName,
          supplierPhone: po.supplierPhone || '',
          supplierAddress: po.supplierAddress || '',
          expectedDeliveryDate: po.expectedDeliveryDate || '',
          status: po.status,
          totalEstimatedFcfa: po.totalEstimatedFcfa,
          notes: po.notes || '',
          createdByUid: po.createdByUid,
          createdByName: po.createdByName,
          staffReaderUids: po.staffReaderUids || [],
          createdAt: po.createdAt ? new Date(po.createdAt) : now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: purchaseOrders.id,
          set: {
            code: po.code,
            poleScope: po.poleScope,
            supplierName: po.supplierName,
            supplierPhone: po.supplierPhone || '',
            supplierAddress: po.supplierAddress || '',
            expectedDeliveryDate: po.expectedDeliveryDate || '',
            status: po.status,
            totalEstimatedFcfa: po.totalEstimatedFcfa,
            notes: po.notes || '',
            staffReaderUids: po.staffReaderUids || [],
            updatedAt: now,
          },
        });

      await tx
        .delete(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, po.id));

      if (po.items.length > 0) {
        await tx.insert(purchaseOrderItems).values(
          po.items.map((item, idx) => ({
            id: `${po.id}__${item.id || idx}`,
            purchaseOrderId: po.id,
            productId: item.productId,
            pole: item.pole,
            name: item.name,
            unitLabel: item.unitLabel,
            currentStockAtOrder: item.currentStockAtOrder,
            criticalThreshold: item.criticalThreshold,
            quantity: item.quantity,
            estimatedUnitCostFcfa: item.estimatedUnitCostFcfa,
            lineTotalFcfa: item.lineTotalFcfa,
          }))
        );
      }
    });
    void syncPurchaseOrderToSupabase(po);
  } catch (error) {
    console.error(
      'Database query failed in upsertPurchaseOrderWithItems:',
      error
    );
    throw new Error("Impossible d'enregistrer le bon de commande.", {
      cause: error,
    });
  }
}

export async function updatePurchaseOrderStatus(
  poId: string,
  status: PurchaseOrderStatus
): Promise<void> {
  try {
    await db
      .update(purchaseOrders)
      .set({ status, updatedAt: new Date() })
      .where(eq(purchaseOrders.id, poId));
    void updatePurchaseOrderStatusInSupabase(poId, status);
  } catch (error) {
    console.error('Database query failed in updatePurchaseOrderStatus:', error);
    throw new Error('Impossible de mettre à jour le bon de commande.', {
      cause: error,
    });
  }
}

export async function removePurchaseOrder(poId: string): Promise<void> {
  try {
    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, poId));
    void deletePurchaseOrderFromSupabase(poId);
  } catch (error) {
    console.error('Database query failed in removePurchaseOrder:', error);
    throw new Error('Impossible de supprimer le bon de commande.', {
      cause: error,
    });
  }
}

export async function listConversationsAndMessages(
  uid: string,
  role: UserRole
): Promise<{
  conversations: Conversation[];
  messagesByConv: Record<string, ChatMessage[]>;
}> {
  try {
    let convRows = await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.updatedAt));

    if (
      convRows.length === 0 &&
      (role === 'super_admin' || role === 'admin_patron')
    ) {
      await db
        .insert(conversations)
        .values({
          id: 'conv-team-gis',
          title: 'Équipe Générale GIS',
          type: 'groupe',
          isTeamChannel: true,
          participantUids: [uid],
          lastMessageText: '',
          lastSenderName: '',
          createdByUid: uid,
        })
        .onConflictDoNothing();

      convRows = await db
        .select()
        .from(conversations)
        .orderBy(desc(conversations.updatedAt));
    }

    const visibleConvs = convRows.filter((row) => {
      if (role === 'super_admin') return true;
      return (row.participantUids || []).includes(uid);
    });

    const msgRows = await db
      .select()
      .from(messages)
      .orderBy(messages.createdAt);

    const messagesByConv: Record<string, ChatMessage[]> = {};
    for (const msg of msgRows) {
      if (
        role !== 'super_admin' &&
        !(msg.participantUids || []).includes(uid)
      ) {
        continue;
      }
      const list = messagesByConv[msg.conversationId] ?? [];
      list.push({
        id: msg.id,
        senderUid: msg.senderUid,
        senderName: msg.senderName,
        senderRole: msg.senderRole as UserRole,
        text: msg.text,
        participantUids: msg.participantUids || [],
        createdAt: toIso(msg.createdAt),
      });
      messagesByConv[msg.conversationId] = list;
    }

    return {
      conversations: visibleConvs.map((row) => ({
        id: row.id,
        title: row.title,
        type: row.type as 'groupe' | 'direct',
        isTeamChannel: row.isTeamChannel,
        participantUids: row.participantUids || [],
        lastMessageText: row.lastMessageText,
        lastSenderName: row.lastSenderName,
        createdByUid: row.createdByUid,
        createdAt: toIso(row.createdAt),
        updatedAt: toIso(row.updatedAt),
      })),
      messagesByConv,
    };
  } catch (error) {
    console.error(
      'Database query failed in listConversationsAndMessages:',
      error
    );
    throw new Error('Impossible de charger les conversations.', {
      cause: error,
    });
  }
}

export async function createConversationRecord(
  conv: Conversation
): Promise<void> {
  try {
    const now = new Date();
    await db
      .insert(conversations)
      .values({
        id: conv.id,
        title: conv.title,
        type: conv.type,
        isTeamChannel: conv.isTeamChannel,
        participantUids: conv.participantUids || [],
        lastMessageText: conv.lastMessageText || '',
        lastSenderName: conv.lastSenderName || '',
        createdByUid: conv.createdByUid,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
    void syncConversationToSupabase(conv);
  } catch (error) {
    console.error('Database query failed in createConversationRecord:', error);
    throw new Error('Impossible de créer la conversation.', { cause: error });
  }
}

export async function addMessageRecord(
  conversationId: string,
  msg: ChatMessage
): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      const now = new Date();
      await tx.insert(messages).values({
        id: msg.id,
        conversationId,
        senderUid: msg.senderUid,
        senderName: msg.senderName,
        senderRole: msg.senderRole,
        text: msg.text,
        participantUids: msg.participantUids || [],
        createdAt: now,
      });

      await tx
        .update(conversations)
        .set({
          lastMessageText: msg.text.slice(0, 120),
          lastSenderName: msg.senderName,
          updatedAt: now,
        })
        .where(eq(conversations.id, conversationId));
    });
    void syncMessageToSupabase(conversationId, msg);
  } catch (error) {
    console.error('Database query failed in addMessageRecord:', error);
    throw new Error("Impossible d'envoyer le message.", { cause: error });
  }
}

export async function listAuditLogs(): Promise<AuditLog[]> {
  try {
    const rows = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(300);

    return rows.map((row) => ({
      id: row.id,
      actorUid: row.actorUid,
      actorName: row.actorName,
      actorRole: row.actorRole as UserRole,
      action: row.action,
      targetLabel: row.targetLabel ?? undefined,
      createdAt: toIso(row.createdAt),
    }));
  } catch (error) {
    console.error('Database query failed in listAuditLogs:', error);
    throw new Error("Impossible de charger le journal d'audit.", {
      cause: error,
    });
  }
}

export async function listPriceAuditLogs(): Promise<AuditLog[]> {
  try {
    const rows = await db
      .select()
      .from(auditLogs)
      .where(
        or(
          ilike(auditLogs.action, '%prix%'),
          ilike(auditLogs.action, '%tarif%'),
          ilike(auditLogs.action, '%marge%'),
          eq(auditLogs.action, 'Ajout article catalogue')
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(500);

    return rows.map((row) => ({
      id: row.id,
      actorUid: row.actorUid,
      actorName: row.actorName,
      actorRole: row.actorRole as UserRole,
      action: row.action,
      targetLabel: row.targetLabel ?? undefined,
      createdAt: toIso(row.createdAt),
    }));
  } catch (error) {
    console.error('Database query failed in listPriceAuditLogs:', error);
    throw new Error("Impossible de charger l'historique tarifaire.", {
      cause: error,
    });
  }
}

export async function insertAuditLog(
  actorUid: string,
  actorName: string,
  actorRole: UserRole,
  action: string,
  targetLabel?: string
): Promise<AuditLog> {
  try {
    const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const [saved] = await db
      .insert(auditLogs)
      .values({
        id,
        actorUid,
        actorName,
        actorRole,
        action,
        targetLabel: targetLabel || null,
        createdAt: new Date(),
      })
      .returning();

    const mapped: AuditLog = {
      id: saved.id,
      actorUid: saved.actorUid,
      actorName: saved.actorName,
      actorRole: saved.actorRole as UserRole,
      action: saved.action,
      targetLabel: saved.targetLabel ?? undefined,
      createdAt: toIso(saved.createdAt),
    };
    void syncAuditLogToSupabase(mapped);
    return mapped;
  } catch (error) {
    console.error('Database query failed in insertAuditLog:', error);
    throw new Error("Impossible d'enregistrer l'action d'audit.", {
      cause: error,
    });
  }
}

export async function syncAllRecordsToSupabase(
  uid: string
): Promise<{ syncedProducts: number; syncedInvoices: number }> {
  try {
    const [allUsers, allProducts, currentSettings, allMembers, allInvoices, allPos, convBundle, allLogs] =
      await Promise.all([
        db.select().from(users),
        listOrSeedProducts(),
        getOrSeedSettings(),
        listMembersForUser(uid, 'super_admin'),
        listInvoicesForUser(uid, 'super_admin'),
        listPurchaseOrdersForUser(uid, 'super_admin'),
        listConversationsAndMessages(uid, 'super_admin'),
        listAuditLogs(),
      ]);

    await Promise.all([
      ...allUsers.map((u) =>
        syncUserToSupabase({
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          role: u.role as UserRole,
        })
      ),
      syncSettingsToSupabase(currentSettings),
      syncProductsToSupabase(allProducts),
      ...allMembers.map((m) => syncMemberToSupabase(m)),
      ...allInvoices.map((inv) => syncInvoiceToSupabase(inv)),
      ...allPos.map((po) => syncPurchaseOrderToSupabase(po)),
      ...convBundle.conversations.map((c) => syncConversationToSupabase(c)),
      ...Object.entries(convBundle.messagesByConv).flatMap(([convId, list]) =>
        list.map((msg) => syncMessageToSupabase(convId, msg))
      ),
      ...allLogs.map((log) => syncAuditLogToSupabase(log)),
    ]);

    return {
      syncedProducts: allProducts.length,
      syncedInvoices: allInvoices.length,
    };
  } catch (error) {
    console.error('Database syncAllRecordsToSupabase failed:', error);
    throw new Error('Impossible de synchroniser les données vers Supabase.', {
      cause: error,
    });
  }
}
