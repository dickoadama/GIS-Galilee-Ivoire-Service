import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { type AuthRequest, requireAuth } from './src/middleware/auth.ts';
import {
  addMessageRecord,
  createConversationRecord,
  getOrSeedSettings,
  insertAuditLog,
  listAuditLogs,
  listPriceAuditLogs,
  listConversationsAndMessages,
  listInvoicesForUser,
  listMembersForUser,
  listOrSeedProducts,
  listPurchaseOrdersForUser,
  removeInvoice,
  removeMember,
  removeProduct,
  removePurchaseOrder,
  syncAllRecordsToSupabase,
  updatePurchaseOrderStatus,
  upsertInvoiceWithItems,
  upsertMember,
  upsertProduct,
  upsertPurchaseOrderWithItems,
  upsertSettings,
} from './src/db/repository.ts';
import {
  type ChatMessage,
  type Conversation,
  type Invoice,
  type Member,
  type Product,
  type ProductPole,
  type PurchaseOrder,
  type StoreSettings,
  type UserRole,
  WORKER_ROLES,
} from './src/types/app.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function canEditProductPole(role: UserRole, pole: ProductPole): boolean {
  if (role === 'super_admin' || role === 'admin_patron') return true;
  if (
    role === 'gerant_ciment' &&
    (pole === 'ciment' || pole === 'quincaillerie')
  ) {
    return true;
  }
  if (role === 'gerant_boisson' && pole === 'boissons') return true;
  return false;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Public Catalog & Store Settings
  app.get('/api/products', async (_req, res) => {
    try {
      const data = await listOrSeedProducts();
      res.json(data);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erreur chargement produits';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/settings', async (_req, res) => {
    try {
      const data = await getOrSeedSettings();
      res.json(data);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erreur chargement paramètres';
      res.status(500).json({ error: msg });
    }
  });

  // Authenticated Workspace Bootstrap
  app.get('/api/workspace', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const role: UserRole = req.userRole ?? 'client';

      const [
        members,
        invoices,
        purchaseOrders,
        convBundle,
        auditLogs,
        priceAuditLogs,
      ] = await Promise.all([
        listMembersForUser(uid, role),
        listInvoicesForUser(uid, role),
        listPurchaseOrdersForUser(uid, role),
        listConversationsAndMessages(uid, role),
        role === 'super_admin' ? listAuditLogs() : Promise.resolve([]),
        role !== 'client' ? listPriceAuditLogs() : Promise.resolve([]),
      ]);

      res.json({
        role,
        members,
        invoices,
        purchaseOrders,
        conversations: convBundle.conversations,
        messagesByConv: convBundle.messagesByConv,
        auditLogs,
        priceAuditLogs,
      });
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Erreur chargement espace de travail';
      res.status(500).json({ error: msg });
    }
  });

  // Store Settings Mutation
  app.put('/api/settings', requireAuth, async (req: AuthRequest, res) => {
    const role: UserRole = req.userRole ?? 'client';
    if (role !== 'super_admin' && role !== 'admin_patron') {
      res.status(403).json({ error: 'Accès réservé au Patron / Super Admin.' });
      return;
    }
    try {
      const saved = await upsertSettings(req.body as StoreSettings);
      res.json(saved);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erreur sauvegarde paramètres';
      res.status(500).json({ error: msg });
    }
  });

  // Product Mutations
  app.post('/api/products', requireAuth, async (req: AuthRequest, res) => {
    const role: UserRole = req.userRole ?? 'client';
    const product = req.body as Product;
    if (!canEditProductPole(role, product.pole)) {
      res.status(403).json({ error: 'Permission insuffisante sur ce pôle.' });
      return;
    }
    try {
      const saved = await upsertProduct(product);
      res.status(201).json(saved);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erreur création produit';
      res.status(500).json({ error: msg });
    }
  });

  app.put('/api/products/:id', requireAuth, async (req: AuthRequest, res) => {
    const role: UserRole = req.userRole ?? 'client';
    const product = { ...(req.body as Product), id: req.params.id };
    if (!canEditProductPole(role, product.pole) && role !== 'caisse') {
      res.status(403).json({ error: 'Permission insuffisante sur ce pôle.' });
      return;
    }
    try {
      const saved = await upsertProduct(product);
      res.json(saved);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erreur mise à jour produit';
      res.status(500).json({ error: msg });
    }
  });

  app.delete('/api/products/:id', requireAuth, async (req: AuthRequest, res) => {
    const role: UserRole = req.userRole ?? 'client';
    if (role !== 'super_admin' && role !== 'admin_patron') {
      res.status(403).json({ error: 'Suppression réservée au Patron.' });
      return;
    }
    try {
      await removeProduct(req.params.id);
      res.json({ ok: true });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erreur suppression produit';
      res.status(500).json({ error: msg });
    }
  });

  // Member Mutations
  app.post('/api/members', requireAuth, async (req: AuthRequest, res) => {
    const role: UserRole = req.userRole ?? 'client';
    const member = req.body as Member;
    const allowed =
      role === 'super_admin' ||
      (role === 'admin_patron' && WORKER_ROLES.includes(member.role));
    if (!allowed) {
      res.status(403).json({ error: 'Permission insuffisante pour ce rôle.' });
      return;
    }
    try {
      const saved = await upsertMember(member);
      res.status(201).json(saved);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erreur création membre';
      res.status(500).json({ error: msg });
    }
  });

  app.put('/api/members/:id', requireAuth, async (req: AuthRequest, res) => {
    const role: UserRole = req.userRole ?? 'client';
    const member = { ...(req.body as Member), id: req.params.id };
    const allowed =
      role === 'super_admin' ||
      (role === 'admin_patron' && WORKER_ROLES.includes(member.role));
    if (!allowed) {
      res.status(403).json({ error: 'Permission insuffisante pour ce rôle.' });
      return;
    }
    try {
      const saved = await upsertMember(member);
      res.json(saved);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erreur mise à jour membre';
      res.status(500).json({ error: msg });
    }
  });

  app.delete('/api/members/:id', requireAuth, async (req: AuthRequest, res) => {
    const role: UserRole = req.userRole ?? 'client';
    if (role !== 'super_admin' && role !== 'admin_patron') {
      res.status(403).json({ error: 'Permission insuffisante.' });
      return;
    }
    try {
      await removeMember(req.params.id);
      res.json({ ok: true });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erreur suppression membre';
      res.status(500).json({ error: msg });
    }
  });

  // Invoice Mutations
  app.post('/api/invoices', requireAuth, async (req: AuthRequest, res) => {
    try {
      await upsertInvoiceWithItems(req.body as Invoice);
      res.status(201).json({ ok: true });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erreur création facture';
      res.status(500).json({ error: msg });
    }
  });

  app.put('/api/invoices/:id', requireAuth, async (req: AuthRequest, res) => {
    const role: UserRole = req.userRole ?? 'client';
    if (role === 'client') {
      res.status(403).json({ error: 'Modification réservée au personnel.' });
      return;
    }
    try {
      await upsertInvoiceWithItems({
        ...(req.body as Invoice),
        id: req.params.id,
      });
      res.json({ ok: true });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erreur mise à jour facture';
      res.status(500).json({ error: msg });
    }
  });

  app.delete('/api/invoices/:id', requireAuth, async (req: AuthRequest, res) => {
    const role: UserRole = req.userRole ?? 'client';
    if (role !== 'super_admin' && role !== 'admin_patron') {
      res.status(403).json({ error: 'Suppression réservée au Patron.' });
      return;
    }
    try {
      await removeInvoice(req.params.id);
      res.json({ ok: true });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erreur suppression facture';
      res.status(500).json({ error: msg });
    }
  });

  // Purchase Order Mutations
  app.post('/api/purchase-orders', requireAuth, async (req: AuthRequest, res) => {
    const role: UserRole = req.userRole ?? 'client';
    if (
      role !== 'super_admin' &&
      role !== 'admin_patron' &&
      role !== 'gerant_ciment' &&
      role !== 'gerant_boisson'
    ) {
      res.status(403).json({ error: 'Accès réservé aux gérants et patrons.' });
      return;
    }
    try {
      await upsertPurchaseOrderWithItems(req.body as PurchaseOrder);
      res.status(201).json({ ok: true });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erreur création bon fournisseur';
      res.status(500).json({ error: msg });
    }
  });

  app.put(
    '/api/purchase-orders/:id',
    requireAuth,
    async (req: AuthRequest, res) => {
      const role: UserRole = req.userRole ?? 'client';
      if (
        role !== 'super_admin' &&
        role !== 'admin_patron' &&
        role !== 'gerant_ciment' &&
        role !== 'gerant_boisson'
      ) {
        res.status(403).json({ error: 'Accès réservé aux gérants et patrons.' });
        return;
      }
      try {
        await upsertPurchaseOrderWithItems({
          ...(req.body as PurchaseOrder),
          id: req.params.id,
        });
        res.json({ ok: true });
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : 'Erreur mise à jour bon fournisseur';
        res.status(500).json({ error: msg });
      }
    }
  );

  app.patch(
    '/api/purchase-orders/:id/status',
    requireAuth,
    async (req: AuthRequest, res) => {
      const role: UserRole = req.userRole ?? 'client';
      if (
        role !== 'super_admin' &&
        role !== 'admin_patron' &&
        role !== 'gerant_ciment' &&
        role !== 'gerant_boisson'
      ) {
        res.status(403).json({ error: 'Accès réservé aux gérants et patrons.' });
        return;
      }
      try {
        const status = (req.body as { status: PurchaseOrder['status'] }).status;
        await updatePurchaseOrderStatus(req.params.id, status);
        res.json({ ok: true });
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : 'Erreur changement statut bon fournisseur';
        res.status(500).json({ error: msg });
      }
    }
  );

  app.delete(
    '/api/purchase-orders/:id',
    requireAuth,
    async (req: AuthRequest, res) => {
      const role: UserRole = req.userRole ?? 'client';
      if (role !== 'super_admin' && role !== 'admin_patron') {
        res.status(403).json({ error: 'Suppression réservée au Patron.' });
        return;
      }
      try {
        await removePurchaseOrder(req.params.id);
        res.json({ ok: true });
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : 'Erreur suppression bon fournisseur';
        res.status(500).json({ error: msg });
      }
    }
  );

  // Conversations & Messages
  app.post('/api/conversations', requireAuth, async (req: AuthRequest, res) => {
    try {
      await createConversationRecord(req.body as Conversation);
      res.status(201).json({ ok: true });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erreur création conversation';
      res.status(500).json({ error: msg });
    }
  });

  app.post(
    '/api/conversations/:id/messages',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        await addMessageRecord(req.params.id, req.body as ChatMessage);
        res.status(201).json({ ok: true });
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : 'Erreur envoi message';
        res.status(500).json({ error: msg });
      }
    }
  );

  // Audit Log Append
  app.post('/api/audit-logs', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const role: UserRole = req.userRole ?? 'client';
      const body = req.body as {
        actorName: string;
        action: string;
        targetLabel?: string;
      };
      const saved = await insertAuditLog(
        uid,
        body.actorName || req.user!.name || req.user!.email || 'Utilisateur',
        role,
        body.action,
        body.targetLabel
      );
      res.status(201).json(saved);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erreur écriture audit log';
      res.status(500).json({ error: msg });
    }
  });

  // Full Backfill Sync: Cloud SQL -> Supabase (Super Admin / Patron)
  app.post('/api/sync-supabase', requireAuth, async (req: AuthRequest, res) => {
    const role: UserRole = req.userRole ?? 'client';
    if (role !== 'super_admin' && role !== 'admin_patron') {
      res.status(403).json({ error: 'Accès réservé au Super Admin / Patron.' });
      return;
    }
    try {
      const summary = await syncAllRecordsToSupabase(req.user!.uid);
      res.json({ ok: true, ...summary });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erreur synchronisation Supabase';
      res.status(500).json({ error: msg });
    }
  });

  // Google Maps Platform Server-Side Proxies (avoids browser CORS & protects API calls)
  const geocodeCache = new globalThis.Map<
    string,
    {
      expiresAt: number;
      payload: {
        found: boolean;
        lat?: number;
        lng?: number;
        formattedAddress?: string;
        placeId?: string;
        status: string;
      };
    }
  >();

  const getServerMapsKey = () =>
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    '';

  const isValidLatLng = (pt: unknown): pt is { lat: number; lng: number } => {
    if (!pt || typeof pt !== 'object') return false;
    const obj = pt as { lat?: unknown; lng?: unknown };
    return (
      typeof obj.lat === 'number' &&
      typeof obj.lng === 'number' &&
      Number.isFinite(obj.lat) &&
      Number.isFinite(obj.lng) &&
      obj.lat >= -90 &&
      obj.lat <= 90 &&
      obj.lng >= -180 &&
      obj.lng <= 180
    );
  };

  const parseDurationSeconds = (raw?: string): number => {
    if (!raw || typeof raw !== 'string') return 0;
    const match = raw.match(/^(\d+(?:\.\d+)?)s$/);
    return match ? Math.round(Number(match[1])) : 0;
  };

  app.post('/api/maps/geocode', async (req, res) => {
    const mapsApiKey = getServerMapsKey();
    if (!mapsApiKey) {
      res.status(503).json({ error: 'Clé API Google Maps non configurée.' });
      return;
    }

    const rawAddress =
      typeof req.body?.address === 'string' ? req.body.address.trim() : '';
    if (rawAddress.length < 2 || rawAddress.length > 300) {
      res.status(400).json({ error: 'Adresse invalide pour le géocodage.' });
      return;
    }

    const cacheKey = rawAddress.toLowerCase();
    const cached = geocodeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.json(cached.payload);
      return;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        rawAddress
      )}&language=fr&region=ci&key=${encodeURIComponent(mapsApiKey)}`;

      const upstream = await fetch(url);
      const data = (await upstream.json()) as {
        status?: string;
        error_message?: string;
        results?: Array<{
          formatted_address?: string;
          place_id?: string;
          geometry?: { location?: { lat?: number; lng?: number } };
        }>;
      };

      if (
        upstream.status === 429 ||
        data.status === 'OVER_QUERY_LIMIT' ||
        data.status === 'OVER_DAILY_LIMIT'
      ) {
        res.status(429).json({
          error: 'Quota Google Maps Geocoding atteint.',
          quotaExceeded: true,
        });
        return;
      }

      if (data.status === 'ZERO_RESULTS') {
        const emptyPayload = { found: false, status: 'ZERO_RESULTS' };
        geocodeCache.set(cacheKey, {
          expiresAt: Date.now() + 1000 * 60 * 30,
          payload: emptyPayload,
        });
        res.json(emptyPayload);
        return;
      }

      const top = data.results?.[0];
      const loc = top?.geometry?.location;
      if (
        data.status === 'OK' &&
        top &&
        loc &&
        typeof loc.lat === 'number' &&
        typeof loc.lng === 'number'
      ) {
        const okPayload = {
          found: true,
          lat: loc.lat,
          lng: loc.lng,
          formattedAddress: top.formatted_address ?? rawAddress,
          placeId: top.place_id,
          status: 'OK',
        };
        if (geocodeCache.size > 250) {
          const oldestKey = geocodeCache.keys().next().value;
          if (oldestKey) geocodeCache.delete(oldestKey);
        }
        geocodeCache.set(cacheKey, {
          expiresAt: Date.now() + 1000 * 60 * 60 * 6,
          payload: okPayload,
        });
        res.json(okPayload);
        return;
      }

      res.status(502).json({
        error:
          data.error_message ||
          `Erreur géocodage Google Maps (${data.status ?? upstream.status}).`,
      });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erreur réseau géocodage';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/maps/optimize-route', async (req, res) => {
    const mapsApiKey = getServerMapsKey();
    if (!mapsApiKey) {
      res.status(503).json({ error: 'Clé API Google Maps non configurée.' });
      return;
    }

    const origin = req.body?.origin;
    const destination = req.body?.destination;
    const intermediatesRaw = Array.isArray(req.body?.intermediates)
      ? req.body.intermediates
      : [];
    const optimizeRequested = req.body?.optimizeWaypointOrder !== false;

    if (!isValidLatLng(origin) || !isValidLatLng(destination)) {
      res.status(400).json({
        error: 'Coordonnées de départ ou d’arrivée invalides.',
      });
      return;
    }

    if (intermediatesRaw.length > 15) {
      res.status(400).json({
        error: 'Maximum 15 arrêts intermédiaires autorisés par tournée.',
      });
      return;
    }

    const intermediates: Array<{ lat: number; lng: number }> = [];
    for (const item of intermediatesRaw) {
      if (!isValidLatLng(item)) {
        res.status(400).json({
          error: 'Coordonnées d’un arrêt intermédiaire invalides.',
        });
        return;
      }
      intermediates.push({ lat: item.lat, lng: item.lng });
    }

    const useOptimization = optimizeRequested && intermediates.length >= 2;
    const fieldMask = useOptimization
      ? 'routes.duration,routes.distanceMeters,routes.optimizedIntermediateWaypointIndex,routes.polyline.encodedPolyline,routes.viewport,routes.legs.distanceMeters,routes.legs.duration'
      : 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.viewport,routes.legs.distanceMeters,routes.legs.duration';

    const requestBody: Record<string, unknown> = {
      origin: {
        location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
      },
      destination: {
        location: {
          latLng: { latitude: destination.lat, longitude: destination.lng },
        },
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      languageCode: 'fr-FR',
      regionCode: 'CI',
    };

    if (intermediates.length > 0) {
      requestBody.intermediates = intermediates.map((wp) => ({
        location: { latLng: { latitude: wp.lat, longitude: wp.lng } },
      }));
    }
    if (useOptimization) {
      requestBody.optimizeWaypointOrder = true;
    }

    try {
      const upstream = await fetch(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': mapsApiKey,
            'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
            'X-Goog-FieldMask': fieldMask,
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = (await upstream.json()) as {
        error?: { code?: number; status?: string; message?: string };
        routes?: Array<{
          distanceMeters?: number;
          duration?: string;
          optimizedIntermediateWaypointIndex?: number[];
          polyline?: { encodedPolyline?: string };
          viewport?: {
            low?: { latitude?: number; longitude?: number };
            high?: { latitude?: number; longitude?: number };
          };
          legs?: Array<{ distanceMeters?: number; duration?: string }>;
        }>;
      };

      if (
        upstream.status === 429 ||
        data.error?.status === 'RESOURCE_EXHAUSTED'
      ) {
        res.status(429).json({
          error: 'Quota Google Maps Routes API atteint.',
          quotaExceeded: true,
        });
        return;
      }

      if (!upstream.ok) {
        res.status(upstream.status >= 400 ? upstream.status : 502).json({
          error:
            data.error?.message ||
            `Erreur calcul d’itinéraire (${upstream.status}).`,
        });
        return;
      }

      const route = data.routes?.[0];
      if (!route) {
        res.json({
          found: false,
          distanceMeters: 0,
          durationSeconds: 0,
          encodedPolyline: '',
          viewport: null,
          optimizedIntermediateWaypointIndex: intermediates.map((_, idx) => idx),
          legs: [],
        });
        return;
      }

      res.json({
        found: true,
        distanceMeters: route.distanceMeters ?? 0,
        durationSeconds: parseDurationSeconds(route.duration),
        encodedPolyline: route.polyline?.encodedPolyline ?? '',
        viewport: route.viewport ?? null,
        optimizedIntermediateWaypointIndex:
          route.optimizedIntermediateWaypointIndex ??
          intermediates.map((_, idx) => idx),
        legs: (route.legs ?? []).map((leg) => ({
          distanceMeters: leg.distanceMeters ?? 0,
          durationSeconds: parseDurationSeconds(leg.duration),
        })),
      });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erreur réseau Routes API';
      res.status(500).json({ error: msg });
    }
  });

  // Frontend Serving (Vite Dev Middleware vs Production Static)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GIS server running on port ${PORT}`);
    if (process.env.SUPABASE_SECRET_KEY) {
      void syncAllRecordsToSupabase('system').catch((err) => {
        console.warn('Initial Supabase sync skipped:', err);
      });
    }
  });
}

void startServer();
