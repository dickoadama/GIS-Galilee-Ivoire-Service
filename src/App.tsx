import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  FileText,
  Home,
  Layers,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Palette,
  Settings as SettingsIcon,
  Shield,
  ShoppingBag,
  Users,
  X,
} from 'lucide-react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  auth,
  googleProvider,
  SUPER_ADMIN_EMAIL,
} from './firebase';
import {
  AuditLog,
  CartItem,
  ChatMessage,
  ContactInquiry,
  Conversation,
  DEFAULT_INVOICES,
  DEFAULT_PRODUCTS,
  DEFAULT_SETTINGS,
  Invoice,
  Member,
  PageId,
  Product,
  ProductPole,
  PurchaseOrder,
  StoreSettings,
  UserRole,
} from './types/app';
import { getRoleLabel } from './utils/formatters';
import {
  createSqlConversation,
  deleteSqlInvoice,
  deleteSqlMember,
  deleteSqlProduct,
  deleteSqlPurchaseOrder,
  fetchSqlProducts,
  fetchSqlSettings,
  fetchSqlWorkspace,
  saveSqlInvoice,
  saveSqlMember,
  saveSqlProduct,
  saveSqlPurchaseOrder,
  saveSqlSettings,
  sendSqlMessage,
  updateSqlPurchaseOrderStatus,
  WorkspacePayload,
  writeSqlAuditLog,
} from './services/sqlApiService';
import {
  discardOfflineTransaction,
  enqueueOfflineTransaction,
  flushOfflineOutbox,
  isOfflineOrNetworkError,
  loadOfflineSnapshot,
  loadOfflineSnapshotSync,
  OfflineTransaction,
  saveOfflineSnapshot,
  subscribeOfflineOutbox,
} from './services/offlineSyncService';
import { useOnlineStatus } from './hooks/usePWAInstall';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { CatalogPage } from './pages/CatalogPage';
import { StudioPage } from './pages/StudioPage';
import { OrdersPage } from './pages/OrdersPage';
import { SettingsPage } from './pages/SettingsPage';
import { MembersPage } from './pages/MembersPage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { ChatPage } from './pages/ChatPage';
import { CartDrawer } from './components/CartDrawer';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';

const STORAGE_KEYS = {
  settings: 'gis_app_settings_v2',
  cart: 'gis_app_cart_v2',
  inquiries: 'gis_app_inquiries_v2',
};

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('home');
  const [catalogPoleFilter, setCatalogPoleFilter] = useState<
    ProductPole | 'separated'
  >('separated');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Firebase Auth & Role state
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [actualRole, setActualRole] = useState<UserRole>('client');
  const [roleResolved, setRoleResolved] = useState(false);
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);

  // Domain State (hydrated from offline cache snapshot when available)
  const [settings, setSettings] = useState<StoreSettings>(() =>
    loadStored(
      STORAGE_KEYS.settings,
      loadOfflineSnapshotSync<StoreSettings>('settings') ?? DEFAULT_SETTINGS
    )
  );
  const [products, setProducts] = useState<Product[]>(
    () => loadOfflineSnapshotSync<Product[]>('products') ?? DEFAULT_PRODUCTS
  );
  const [members, setMembers] = useState<Member[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>(
    () =>
      loadOfflineSnapshotSync<WorkspacePayload>('workspace_guest')?.invoices ??
      DEFAULT_INVOICES
  );
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConv, setMessagesByConv] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [priceAuditLogs, setPriceAuditLogs] = useState<AuditLog[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() =>
    loadStored(STORAGE_KEYS.cart, [])
  );
  const [inquiries, setInquiries] = useState<ContactInquiry[]>(() =>
    loadStored(STORAGE_KEYS.inquiries, [])
  );

  const isOnline = useOnlineStatus();
  const [pendingTransactions, setPendingTransactions] = useState<
    OfflineTransaction[]
  >([]);
  const [isSyncingOutbox, setIsSyncingOutbox] = useState(false);
  const [lastSyncedCount, setLastSyncedCount] = useState(0);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);
  const [isCartVibrating, setIsCartVibrating] = useState(false);
  const cartVibrateTimerRef = useRef<number | null>(null);
  const pendingCountRef = useRef(0);

  const effectiveRole: UserRole =
    (actualRole === 'super_admin' || actualRole === 'admin_patron') &&
    previewRole
      ? previewRole
      : actualRole;

  const currentUid = firebaseUser?.uid ?? 'guest-local';
  const currentUserName =
    firebaseUser?.displayName ||
    firebaseUser?.email?.split('@')[0] ||
    'Visiteur GIS';

  const staffReaderUids = useMemo(() => {
    const uids = new Set<string>();
    if (firebaseUser?.uid) uids.add(firebaseUser.uid);
    members
      .filter((m) => m.active && m.uid)
      .forEach((m) => {
        if (m.uid) uids.add(m.uid);
      });
    return Array.from(uids).slice(0, 30);
  }, [firebaseUser?.uid, members]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  };

  // Persist local UI state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.inquiries, JSON.stringify(inquiries));
  }, [inquiries]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  useEffect(() => {
    const onQuotaExceeded = () => setMapsQuotaExceeded(true);
    const onOfflineReady = () => {
      showToast('Application prête pour la consultation hors-ligne');
    };
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    window.addEventListener('gis-pwa-offline-ready', onOfflineReady);
    const unsubOutbox = subscribeOfflineOutbox((items) => {
      setPendingTransactions(items);
      pendingCountRef.current = items.length;
    });
    return () => {
      window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
      window.removeEventListener('gis-pwa-offline-ready', onOfflineReady);
      unsubOutbox();
      if (cartVibrateTimerRef.current) {
        window.clearTimeout(cartVibrateTimerRef.current);
      }
    };
  }, []);

  const syncPendingTransactions = async () => {
    if (!isOnline || !firebaseUser) return;
    setIsSyncingOutbox(true);
    try {
      const result = await flushOfflineOutbox({
        isAuthenticated: Boolean(firebaseUser),
        executors: {
          invoice_upsert: ({ invoice, isNew }) =>
            saveSqlInvoice(invoice, isNew),
          invoice_delete: ({ invoiceId }) => deleteSqlInvoice(invoiceId),
          product_upsert: ({ product, isNew }) =>
            saveSqlProduct(product, isNew),
          product_delete: ({ productId }) => deleteSqlProduct(productId),
          purchase_order_upsert: ({ po, isNew }) =>
            saveSqlPurchaseOrder(po, isNew),
          purchase_order_status: ({ poId, status }) =>
            updateSqlPurchaseOrderStatus(poId, status),
          purchase_order_delete: ({ poId }) => deleteSqlPurchaseOrder(poId),
          settings_update: ({ settings: nextSettings }) =>
            saveSqlSettings(nextSettings),
          audit_log: ({ actorName, action, targetLabel }) =>
            writeSqlAuditLog(actorName, action, targetLabel),
        },
      });

      if (result.synced > 0) {
        setLastSyncedCount(result.synced);
        window.setTimeout(() => setLastSyncedCount(0), 4500);
        showToast(
          `${result.synced} transaction(s) synchronisée(s) avec le serveur`
        );

        // Refresh latest server state after flushing outbox
        if (result.remaining === 0) {
          try {
            const [ws, loadedProducts] = await Promise.all([
              fetchSqlWorkspace(),
              fetchSqlProducts(),
            ]);
            setActualRole(ws.role);
            setMembers(ws.members);
            setInvoices(ws.invoices);
            setPurchaseOrders(ws.purchaseOrders);
            setConversations(ws.conversations);
            setMessagesByConv(ws.messagesByConv);
            if (ws.role === 'super_admin') setAuditLogs(ws.auditLogs);
            if (ws.priceAuditLogs) setPriceAuditLogs(ws.priceAuditLogs);
            void saveOfflineSnapshot(`workspace_${firebaseUser.uid}`, ws);
            if (loadedProducts.length > 0) {
              setProducts(loadedProducts);
              void saveOfflineSnapshot('products', loadedProducts);
            }
          } catch {
            // keep local state if post-sync refresh hits transient issue
          }
        }
      }
    } finally {
      setIsSyncingOutbox(false);
    }
  };

  useEffect(() => {
    if (isOnline && firebaseUser && roleResolved && pendingTransactions.length > 0) {
      void syncPendingTransactions();
    }
  }, [isOnline, firebaseUser, roleResolved, pendingTransactions.length]);

  const recordAudit = async (action: string, targetLabel?: string) => {
    if (!firebaseUser) return;
    if (!isOnline) {
      await enqueueOfflineTransaction('audit_log', `Journal : ${action}`, {
        actorName: currentUserName,
        action,
        targetLabel,
      });
      return;
    }
    try {
      const saved = await writeSqlAuditLog(
        currentUserName,
        action,
        targetLabel
      );
      if (actualRole === 'super_admin') {
        setAuditLogs((prev) => [saved, ...prev]);
      }
      const lowerAction = action.toLowerCase();
      if (
        lowerAction.includes('prix') ||
        lowerAction.includes('tarif') ||
        lowerAction.includes('marge') ||
        action === 'Ajout article catalogue'
      ) {
        setPriceAuditLogs((prev) => [saved, ...prev]);
      }
    } catch (err) {
      if (isOfflineOrNetworkError(err)) {
        await enqueueOfflineTransaction('audit_log', `Journal : ${action}`, {
          actorName: currentUserName,
          action,
          targetLabel,
        });
        return;
      }
      console.error('Audit log error:', err);
    }
  };

  // 1. Auth Listener & PostgreSQL Workspace Bootstrap (with offline snapshot fallback)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (!user) {
        setActualRole('client');
        setPreviewRole(null);
        setRoleResolved(true);
        setMembers([]);
        setConversations([]);
        setMessagesByConv({});
        setAuditLogs([]);
        setPriceAuditLogs([]);
        const guestSnap =
          await loadOfflineSnapshot<WorkspacePayload>('workspace_guest');
        setInvoices(guestSnap?.invoices ?? DEFAULT_INVOICES);
        setPurchaseOrders([]);
        return;
      }

      setRoleResolved(false);
      const userSnapKey = `workspace_${user.uid}`;
      try {
        const ws = await fetchSqlWorkspace();
        setActualRole(ws.role);
        setMembers(ws.members);
        setInvoices(ws.invoices);
        setPurchaseOrders(ws.purchaseOrders);
        setConversations(ws.conversations);
        setMessagesByConv(ws.messagesByConv);
        setAuditLogs(ws.auditLogs);
        setPriceAuditLogs(ws.priceAuditLogs ?? []);
        void saveOfflineSnapshot(userSnapKey, ws);
        setRoleResolved(true);
      } catch (err) {
        console.error('PostgreSQL workspace sync error:', err);
        const cachedWs = await loadOfflineSnapshot<WorkspacePayload>(userSnapKey);
        if (cachedWs) {
          setActualRole(cachedWs.role);
          setMembers(cachedWs.members);
          setInvoices(cachedWs.invoices);
          setPurchaseOrders(cachedWs.purchaseOrders);
          setConversations(cachedWs.conversations);
          setMessagesByConv(cachedWs.messagesByConv);
          setAuditLogs(cachedWs.auditLogs);
          setPriceAuditLogs(cachedWs.priceAuditLogs ?? []);
        } else if ((user.email || '').toLowerCase() === SUPER_ADMIN_EMAIL) {
          setActualRole('super_admin');
        } else {
          setActualRole('client');
        }
        setRoleResolved(true);
      }
    });
    return () => unsub();
  }, []);

  // 2. Public Products & Store Settings from PostgreSQL (with offline IndexedDB snapshot)
  useEffect(() => {
    let active = true;
    const loadPublicData = async () => {
      const [cachedProducts, cachedSettings] = await Promise.all([
        loadOfflineSnapshot<Product[]>('products'),
        loadOfflineSnapshot<StoreSettings>('settings'),
      ]);
      if (active && cachedProducts && cachedProducts.length > 0) {
        setProducts(cachedProducts);
      }
      if (active && cachedSettings) {
        setSettings((prev) => ({
          ...prev,
          ...cachedSettings,
          poster: {
            ...prev.poster,
            ...cachedSettings.poster,
          },
        }));
      }

      try {
        const [loadedProducts, loadedSettings] = await Promise.all([
          fetchSqlProducts(),
          fetchSqlSettings(),
        ]);
        if (!active) return;
        if (loadedProducts.length > 0) {
          setProducts(loadedProducts);
          void saveOfflineSnapshot('products', loadedProducts);
        }
        setSettings((prev) => {
          const merged: StoreSettings = {
            ...prev,
            ...loadedSettings,
            poster: {
              ...prev.poster,
              ...loadedSettings.poster,
            },
          };
          void saveOfflineSnapshot('settings', merged);
          return merged;
        });
      } catch (err) {
        console.error('Failed to load PostgreSQL catalog/settings:', err);
      }
    };

    void loadPublicData();
    return () => {
      active = false;
    };
  }, []);

  // 3. Periodic Background Refresh for Authenticated Team Members
  useEffect(() => {
    if (!firebaseUser || !roleResolved || !isOnline) return;
    const intervalId = window.setInterval(async () => {
      if (
        document.visibilityState !== 'visible' ||
        !navigator.onLine ||
        pendingCountRef.current > 0
      ) {
        return;
      }
      try {
        const [ws, loadedProducts] = await Promise.all([
          fetchSqlWorkspace(),
          fetchSqlProducts(),
        ]);
        setActualRole(ws.role);
        setMembers(ws.members);
        setInvoices(ws.invoices);
        setPurchaseOrders(ws.purchaseOrders);
        setConversations(ws.conversations);
        setMessagesByConv(ws.messagesByConv);
        if (ws.role === 'super_admin') {
          setAuditLogs(ws.auditLogs);
        }
        if (ws.priceAuditLogs) {
          setPriceAuditLogs(ws.priceAuditLogs);
        }
        void saveOfflineSnapshot(`workspace_${firebaseUser.uid}`, ws);
        if (loadedProducts.length > 0) {
          setProducts(loadedProducts);
          void saveOfflineSnapshot('products', loadedProducts);
        }
      } catch {
        // Keep current interactive state if background refresh hits transient error
      }
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [firebaseUser, roleResolved, isOnline]);

  // Auth Actions
  const handleSignInGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('Connexion réussie');
    } catch (err) {
      console.error('Google Sign-In error:', err);
      showToast('Connexion annulée ou bloquée par le navigateur');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setPreviewRole(null);
    showToast('Session déconnectée');
  };

  // Navigation
  const handleNavigate = (
    page: PageId,
    poleFilter?: ProductPole | 'separated'
  ) => {
    if (page === 'catalog' && poleFilter) {
      setCatalogPoleFilter(poleFilter);
    }
    setActivePage(page);
    setIsMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const triggerCartVibration = () => {
    setIsCartVibrating(false);
    if (cartVibrateTimerRef.current) {
      window.clearTimeout(cartVibrateTimerRef.current);
    }
    window.requestAnimationFrame(() => {
      setIsCartVibrating(true);
      cartVibrateTimerRef.current = window.setTimeout(() => {
        setIsCartVibrating(false);
      }, 420);
    });
  };

  // Cart Actions
  const handleAddToCart = (productId: string, quantity: number) => {
    const prod = products.find((p) => p.id === productId);
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { productId, quantity }];
    });
    triggerCartVibration();
    if (prod) {
      showToast(`${prod.name} ajouté au panier`);
    }
  };

  const handleUpdateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: qty } : item
      )
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const persistWorkspaceSnapshot = (
    nextInvoices: Invoice[],
    nextPurchaseOrders: PurchaseOrder[] = purchaseOrders
  ) => {
    const snapKey = firebaseUser
      ? `workspace_${firebaseUser.uid}`
      : 'workspace_guest';
    void saveOfflineSnapshot(snapKey, {
      role: actualRole,
      members,
      invoices: nextInvoices,
      purchaseOrders: nextPurchaseOrders,
      conversations,
      messagesByConv,
      auditLogs,
      priceAuditLogs,
    });
  };

  // Domain Mutations (PostgreSQL via /api/* with automatic offline outbox queueing)
  const handleSaveInvoice = async (invoice: Invoice, isNew: boolean) => {
    const nextInvoices = isNew
      ? [invoice, ...invoices]
      : invoices.map((inv) => (inv.id === invoice.id ? invoice : inv));
    setInvoices(nextInvoices);

    const productsToUpdate: Product[] = [];
    let nextProducts = products;
    if (isNew && invoice.docType === 'facture') {
      nextProducts = products.map((prod) => {
        const line = invoice.items.find((i) => i.productId === prod.id);
        if (!line) return prod;
        const nextStock = Math.max(0, prod.stockQty - line.quantity);
        const updated: Product = {
          ...prod,
          stockQty: nextStock,
          inStock: nextStock > 0,
          orderCount: prod.orderCount + 1,
          outflowQty: prod.outflowQty + line.quantity,
          updatedAt: new Date().toISOString(),
        };
        productsToUpdate.push(updated);
        return updated;
      });
      setProducts(nextProducts);
      void saveOfflineSnapshot('products', nextProducts);
    }
    persistWorkspaceSnapshot(nextInvoices);

    const queueOfflineInvoice = async () => {
      await enqueueOfflineTransaction(
        'invoice_upsert',
        `${isNew ? 'Nouvelle' : 'MAJ'} ${invoice.docType === 'facture' ? 'facture' : 'devis'} ${invoice.code}`,
        { invoice, isNew }
      );
      for (const p of productsToUpdate) {
        await enqueueOfflineTransaction(
          'product_upsert',
          `Ajustement stock ${p.name}`,
          { product: p, isNew: false }
        );
      }
      await enqueueOfflineTransaction(
        'audit_log',
        `Journal ${invoice.code}`,
        {
          actorName: currentUserName,
          action: isNew
            ? `Création ${invoice.docType}`
            : `Modification ${invoice.docType}`,
          targetLabel: `${invoice.code} (${invoice.customerName})`,
        }
      );
      showToast(
        `${invoice.code} enregistré hors-ligne · Synchro auto au retour du réseau`
      );
    };

    if (firebaseUser) {
      if (!isOnline) {
        await queueOfflineInvoice();
        return;
      }
      try {
        await saveSqlInvoice(invoice, isNew);
        for (const p of productsToUpdate) {
          await saveSqlProduct(p, false);
        }
        await recordAudit(
          isNew
            ? `Création ${invoice.docType}`
            : `Modification ${invoice.docType}`,
          `${invoice.code} (${invoice.customerName})`
        );
      } catch (err) {
        if (isOfflineOrNetworkError(err)) {
          await queueOfflineInvoice();
          return;
        }
        console.error('Failed to save invoice to PostgreSQL:', err);
        showToast('Erreur sauvegarde base PostgreSQL');
        return;
      }
    }

    showToast(
      `${invoice.docType === 'facture' ? 'Facture' : 'Devis'} ${invoice.code} enregistré`
    );
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    const target = invoices.find((i) => i.id === invoiceId);
    const nextInvoices = invoices.filter((i) => i.id !== invoiceId);
    setInvoices(nextInvoices);
    persistWorkspaceSnapshot(nextInvoices);

    if (firebaseUser) {
      const queueDelete = async () => {
        await enqueueOfflineTransaction(
          'invoice_delete',
          `Suppression ${target ? target.code : invoiceId}`,
          { invoiceId }
        );
        showToast('Suppression mise en file hors-ligne');
      };

      if (!isOnline) {
        await queueDelete();
        return;
      }
      try {
        await deleteSqlInvoice(invoiceId);
        await recordAudit(
          'Suppression facture / devis',
          target ? target.code : invoiceId
        );
      } catch (err) {
        if (isOfflineOrNetworkError(err)) {
          await queueDelete();
          return;
        }
        console.error('Failed to delete invoice in PostgreSQL:', err);
        showToast('Erreur suppression base PostgreSQL');
        return;
      }
    }
    showToast('Document supprimé');
  };

  const handleAddProduct = async (product: Product) => {
    const nextProducts = [product, ...products];
    setProducts(nextProducts);
    void saveOfflineSnapshot('products', nextProducts);

    if (firebaseUser) {
      const queueAdd = async () => {
        await enqueueOfflineTransaction(
          'product_upsert',
          `Ajout article ${product.name}`,
          { product, isNew: true }
        );
        showToast(`${product.name} enregistré hors-ligne`);
      };

      if (!isOnline) {
        await queueAdd();
        return;
      }
      try {
        await saveSqlProduct(product, true);
        await recordAudit(
          'Ajout article catalogue',
          `${product.name} (Détail ${product.priceFcfa} · Gros ${product.wholesalePriceFcfa} FCFA) [#${product.id}]`
        );
      } catch (err) {
        if (isOfflineOrNetworkError(err)) {
          await queueAdd();
          return;
        }
        console.error('Failed to add product in PostgreSQL:', err);
        showToast('Erreur ajout article PostgreSQL');
        return;
      }
    }
    showToast(`${product.name} ajouté au catalogue`);
  };

  const handleUpdateProduct = async (updated: Product) => {
    const previous = products.find((p) => p.id === updated.id);
    const nextProducts = products.map((p) =>
      p.id === updated.id ? updated : p
    );
    setProducts(nextProducts);
    void saveOfflineSnapshot('products', nextProducts);

    if (firebaseUser) {
      const priceOrMarginChanged =
        previous &&
        (previous.priceFcfa !== updated.priceFcfa ||
          previous.wholesalePriceFcfa !== updated.wholesalePriceFcfa ||
          previous.purchaseCostFcfa !== updated.purchaseCostFcfa ||
          previous.targetMarginPct !== updated.targetMarginPct);
      const actionLabel = priceOrMarginChanged
        ? 'Modification prix & marge produit'
        : 'Mise à jour produit / stock';
      const detailLabel = priceOrMarginChanged
        ? `${updated.name} (Détail ${previous.priceFcfa}→${updated.priceFcfa} · Gros ${previous.wholesalePriceFcfa}→${updated.wholesalePriceFcfa} FCFA${
            typeof updated.purchaseCostFcfa === 'number'
              ? ` · Coût ${updated.purchaseCostFcfa} FCFA`
              : ''
          }) [#${updated.id}]`
        : `${updated.name} (Stock : ${updated.stockQty}) [#${updated.id}]`;

      const queueUpdate = async () => {
        await enqueueOfflineTransaction(
          'product_upsert',
          `MAJ ${updated.name}`,
          { product: updated, isNew: false }
        );
        await enqueueOfflineTransaction('audit_log', actionLabel, {
          actorName: currentUserName,
          action: actionLabel,
          targetLabel: detailLabel,
        });
        showToast(`${updated.name} sauvegardé hors-ligne`);
      };

      if (!isOnline) {
        await queueUpdate();
        return;
      }
      try {
        await saveSqlProduct(updated, false);
        await recordAudit(actionLabel, detailLabel);
      } catch (err) {
        if (isOfflineOrNetworkError(err)) {
          await queueUpdate();
          return;
        }
        console.error('Failed to update product in PostgreSQL:', err);
        showToast('Erreur mise à jour produit PostgreSQL');
      }
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const target = products.find((p) => p.id === productId);
    const nextProducts = products.filter((p) => p.id !== productId);
    setProducts(nextProducts);
    setCart((prev) => prev.filter((c) => c.productId !== productId));
    void saveOfflineSnapshot('products', nextProducts);

    if (firebaseUser) {
      const queueDel = async () => {
        await enqueueOfflineTransaction(
          'product_delete',
          `Suppression ${target ? target.name : productId}`,
          { productId }
        );
        showToast('Suppression mise en file hors-ligne');
      };

      if (!isOnline) {
        await queueDel();
        return;
      }
      try {
        await deleteSqlProduct(productId);
        await recordAudit(
          'Suppression article catalogue',
          target ? target.name : productId
        );
      } catch (err) {
        if (isOfflineOrNetworkError(err)) {
          await queueDel();
          return;
        }
        console.error('Failed to delete product in PostgreSQL:', err);
        showToast('Erreur suppression article PostgreSQL');
        return;
      }
    }
    showToast('Article retiré du catalogue');
  };

  const handleSavePurchaseOrder = async (
    po: PurchaseOrder,
    isNew: boolean
  ) => {
    const nextPOs = isNew
      ? [po, ...purchaseOrders]
      : purchaseOrders.map((existingPo) =>
          existingPo.id === po.id ? po : existingPo
        );
    setPurchaseOrders(nextPOs);
    persistWorkspaceSnapshot(invoices, nextPOs);

    if (firebaseUser) {
      const queuePo = async () => {
        await enqueueOfflineTransaction(
          'purchase_order_upsert',
          `Bon fournisseur ${po.code}`,
          { po, isNew }
        );
        showToast(`Bon ${po.code} enregistré hors-ligne`);
      };

      if (!isOnline) {
        await queuePo();
        return;
      }
      try {
        await saveSqlPurchaseOrder(po, isNew);
        await recordAudit(
          isNew
            ? 'Création bon de commande fournisseur'
            : 'Mise à jour bon de commande fournisseur',
          `${po.code} · ${po.supplierName} (${po.items.length} art.)`
        );
      } catch (err) {
        if (isOfflineOrNetworkError(err)) {
          await queuePo();
          return;
        }
        console.error('Failed to save purchase order in PostgreSQL:', err);
        showToast('Erreur sauvegarde bon fournisseur PostgreSQL');
        return;
      }
    }
    showToast(`Bon de commande ${po.code} enregistré`);
  };

  const handleReceivePurchaseOrder = async (po: PurchaseOrder) => {
    if (po.status === 'receptionne') return;
    const now = new Date().toISOString();
    const receivedPo: PurchaseOrder = {
      ...po,
      status: 'receptionne',
      updatedAt: now,
    };

    const nextPOs = purchaseOrders.map((item) =>
      item.id === po.id ? receivedPo : item
    );
    setPurchaseOrders(nextPOs);

    const updatedProductsToSave: Product[] = [];
    const nextProducts = products.map((prod) => {
      const orderedQty = po.items
        .filter((li) => li.productId === prod.id)
        .reduce((sum, li) => sum + li.quantity, 0);
      if (orderedQty <= 0) return prod;
      const updatedProd: Product = {
        ...prod,
        stockQty: prod.stockQty + orderedQty,
        inStock: true,
        updatedAt: now,
      };
      updatedProductsToSave.push(updatedProd);
      return updatedProd;
    });
    setProducts(nextProducts);
    void saveOfflineSnapshot('products', nextProducts);
    persistWorkspaceSnapshot(invoices, nextPOs);

    if (firebaseUser) {
      const queueReceive = async () => {
        await enqueueOfflineTransaction(
          'purchase_order_status',
          `Réception bon ${po.code}`,
          { poId: po.id, status: 'receptionne' }
        );
        for (const prod of updatedProductsToSave) {
          await enqueueOfflineTransaction(
            'product_upsert',
            `Réappro ${prod.name}`,
            { product: prod, isNew: false }
          );
        }
        showToast(`Réception ${po.code} enregistrée hors-ligne`);
      };

      if (!isOnline) {
        await queueReceive();
        return;
      }
      try {
        await updateSqlPurchaseOrderStatus(po.id, 'receptionne');
        for (const prod of updatedProductsToSave) {
          await saveSqlProduct(prod, false);
        }
        await recordAudit(
          'Réception bon fournisseur (+ Stock)',
          `${po.code} · ${po.items.length} article(s) réapprovisionné(s)`
        );
      } catch (err) {
        if (isOfflineOrNetworkError(err)) {
          await queueReceive();
          return;
        }
        console.error('Failed to receive purchase order in PostgreSQL:', err);
        showToast('Erreur réception bon fournisseur PostgreSQL');
        return;
      }
    }

    showToast(`Livraison ${po.code} réceptionnée · Stocks mis à jour`);
  };

  const handleDeletePurchaseOrder = async (poId: string) => {
    const target = purchaseOrders.find((p) => p.id === poId);
    const nextPOs = purchaseOrders.filter((p) => p.id !== poId);
    setPurchaseOrders(nextPOs);
    persistWorkspaceSnapshot(invoices, nextPOs);

    if (firebaseUser) {
      const queueDelPo = async () => {
        await enqueueOfflineTransaction(
          'purchase_order_delete',
          `Suppression bon ${target ? target.code : poId}`,
          { poId }
        );
        showToast('Suppression mise en file hors-ligne');
      };

      if (!isOnline) {
        await queueDelPo();
        return;
      }
      try {
        await deleteSqlPurchaseOrder(poId);
        await recordAudit(
          'Suppression bon de commande fournisseur',
          target ? target.code : poId
        );
      } catch (err) {
        if (isOfflineOrNetworkError(err)) {
          await queueDelPo();
          return;
        }
        console.error('Failed to delete purchase order in PostgreSQL:', err);
        showToast('Erreur suppression bon fournisseur PostgreSQL');
        return;
      }
    }
    showToast('Bon de commande supprimé');
  };

  const handleSaveMember = async (member: Member, isNew: boolean) => {
    setMembers((prev) => {
      if (isNew) return [member, ...prev];
      return prev.map((m) => (m.id === member.id ? member : m));
    });
    if (firebaseUser) {
      try {
        await saveSqlMember(member, isNew);
        await recordAudit(
          isNew ? 'Ajout membre & rôle' : 'Mise à jour rôle membre',
          `${member.fullName} → ${getRoleLabel(member.role)}`
        );
      } catch (err) {
        console.error('Failed to save member in PostgreSQL:', err);
        showToast('Erreur sauvegarde membre PostgreSQL');
        return;
      }
    }
    showToast(`Membre ${member.fullName} enregistré`);
  };

  const handleDeleteMember = async (member: Member) => {
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    if (firebaseUser) {
      try {
        await deleteSqlMember(member.id);
        await recordAudit('Suppression membre', member.fullName);
      } catch (err) {
        console.error('Failed to delete member in PostgreSQL:', err);
        showToast('Erreur suppression membre PostgreSQL');
        return;
      }
    }
    showToast(`Membre ${member.fullName} supprimé`);
  };

  const handleCreateConversation = async (conv: Conversation) => {
    setConversations((prev) => [conv, ...prev]);
    if (firebaseUser) {
      try {
        await createSqlConversation(conv);
        await recordAudit('Création conversation', conv.title);
      } catch (err) {
        console.error('Failed to create conversation in PostgreSQL:', err);
      }
    }
  };

  const handleSendMessage = async (convId: string, msg: ChatMessage) => {
    setMessagesByConv((prev) => ({
      ...prev,
      [convId]: [...(prev[convId] ?? []), msg],
    }));
    if (firebaseUser) {
      try {
        await sendSqlMessage(convId, msg);
      } catch (err) {
        console.error('Failed to send message in PostgreSQL:', err);
      }
    }
  };

  const handleUpdateSettings = (next: StoreSettings) => {
    setSettings(next);
    void saveOfflineSnapshot('settings', next);
    if (
      firebaseUser &&
      (actualRole === 'super_admin' || actualRole === 'admin_patron')
    ) {
      if (!isOnline) {
        void enqueueOfflineTransaction(
          'settings_update',
          'Modification paramètres magasin',
          { settings: next }
        );
        return;
      }
      void saveSqlSettings(next)
        .then(() =>
          recordAudit(
            'Modification paramètres magasin',
            `${next.poster.companyName} (${next.currencyLabel})`
          )
        )
        .catch((err) => {
          if (isOfflineOrNetworkError(err)) {
            void enqueueOfflineTransaction(
              'settings_update',
              'Modification paramètres magasin',
              { settings: next }
            );
            return;
          }
          console.error('Failed to save settings in PostgreSQL:', err);
        });
    }
  };

  const handleResetAll = () => {
    setSettings(DEFAULT_SETTINGS);
    setProducts(DEFAULT_PRODUCTS);
    setCart([]);
    setInquiries([]);
    localStorage.clear();
    if (
      firebaseUser &&
      (actualRole === 'super_admin' || actualRole === 'admin_patron')
    ) {
      void saveSqlSettings(DEFAULT_SETTINGS).catch((err) =>
        console.error('Failed to reset settings in PostgreSQL:', err)
      );
    }
    showToast('Paramètres locaux restaurés');
  };

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const isExecutiveRole =
    effectiveRole === 'super_admin' || effectiveRole === 'admin_patron';

  const topNavItems: { id: PageId; label: string }[] = [
    { id: 'home', label: 'Accueil' },
    ...(isExecutiveRole
      ? [{ id: 'dashboard' as PageId, label: 'Tableau de bord' }]
      : []),
    { id: 'catalog', label: 'Catalogue' },
    { id: 'invoices', label: 'Factures' },
    { id: 'chat', label: 'Messages' },
    { id: 'settings', label: 'Paramètres' },
  ];

  const sidebarItems: {
    id: PageId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    visible: boolean;
  }[] = [
    { id: 'home', label: 'Accueil GIS', icon: Home, visible: true },
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: LayoutDashboard,
      visible: isExecutiveRole,
    },
    {
      id: 'catalog',
      label: 'Tarifs séparés & Stock',
      icon: Layers,
      visible: true,
    },
    { id: 'studio', label: 'Studio d’affiche', icon: Palette, visible: true },
    { id: 'invoices', label: 'Factures & Devis', icon: FileText, visible: true },
    {
      id: 'chat',
      label: 'Conversations',
      icon: MessageSquare,
      visible: true,
    },
    {
      id: 'members',
      label: 'Membres & Rôles',
      icon: Users,
      visible: true,
    },
    {
      id: 'super_admin',
      label: 'Console Super Admin',
      icon: Shield,
      visible: actualRole === 'super_admin',
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: SettingsIcon,
      visible: true,
    },
  ];

  const renderAuthRequiredCard = (featureTitle: string) => (
    <div className="max-w-xl mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-4">
      <Shield className="w-10 h-10 text-[#D9531E] mx-auto" />
      <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white">
        {featureTitle}
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        Connectez-vous avec votre compte Google pour accéder aux données en temps réel, aux rôles attribués par le Patron et aux conversations sécurisées de l’équipe GIS.
      </p>
      <button
        type="button"
        onClick={handleSignInGoogle}
        className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#0F2342] hover:bg-[#1A355E] dark:bg-[#D9531E] dark:hover:bg-[#B84315] rounded-lg transition-colors cursor-pointer"
      >
        <LogIn className="w-4 h-4" />
        Se connecter avec Google
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F5F7] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {mapsQuotaExceeded && (
        <div className="no-print bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="no-print sticky top-0 z-30 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-[1440px] h-full mx-auto px-4 lg:px-6 flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen((v) => !v)}
              className="lg:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Menu latéral"
            >
              {isMobileSidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('home')}
              className="font-display font-bold text-lg tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              {settings.poster.companyName}
            </button>
          </div>

          <nav
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300"
            aria-label="Navigation principale"
          >
            {topNavItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'text-slate-900 dark:text-white border-[#D9531E] font-semibold'
                      : 'border-transparent hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="shrink-0 flex items-center gap-2.5">
            <PWAInstallButton />
            <motion.button
              type="button"
              onClick={() => setIsCartOpen(true)}
              animate={
                isCartVibrating
                  ? {
                      x: [0, -4, 4, -3, 3, -1.5, 0],
                      rotate: [0, -3, 3, -2, 2, 0],
                      scale: [1, 1.07, 1.02, 1.05, 1],
                    }
                  : { x: 0, rotate: 0, scale: 1 }
              }
              transition={{ duration: 0.38, ease: 'easeInOut' }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F2342] hover:bg-[#1A355E] dark:bg-[#D9531E] dark:hover:bg-[#B84315] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="font-mono-tabular">
                Panier ({totalCartItems})
              </span>
            </motion.button>
          </div>
        </div>
      </header>

      {/* Role Preview Banner if active */}
      {previewRole && actualRole === 'super_admin' && (
        <div className="no-print bg-[#D9531E] text-white px-6 py-2 text-xs font-semibold flex items-center justify-between gap-4">
          <span>
            Mode Aperçu actif : {getRoleLabel(previewRole)} (votre compte reste Super Admin)
          </span>
          <button
            type="button"
            onClick={() => setPreviewRole(null)}
            className="underline cursor-pointer"
          >
            Quitter l’aperçu
          </button>
        </div>
      )}

      {/* Workspace Shell: Static Sidebar + Scrollable Content Column */}
      <div className="flex-1 flex relative max-w-[1440px] w-full mx-auto items-start">
        {/* Static Desktop Sidebar */}
        <aside className="no-print hidden lg:flex lg:w-64 shrink-0 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] overflow-y-auto flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <nav className="space-y-1" aria-label="Menu de gestion GIS">
            {sidebarItems
              .filter((it) => it.visible)
              .map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#0F2342] text-white dark:bg-[#D9531E]'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
          </nav>

          {/* Auth / Role Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            {!authReady ? (
              <p className="text-xs text-slate-400">Vérification session...</p>
            ) : firebaseUser ? (
              <div className="space-y-2.5">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentUserName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {firebaseUser.email}
                  </p>
                  <p className="text-[11px] font-semibold text-[#D9531E] mt-0.5">
                    {getRoleLabel(effectiveRole)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Déconnexion
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Connectez-vous pour gérer l’équipe, les factures et les messages en temps réel.
                </p>
                <button
                  type="button"
                  onClick={handleSignInGoogle}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-[#0F2342] hover:bg-[#1A355E] dark:bg-[#D9531E] dark:hover:bg-[#B84315] rounded-lg cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Connexion Google
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile Drawer Sidebar */}
        {isMobileSidebarOpen && (
          <div className="no-print lg:hidden fixed inset-0 z-40 bg-slate-950/50 flex">
            <aside className="w-72 bg-white dark:bg-slate-900 h-full p-5 flex flex-col justify-between shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <span className="font-display font-bold text-base">
                    {settings.poster.brandAcronym} · Menu
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="p-1 text-slate-500 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="space-y-1">
                  {sidebarItems
                    .filter((it) => it.visible)
                    .map((item) => {
                      const Icon = item.icon;
                      const isActive = activePage === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNavigate(item.id)}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-lg cursor-pointer ${
                            isActive
                              ? 'bg-[#0F2342] text-white dark:bg-[#D9531E]'
                              : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                {firebaseUser ? (
                  <div className="space-y-2">
                    <p className="text-xs font-bold truncate">
                      {currentUserName}
                    </p>
                    <p className="text-[11px] font-semibold text-[#D9531E]">
                      {getRoleLabel(effectiveRole)}
                    </p>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
                    >
                      Déconnexion
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSignInGoogle}
                    className="w-full py-2.5 text-xs font-semibold bg-[#0F2342] text-white rounded-lg cursor-pointer"
                  >
                    Connexion Google
                  </button>
                )}
              </div>
            </aside>
          </div>
        )}

        {/* Right Content Column: Main + Quiet Footer */}
        <div className="flex-1 min-w-0 flex flex-col min-h-[calc(100vh-3.5rem)]">
          <main className="flex-1">
            {activePage === 'home' && (
              <HomePage
                settings={settings}
                products={products}
                inquiries={inquiries}
                onNavigate={handleNavigate}
                onAddInquiry={(inq) => setInquiries((prev) => [inq, ...prev])}
              />
            )}

            {activePage === 'dashboard' &&
              (!firebaseUser ? (
                renderAuthRequiredCard(
                  'Connectez-vous pour accéder au Tableau de bord Direction'
                )
              ) : !isExecutiveRole ? (
                <div className="max-w-xl mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-2">
                  <Shield className="w-8 h-8 text-red-600 mx-auto" />
                  <h2 className="font-display font-bold text-xl">
                    Accès réservé au Patron (Admin) et au Super Admin
                  </h2>
                  <p className="text-sm text-slate-500">
                    Ce tableau de bord exécutif est réservé à la direction GIS.
                  </p>
                </div>
              ) : (
                <DashboardPage
                  products={products}
                  invoices={invoices}
                  purchaseOrders={purchaseOrders}
                  members={members}
                  settings={settings}
                  currentUserName={currentUserName}
                  currentRole={effectiveRole}
                  onNavigate={handleNavigate}
                />
              ))}

            {activePage === 'catalog' && (
              <CatalogPage
                key={catalogPoleFilter}
                products={products}
                purchaseOrders={purchaseOrders}
                auditLogs={priceAuditLogs.length > 0 ? priceAuditLogs : auditLogs}
                settings={settings}
                currentUid={currentUid}
                currentUserName={currentUserName}
                currentRole={effectiveRole}
                staffReaderUids={staffReaderUids}
                isAuthenticated={Boolean(firebaseUser)}
                initialPole={catalogPoleFilter}
                onAddToCart={handleAddToCart}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onSavePurchaseOrder={handleSavePurchaseOrder}
                onReceivePurchaseOrder={handleReceivePurchaseOrder}
                onDeletePurchaseOrder={handleDeletePurchaseOrder}
                onSignIn={handleSignInGoogle}
              />
            )}

            {activePage === 'studio' && (
              <StudioPage
                content={settings.poster}
                defaultModel={settings.defaultModel}
                defaultFormat={settings.defaultFormat}
                onChangeContent={(poster) =>
                  handleUpdateSettings({ ...settings, poster })
                }
              />
            )}

            {activePage === 'invoices' && (
              <OrdersPage
                invoices={invoices}
                products={products}
                members={members}
                settings={settings}
                currentUid={currentUid}
                currentUserName={currentUserName}
                currentRole={effectiveRole}
                staffReaderUids={staffReaderUids}
                onSaveInvoice={handleSaveInvoice}
                onDeleteInvoice={handleDeleteInvoice}
              />
            )}

            {activePage === 'chat' &&
              (!firebaseUser ? (
                renderAuthRequiredCard(
                  'Connectez-vous pour accéder aux conversations'
                )
              ) : (
                <ChatPage
                  conversations={conversations}
                  messagesByConv={messagesByConv}
                  members={members}
                  currentUid={currentUid}
                  currentUserName={currentUserName}
                  currentRole={effectiveRole}
                  onCreateConversation={handleCreateConversation}
                  onSendMessage={handleSendMessage}
                />
              ))}

            {activePage === 'members' &&
              (!firebaseUser ? (
                renderAuthRequiredCard(
                  'Connectez-vous pour gérer les membres et rôles'
                )
              ) : (
                <MembersPage
                  members={members}
                  currentUid={currentUid}
                  currentRole={effectiveRole}
                  onSaveMember={handleSaveMember}
                  onDeleteMember={handleDeleteMember}
                />
              ))}

            {activePage === 'super_admin' &&
              (!firebaseUser
                ? renderAuthRequiredCard(
                    'Connexion Créateur requise pour la console Super Admin'
                  )
                : actualRole !== 'super_admin' ? (
                  <div className="max-w-xl mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-2">
                    <Shield className="w-8 h-8 text-red-600 mx-auto" />
                    <h2 className="font-display font-bold text-xl">
                      Accès réservé au Super Admin (Créateur)
                    </h2>
                    <p className="text-sm text-slate-500">
                      Cette console d’administration universelle est réservée au créateur de l’application.
                    </p>
                  </div>
                ) : (
                  <SuperAdminPage
                    members={members}
                    products={products}
                    invoices={invoices}
                    auditLogs={auditLogs}
                    settings={settings}
                    currentUid={currentUid}
                    previewRole={previewRole}
                    onSetPreviewRole={setPreviewRole}
                    onSaveMember={handleSaveMember}
                    onDeleteMember={handleDeleteMember}
                    onAddProduct={handleAddProduct}
                    onUpdateProduct={handleUpdateProduct}
                    onNavigate={(page) => handleNavigate(page)}
                  />
                ))}

            {activePage === 'settings' && (
              <SettingsPage
                settings={settings}
                products={products}
                currentRole={effectiveRole}
                onUpdateSettings={handleUpdateSettings}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onResetAll={handleResetAll}
              />
            )}
          </main>

          {/* Quiet Footer */}
          <footer className="no-print border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="px-6 py-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-xs text-slate-500 dark:text-slate-400">
              <div className="space-y-1">
                <p className="font-semibold text-slate-900 dark:text-white text-sm">
                  {settings.poster.brandAcronym} — {settings.poster.companyName}
                </p>
                <p>{settings.poster.closingSlogan}</p>
              </div>

              <div className="flex flex-wrap items-center gap-5">
                {topNavItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <p className="font-mono-tabular font-semibold text-slate-700 dark:text-slate-200">
                {settings.poster.phones[0]} / {settings.poster.phones[1]}
              </p>
            </div>
          </footer>
        </div>
      </div>

      {/* Offline Mode & Transaction Auto-Sync Banner */}
      <OfflineSyncBanner
        isOnline={isOnline}
        isSyncing={isSyncingOutbox}
        pendingTransactions={pendingTransactions}
        lastSyncedCount={lastSyncedCount}
        isAuthenticated={Boolean(firebaseUser)}
        onSyncNow={() => void syncPendingTransactions()}
        onDiscardPending={(id) => void discardOfflineTransaction(id)}
      />

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          className="no-print fixed bottom-5 right-5 z-40 bg-[#0F2342] text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2"
        >
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Slide-over Cart & Checkout Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        products={products}
        settings={settings}
        currentUid={currentUid}
        currentUserName={currentUserName}
        currentRole={effectiveRole}
        staffReaderUids={staffReaderUids}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCart([])}
        onSubmitInvoice={(inv) => void handleSaveInvoice(inv, true)}
        onOpenInvoicesPage={() => handleNavigate('invoices')}
      />
    </div>
  );
}
