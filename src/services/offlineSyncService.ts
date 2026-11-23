import {
  Invoice,
  Product,
  PurchaseOrder,
  StoreSettings,
} from '../types/app';

export type OfflineTransactionType =
  | 'invoice_upsert'
  | 'invoice_delete'
  | 'product_upsert'
  | 'product_delete'
  | 'purchase_order_upsert'
  | 'purchase_order_status'
  | 'purchase_order_delete'
  | 'settings_update'
  | 'audit_log';

export interface OfflineTransactionPayloadMap {
  invoice_upsert: { invoice: Invoice; isNew: boolean };
  invoice_delete: { invoiceId: string };
  product_upsert: { product: Product; isNew: boolean };
  product_delete: { productId: string };
  purchase_order_upsert: { po: PurchaseOrder; isNew: boolean };
  purchase_order_status: { poId: string; status: PurchaseOrder['status'] };
  purchase_order_delete: { poId: string };
  settings_update: { settings: StoreSettings };
  audit_log: { actorName: string; action: string; targetLabel?: string };
}

export interface OfflineTransaction<
  T extends OfflineTransactionType = OfflineTransactionType,
> {
  id: string;
  type: T;
  label: string;
  createdAt: string;
  payload: OfflineTransactionPayloadMap[T];
  retries: number;
  lastError?: string;
}

export interface OfflineTransactionExecutors {
  invoice_upsert: (p: OfflineTransactionPayloadMap['invoice_upsert']) => Promise<unknown>;
  invoice_delete: (p: OfflineTransactionPayloadMap['invoice_delete']) => Promise<unknown>;
  product_upsert: (p: OfflineTransactionPayloadMap['product_upsert']) => Promise<unknown>;
  product_delete: (p: OfflineTransactionPayloadMap['product_delete']) => Promise<unknown>;
  purchase_order_upsert: (p: OfflineTransactionPayloadMap['purchase_order_upsert']) => Promise<unknown>;
  purchase_order_status: (p: OfflineTransactionPayloadMap['purchase_order_status']) => Promise<unknown>;
  purchase_order_delete: (p: OfflineTransactionPayloadMap['purchase_order_delete']) => Promise<unknown>;
  settings_update: (p: OfflineTransactionPayloadMap['settings_update']) => Promise<unknown>;
  audit_log: (p: OfflineTransactionPayloadMap['audit_log']) => Promise<unknown>;
}

const DB_NAME = 'gis_offline_db';
const DB_VERSION = 1;
const STORE_SNAPSHOTS = 'snapshots';
const STORE_OUTBOX = 'outbox';
const FALLBACK_OUTBOX_KEY = 'gis_offline_outbox_fallback_v1';
const FALLBACK_SNAP_PREFIX = 'gis_offline_snap_v1_';

let dbPromise: Promise<IDBDatabase | null> | null = null;
let activeFlushPromise: Promise<FlushResult> | null = null;

type OutboxListener = (items: OfflineTransaction[]) => void;
const outboxListeners = new Set<OutboxListener>();

function openOfflineDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
          const outbox = db.createObjectStore(STORE_OUTBOX, { keyPath: 'id' });
          outbox.createIndex('by_createdAt', 'createdAt', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

export function isOfflineOrNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }
  if (error instanceof TypeError) {
    return true;
  }
  const msg =
    error instanceof Error
      ? `${error.name} ${error.message}`.toLowerCase()
      : String(error).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('auth/network-request-failed') ||
    msg.includes('load failed') ||
    msg.includes('err_internet_disconnected') ||
    msg.includes('offline')
  );
}

export async function saveOfflineSnapshot<T>(
  key: string,
  data: T
): Promise<void> {
  try {
    localStorage.setItem(`${FALLBACK_SNAP_PREFIX}${key}`, JSON.stringify(data));
  } catch {
    // ignore storage quota overflow on localStorage
  }

  const db = await openOfflineDb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
      tx.objectStore(STORE_SNAPSHOTS).put({
        key,
        data,
        updatedAt: new Date().toISOString(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function loadOfflineSnapshot<T>(key: string): Promise<T | null> {
  const db = await openOfflineDb();
  if (db) {
    const idbData = await new Promise<T | null>((resolve) => {
      try {
        const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
        const req = tx.objectStore(STORE_SNAPSHOTS).get(key);
        req.onsuccess = () => {
          const rec = req.result as { data?: T } | undefined;
          resolve(rec?.data ?? null);
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    if (idbData !== null) return idbData;
  }

  try {
    const raw = localStorage.getItem(`${FALLBACK_SNAP_PREFIX}${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function loadOfflineSnapshotSync<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`${FALLBACK_SNAP_PREFIX}${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function notifyOutboxListeners(): Promise<void> {
  const items = await listPendingOfflineTransactions();
  outboxListeners.forEach((listener) => listener(items));
}

export function subscribeOfflineOutbox(listener: OutboxListener): () => void {
  outboxListeners.add(listener);
  void listPendingOfflineTransactions().then((items) => listener(items));
  return () => {
    outboxListeners.delete(listener);
  };
}

export async function listPendingOfflineTransactions(): Promise<
  OfflineTransaction[]
> {
  const db = await openOfflineDb();
  if (db) {
    const items = await new Promise<OfflineTransaction[]>((resolve) => {
      try {
        const tx = db.transaction(STORE_OUTBOX, 'readonly');
        const req = tx.objectStore(STORE_OUTBOX).getAll();
        req.onsuccess = () => {
          const list = (req.result as OfflineTransaction[]) || [];
          list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          resolve(list);
        };
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
    return items;
  }

  try {
    const raw = localStorage.getItem(FALLBACK_OUTBOX_KEY);
    const list = raw ? (JSON.parse(raw) as OfflineTransaction[]) : [];
    return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

async function writeOutboxItem(item: OfflineTransaction): Promise<void> {
  const db = await openOfflineDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_OUTBOX, 'readwrite');
        tx.objectStore(STORE_OUTBOX).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } else {
    const current = await listPendingOfflineTransactions();
    const next = [...current.filter((i) => i.id !== item.id), item];
    localStorage.setItem(FALLBACK_OUTBOX_KEY, JSON.stringify(next));
  }
}

async function removeOutboxItem(id: string): Promise<void> {
  const db = await openOfflineDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_OUTBOX, 'readwrite');
        tx.objectStore(STORE_OUTBOX).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } else {
    const current = await listPendingOfflineTransactions();
    const next = current.filter((i) => i.id !== id);
    localStorage.setItem(FALLBACK_OUTBOX_KEY, JSON.stringify(next));
  }
}

export async function enqueueOfflineTransaction<
  T extends OfflineTransactionType,
>(
  type: T,
  label: string,
  payload: OfflineTransactionPayloadMap[T]
): Promise<OfflineTransaction<T>> {
  const item: OfflineTransaction<T> = {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    label,
    createdAt: new Date().toISOString(),
    payload,
    retries: 0,
  };

  await writeOutboxItem(item);
  await notifyOutboxListeners();

  // Best-effort Background Sync registration on supporting browsers
  try {
    if (
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      'SyncManager' in window
    ) {
      const reg = await navigator.serviceWorker.ready;
      const syncReg = reg as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      };
      if (syncReg.sync) {
        await syncReg.sync.register('gis-transactions-sync');
      }
    }
  } catch {
    // Ignore when Background Sync permission or SyncManager is unavailable
  }

  return item;
}

export async function discardOfflineTransaction(id: string): Promise<void> {
  await removeOutboxItem(id);
  await notifyOutboxListeners();
}

export interface FlushResult {
  synced: number;
  remaining: number;
  failed: number;
  needsAuth: boolean;
}

export function flushOfflineOutbox(options: {
  isAuthenticated: boolean;
  executors: OfflineTransactionExecutors;
}): Promise<FlushResult> {
  if (activeFlushPromise) {
    return activeFlushPromise;
  }

  activeFlushPromise = (async (): Promise<FlushResult> => {
    const pending = await listPendingOfflineTransactions();
    if (pending.length === 0) {
      return { synced: 0, remaining: 0, failed: 0, needsAuth: false };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        synced: 0,
        remaining: pending.length,
        failed: 0,
        needsAuth: false,
      };
    }

    if (!options.isAuthenticated) {
      return {
        synced: 0,
        remaining: pending.length,
        failed: 0,
        needsAuth: true,
      };
    }

    let synced = 0;
    let failed = 0;

    for (const txItem of pending) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        break;
      }

      try {
        switch (txItem.type) {
          case 'invoice_upsert':
            await options.executors.invoice_upsert(
              txItem.payload as OfflineTransactionPayloadMap['invoice_upsert']
            );
            break;
          case 'invoice_delete':
            await options.executors.invoice_delete(
              txItem.payload as OfflineTransactionPayloadMap['invoice_delete']
            );
            break;
          case 'product_upsert':
            await options.executors.product_upsert(
              txItem.payload as OfflineTransactionPayloadMap['product_upsert']
            );
            break;
          case 'product_delete':
            await options.executors.product_delete(
              txItem.payload as OfflineTransactionPayloadMap['product_delete']
            );
            break;
          case 'purchase_order_upsert':
            await options.executors.purchase_order_upsert(
              txItem.payload as OfflineTransactionPayloadMap['purchase_order_upsert']
            );
            break;
          case 'purchase_order_status':
            await options.executors.purchase_order_status(
              txItem.payload as OfflineTransactionPayloadMap['purchase_order_status']
            );
            break;
          case 'purchase_order_delete':
            await options.executors.purchase_order_delete(
              txItem.payload as OfflineTransactionPayloadMap['purchase_order_delete']
            );
            break;
          case 'settings_update':
            await options.executors.settings_update(
              txItem.payload as OfflineTransactionPayloadMap['settings_update']
            );
            break;
          case 'audit_log':
            await options.executors.audit_log(
              txItem.payload as OfflineTransactionPayloadMap['audit_log']
            );
            break;
        }

        await removeOutboxItem(txItem.id);
        synced += 1;
      } catch (err) {
        if (isOfflineOrNetworkError(err)) {
          // Stop flushing immediately if connection dropped again
          break;
        }
        failed += 1;
        await writeOutboxItem({
          ...txItem,
          retries: txItem.retries + 1,
          lastError: err instanceof Error ? err.message : String(err),
        });
      }
    }

    await notifyOutboxListeners();
    const after = await listPendingOfflineTransactions();
    return {
      synced,
      remaining: after.length,
      failed,
      needsAuth: false,
    };
  })().finally(() => {
    activeFlushPromise = null;
  });

  return activeFlushPromise;
}
