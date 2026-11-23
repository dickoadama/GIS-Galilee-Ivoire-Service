import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import supabaseConfig from '../../supabase-config.json' with { type: 'json' };
import type {
  AuditLog,
  ChatMessage,
  Conversation,
  Invoice,
  Member,
  Product,
  PurchaseOrder,
  StoreSettings,
  UserRole,
} from '../types/app.ts';

let _supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || supabaseConfig.url;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    supabaseConfig.publishableKey;

  if (!url || !key) return null;

  if (!_supabaseClient) {
    _supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return _supabaseClient;
}

function logSupabaseSyncIssue(op: string, error: { code?: string; message?: string }) {
  if (error.code === 'PGRST205') {
    // Table not yet created in Supabase SQL Editor — silent skip without breaking primary DB
    return;
  }
  console.warn(`Supabase sync (${op}):`, error.code || '', error.message || error);
}

export async function syncUserToSupabase(user: {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
}): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    const { error } = await sb.from('users').upsert(
      {
        uid: user.uid,
        email: user.email,
        display_name: user.displayName,
        role: user.role,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'uid' }
    );
    if (error) logSupabaseSyncIssue('upsert user', error);
  } catch (err) {
    console.warn('Supabase sync user error:', err);
  }
}

export async function syncProductsToSupabase(list: Product[]): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb || list.length === 0) return;
  try {
    const rows = list.map((p) => ({
      id: p.id,
      barcode: (p.barcode || '').trim().slice(0, 64),
      pole: p.pole,
      category: p.category,
      name: p.name,
      unit_label: p.unitLabel,
      price_fcfa: Math.max(0, Math.round(p.priceFcfa)),
      wholesale_price_fcfa: Math.max(0, Math.round(p.wholesalePriceFcfa)),
      wholesale_min_qty: Math.max(1, Math.round(p.wholesaleMinQty)),
      purchase_cost_fcfa: Math.max(
        0,
        Math.round(
          p.purchaseCostFcfa ??
            Math.round((p.wholesalePriceFcfa * 0.88) / 50) * 50
        )
      ),
      target_margin_pct: Math.min(
        500,
        Math.max(0, Number(p.targetMarginPct ?? 18))
      ),
      in_stock: p.inStock,
      stock_qty: Math.max(0, Math.round(p.stockQty)),
      critical_stock_threshold: Math.max(
        0,
        Math.round(p.criticalStockThreshold ?? 15)
      ),
      priority_score: Math.min(100, Math.max(0, Math.round(p.priorityScore))),
      order_count: Math.max(0, Math.round(p.orderCount)),
      outflow_qty: Math.max(0, Math.round(p.outflowQty)),
      description: p.description || '',
      updated_at: p.updatedAt || new Date().toISOString(),
    }));
    const { error } = await sb
      .from('products')
      .upsert(rows, { onConflict: 'id' });
    if (error) logSupabaseSyncIssue('upsert products', error);
  } catch (err) {
    console.warn('Supabase sync products error:', err);
  }
}

export async function deleteProductFromSupabase(
  productId: string
): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    const { error } = await sb.from('products').delete().eq('id', productId);
    if (error) logSupabaseSyncIssue('delete product', error);
  } catch (err) {
    console.warn('Supabase delete product error:', err);
  }
}

export async function syncSettingsToSupabase(
  next: StoreSettings
): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    const { error } = await sb.from('store_settings').upsert(
      {
        id: 'main',
        brand_acronym: next.poster.brandAcronym,
        company_name: next.poster.companyName,
        tagline: next.poster.tagline,
        location: next.poster.location,
        closing_slogan: next.poster.closingSlogan,
        phones: next.poster.phones,
        hardware: next.poster.hardware,
        beverages: next.poster.beverages,
        commitments: next.poster.commitments,
        theme: next.theme,
        default_model: next.defaultModel,
        default_format: next.defaultFormat,
        currency_label: next.currencyLabel,
        delivery_fee_fcfa: next.deliveryFeeFcfa,
        free_delivery_threshold_fcfa: next.freeDeliveryThresholdFcfa,
        hours_weekdays: next.hoursWeekdays,
        hours_saturday: next.hoursSaturday,
        hours_sunday: next.hoursSunday,
        whatsapp_phone: next.whatsappPhone,
        email: next.email,
        accepted_payments: next.acceptedPayments,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) logSupabaseSyncIssue('upsert store_settings', error);
  } catch (err) {
    console.warn('Supabase sync settings error:', err);
  }
}

export async function syncMemberToSupabase(member: Member): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    const { error } = await sb.from('members').upsert(
      {
        id: member.id,
        uid: member.uid ?? null,
        full_name: member.fullName.trim(),
        email: member.email.trim().toLowerCase(),
        phone: member.phone.trim(),
        role: member.role,
        active: member.active,
        assigned_by_uid: member.assignedByUid,
        staff_viewer_uids: member.staffViewerUids || [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) logSupabaseSyncIssue('upsert member', error);
  } catch (err) {
    console.warn('Supabase sync member error:', err);
  }
}

export async function deleteMemberFromSupabase(memberId: string): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    const { error } = await sb.from('members').delete().eq('id', memberId);
    if (error) logSupabaseSyncIssue('delete member', error);
  } catch (err) {
    console.warn('Supabase delete member error:', err);
  }
}

export async function syncInvoiceToSupabase(invoice: Invoice): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    const { error: invErr } = await sb.from('invoices').upsert(
      {
        id: invoice.id,
        doc_type: invoice.docType,
        code: invoice.code,
        customer_name: invoice.customerName,
        customer_phone: invoice.customerPhone || '',
        customer_address: invoice.customerAddress || '',
        delivery_mode: invoice.deliveryMode,
        payment_method: invoice.paymentMethod,
        notes: invoice.notes || '',
        status: invoice.status,
        discount_fcfa: invoice.discountFcfa,
        delivery_fee_fcfa: invoice.deliveryFeeFcfa,
        ciment_quincaillerie_subtotal: invoice.cimentQuincaillerieSubtotal,
        boissons_subtotal: invoice.boissonsSubtotal,
        total_fcfa: invoice.totalFcfa,
        created_by_uid: invoice.createdByUid,
        created_by_name: invoice.createdByName,
        assigned_loader_name: invoice.assignedLoaderName || '',
        assigned_driver_name: invoice.assignedDriverName || '',
        staff_reader_uids: invoice.staffReaderUids || [],
        created_at: invoice.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (invErr) {
      logSupabaseSyncIssue('upsert invoice', invErr);
      return;
    }

    await sb.from('invoice_items').delete().eq('invoice_id', invoice.id);

    if (invoice.items.length > 0) {
      const { error: itemsErr } = await sb.from('invoice_items').insert(
        invoice.items.map((item, idx) => ({
          id: `${invoice.id}__${item.id || idx}`,
          invoice_id: invoice.id,
          product_id: item.productId,
          pole: item.pole,
          name: item.name,
          unit_label: item.unitLabel,
          quantity: item.quantity,
          applied_unit_price: item.appliedUnitPrice,
          is_wholesale: item.isWholesale,
          line_total: item.lineTotal,
        }))
      );
      if (itemsErr) logSupabaseSyncIssue('insert invoice_items', itemsErr);
    }
  } catch (err) {
    console.warn('Supabase sync invoice error:', err);
  }
}

export async function deleteInvoiceFromSupabase(
  invoiceId: string
): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    const { error } = await sb.from('invoices').delete().eq('id', invoiceId);
    if (error) logSupabaseSyncIssue('delete invoice', error);
  } catch (err) {
    console.warn('Supabase delete invoice error:', err);
  }
}

export async function syncPurchaseOrderToSupabase(
  po: PurchaseOrder
): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    const { error: poErr } = await sb.from('purchase_orders').upsert(
      {
        id: po.id,
        code: po.code,
        pole_scope: po.poleScope,
        supplier_name: po.supplierName,
        supplier_phone: po.supplierPhone || '',
        supplier_address: po.supplierAddress || '',
        expected_delivery_date: po.expectedDeliveryDate || '',
        status: po.status,
        total_estimated_fcfa: po.totalEstimatedFcfa,
        notes: po.notes || '',
        created_by_uid: po.createdByUid,
        created_by_name: po.createdByName,
        staff_reader_uids: po.staffReaderUids || [],
        created_at: po.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (poErr) {
      logSupabaseSyncIssue('upsert purchase_order', poErr);
      return;
    }

    await sb
      .from('purchase_order_items')
      .delete()
      .eq('purchase_order_id', po.id);

    if (po.items.length > 0) {
      const { error: itemsErr } = await sb.from('purchase_order_items').insert(
        po.items.map((item, idx) => ({
          id: `${po.id}__${item.id || idx}`,
          purchase_order_id: po.id,
          product_id: item.productId,
          pole: item.pole,
          name: item.name,
          unit_label: item.unitLabel,
          current_stock_at_order: item.currentStockAtOrder,
          critical_threshold: item.criticalThreshold,
          quantity: item.quantity,
          estimated_unit_cost_fcfa: item.estimatedUnitCostFcfa,
          line_total_fcfa: item.lineTotalFcfa,
        }))
      );
      if (itemsErr)
        logSupabaseSyncIssue('insert purchase_order_items', itemsErr);
    }
  } catch (err) {
    console.warn('Supabase sync purchase_order error:', err);
  }
}

export async function updatePurchaseOrderStatusInSupabase(
  poId: string,
  status: PurchaseOrder['status']
): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    const { error } = await sb
      .from('purchase_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', poId);
    if (error) logSupabaseSyncIssue('update purchase_order status', error);
  } catch (err) {
    console.warn('Supabase update purchase_order status error:', err);
  }
}

export async function deletePurchaseOrderFromSupabase(
  poId: string
): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    const { error } = await sb
      .from('purchase_orders')
      .delete()
      .eq('id', poId);
    if (error) logSupabaseSyncIssue('delete purchase_order', error);
  } catch (err) {
    console.warn('Supabase delete purchase_order error:', err);
  }
}

export async function syncConversationToSupabase(
  conv: Conversation
): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    const { error } = await sb.from('conversations').upsert(
      {
        id: conv.id,
        title: conv.title,
        type: conv.type,
        is_team_channel: conv.isTeamChannel,
        participant_uids: conv.participantUids || [],
        last_message_text: conv.lastMessageText || '',
        last_sender_name: conv.lastSenderName || '',
        created_by_uid: conv.createdByUid,
        created_at: conv.createdAt || new Date().toISOString(),
        updated_at: conv.updatedAt || new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) logSupabaseSyncIssue('upsert conversation', error);
  } catch (err) {
    console.warn('Supabase sync conversation error:', err);
  }
}

export async function syncMessageToSupabase(
  conversationId: string,
  msg: ChatMessage
): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    const { error } = await sb.from('messages').upsert(
      {
        id: msg.id,
        conversation_id: conversationId,
        sender_uid: msg.senderUid,
        sender_name: msg.senderName,
        sender_role: msg.senderRole,
        text: msg.text,
        participant_uids: msg.participantUids || [],
        created_at: msg.createdAt || new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) logSupabaseSyncIssue('upsert message', error);

    await sb
      .from('conversations')
      .update({
        last_message_text: msg.text.slice(0, 120),
        last_sender_name: msg.senderName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);
  } catch (err) {
    console.warn('Supabase sync message error:', err);
  }
}

export async function syncAuditLogToSupabase(log: AuditLog): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    const { error } = await sb.from('audit_logs').upsert(
      {
        id: log.id,
        actor_uid: log.actorUid,
        actor_name: log.actorName,
        actor_role: log.actorRole,
        action: log.action,
        target_label: log.targetLabel ?? null,
        created_at: log.createdAt || new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) logSupabaseSyncIssue('upsert audit_log', error);
  } catch (err) {
    console.warn('Supabase sync audit_log error:', err);
  }
}
