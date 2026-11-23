import { auth } from '../firebase';
import {
  AuditLog,
  ChatMessage,
  Conversation,
  Invoice,
  Member,
  Product,
  PurchaseOrder,
  StoreSettings,
  UserRole,
} from '../types/app';

export interface WorkspacePayload {
  role: UserRole;
  members: Member[];
  invoices: Invoice[];
  purchaseOrders: PurchaseOrder[];
  conversations: Conversation[];
  messagesByConv: Record<string, ChatMessage[]>;
  auditLogs: AuditLog[];
  priceAuditLogs?: AuditLog[];
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken();
      headers.Authorization = `Bearer ${token}`;
    } catch {
      // Offline or cached token unavailable; allow request to fall through to SW/offline handling
    }
  }
  return headers;
}

async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
  authenticated = true
): Promise<T> {
  const headers = authenticated
    ? await getAuthHeaders()
    : { 'Content-Type': 'application/json' };

  const res = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let errMsg = `Erreur API (${res.status})`;
    try {
      const payload = (await res.json()) as { error?: string };
      if (payload.error) errMsg = payload.error;
    } catch {
      // ignore json parse failure
    }
    throw new Error(errMsg);
  }

  return (await res.json()) as T;
}

export function fetchSqlProducts(): Promise<Product[]> {
  return apiRequest<Product[]>('/api/products', { method: 'GET' }, false);
}

export function fetchSqlSettings(): Promise<StoreSettings> {
  return apiRequest<StoreSettings>('/api/settings', { method: 'GET' }, false);
}

export function fetchSqlWorkspace(): Promise<WorkspacePayload> {
  return apiRequest<WorkspacePayload>('/api/workspace', { method: 'GET' });
}

export function saveSqlSettings(
  next: StoreSettings
): Promise<StoreSettings> {
  return apiRequest<StoreSettings>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(next),
  });
}

export function saveSqlProduct(
  product: Product,
  isNew: boolean
): Promise<Product> {
  if (isNew) {
    return apiRequest<Product>('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }
  return apiRequest<Product>(`/api/products/${encodeURIComponent(product.id)}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  });
}

export function deleteSqlProduct(productId: string): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(
    `/api/products/${encodeURIComponent(productId)}`,
    { method: 'DELETE' }
  );
}

export function saveSqlMember(member: Member, isNew: boolean): Promise<Member> {
  if (isNew) {
    return apiRequest<Member>('/api/members', {
      method: 'POST',
      body: JSON.stringify(member),
    });
  }
  return apiRequest<Member>(`/api/members/${encodeURIComponent(member.id)}`, {
    method: 'PUT',
    body: JSON.stringify(member),
  });
}

export function deleteSqlMember(memberId: string): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(
    `/api/members/${encodeURIComponent(memberId)}`,
    { method: 'DELETE' }
  );
}

export function saveSqlInvoice(
  invoice: Invoice,
  isNew: boolean
): Promise<{ ok: boolean }> {
  if (isNew) {
    return apiRequest<{ ok: boolean }>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(invoice),
    });
  }
  return apiRequest<{ ok: boolean }>(
    `/api/invoices/${encodeURIComponent(invoice.id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(invoice),
    }
  );
}

export function deleteSqlInvoice(invoiceId: string): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(
    `/api/invoices/${encodeURIComponent(invoiceId)}`,
    { method: 'DELETE' }
  );
}

export function saveSqlPurchaseOrder(
  po: PurchaseOrder,
  isNew: boolean
): Promise<{ ok: boolean }> {
  if (isNew) {
    return apiRequest<{ ok: boolean }>('/api/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(po),
    });
  }
  return apiRequest<{ ok: boolean }>(
    `/api/purchase-orders/${encodeURIComponent(po.id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(po),
    }
  );
}

export function updateSqlPurchaseOrderStatus(
  poId: string,
  status: PurchaseOrder['status']
): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(
    `/api/purchase-orders/${encodeURIComponent(poId)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  );
}

export function deleteSqlPurchaseOrder(
  poId: string
): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(
    `/api/purchase-orders/${encodeURIComponent(poId)}`,
    { method: 'DELETE' }
  );
}

export function createSqlConversation(
  conv: Conversation
): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>('/api/conversations', {
    method: 'POST',
    body: JSON.stringify(conv),
  });
}

export function sendSqlMessage(
  conversationId: string,
  msg: ChatMessage
): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(
    `/api/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify(msg),
    }
  );
}

export function writeSqlAuditLog(
  actorName: string,
  action: string,
  targetLabel?: string
): Promise<AuditLog> {
  return apiRequest<AuditLog>('/api/audit-logs', {
    method: 'POST',
    body: JSON.stringify({ actorName, action, targetLabel }),
  });
}
