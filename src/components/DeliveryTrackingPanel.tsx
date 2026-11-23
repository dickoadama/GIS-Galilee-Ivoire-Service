import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Pencil,
  Route as RouteIcon,
  Truck,
} from 'lucide-react';
import {
  Invoice,
  InvoiceStatus,
  Member,
  StoreSettings,
} from '../types/app';
import {
  formatFcfa,
  getInvoiceStatusLabel,
} from '../utils/formatters';
import {
  LatLngPoint,
  RouteLegSummary,
  geocodeAddress,
  optimizeDeliveryRoute,
} from '../services/mapsApiService';

interface DeliveryTrackingPanelProps {
  invoices: Invoice[];
  members: Member[];
  settings: StoreSettings;
  selectedInvoiceId: string | null;
  canLogisticsUpdate: boolean;
  onSelectInvoice: (invoiceId: string) => void;
  onSaveInvoice: (invoice: Invoice, isNew: boolean) => void;
  onQuickStatus: (invoice: Invoice, status: InvoiceStatus) => void;
}

interface GeocodeCacheEntry {
  status: 'loading' | 'resolved' | 'not_found' | 'error';
  lat?: number;
  lng?: number;
  formattedAddress?: string;
  errorMsg?: string;
}

interface OptimizedRouteState {
  orderedInvoiceIds: string[];
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline: string;
  legs: RouteLegSummary[];
  depot: LatLngPoint;
  returnToDepot: boolean;
}

const DEPOT_STORAGE_KEY = 'gis_delivery_depot_origin_v1';

function formatDistanceMeters(meters: number): string {
  if (!meters || meters <= 0) return '0 m';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

function formatDurationSeconds(seconds: number): string {
  if (!seconds || seconds <= 0) return '0 min';
  const totalMin = Math.max(1, Math.round(seconds / 60));
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

function getMarkerColors(
  inv: Invoice,
  stopNumber: number | null,
  isSelected: boolean
): { background: string; borderColor: string; glyphColor: string } {
  if (isSelected) {
    return {
      background: '#0F2342',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
    };
  }
  if (inv.status === 'prete_livree' || inv.status === 'payee') {
    return {
      background: '#059669',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
    };
  }
  if (stopNumber !== null) {
    return {
      background: '#D9531E',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
    };
  }
  return {
    background: '#0369A1',
    borderColor: '#ffffff',
    glyphColor: '#ffffff',
  };
}

interface DepotMarkerProps {
  position: LatLngPoint;
  label: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const DepotMarker: React.FC<DepotMarkerProps> = ({
  position,
  label,
  isOpen,
  onOpen,
  onClose,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={position}
        title="Point de départ / Dépôt GIS"
        onClick={onOpen}
      >
        <Pin
          background="#0F2342"
          borderColor="#ffffff"
          glyphColor="#ffffff"
          glyphText="D"
          scale={1.15}
        />
      </AdvancedMarker>
      {isOpen && marker && (
        <InfoWindow anchor={marker} maxWidth={260} onCloseClick={onClose}>
          <div className="text-slate-900 space-y-1 p-0.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#0F2342]">
              Point de départ (Dépôt)
            </p>
            <p className="text-xs text-slate-700 leading-snug">{label}</p>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

interface StopMarkerProps {
  invoice: Invoice;
  position: LatLngPoint;
  formattedAddress: string;
  stopNumber: number | null;
  legSummary?: RouteLegSummary;
  isSelected: boolean;
  isInfoOpen: boolean;
  canLogisticsUpdate: boolean;
  currencyLabel: string;
  onOpen: () => void;
  onClose: () => void;
  onFocusInvoice: () => void;
  onMarkDelivered: () => void;
}

const DeliveryStopMarker: React.FC<StopMarkerProps> = ({
  invoice,
  position,
  formattedAddress,
  stopNumber,
  legSummary,
  isSelected,
  isInfoOpen,
  canLogisticsUpdate,
  currencyLabel,
  onOpen,
  onClose,
  onFocusInvoice,
  onMarkDelivered,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const colors = getMarkerColors(invoice, stopNumber, isSelected);
  const glyphText = stopNumber !== null ? String(stopNumber) : '•';

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={position}
        title={`${invoice.code} — ${invoice.customerName}`}
        onClick={onOpen}
      >
        <Pin
          background={colors.background}
          borderColor={colors.borderColor}
          glyphColor={colors.glyphColor}
          glyphText={glyphText}
          scale={isSelected ? 1.2 : 1.05}
        />
      </AdvancedMarker>
      {isInfoOpen && marker && (
        <InfoWindow anchor={marker} maxWidth={280} onCloseClick={onClose}>
          <div className="text-slate-900 space-y-2 p-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono-tabular font-bold text-xs text-[#0F2342]">
                {stopNumber !== null ? `Arrêt #${stopNumber} · ` : ''}
                {invoice.code}
              </span>
              <span className="text-[11px] font-semibold text-slate-600">
                {getInvoiceStatusLabel(invoice.status)}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                {invoice.customerName}
              </p>
              {invoice.customerPhone && (
                <p className="text-[11px] font-mono-tabular text-slate-600">
                  {invoice.customerPhone}
                </p>
              )}
              <p className="text-xs text-slate-700 mt-1 leading-snug">
                {invoice.customerAddress}
              </p>
              {formattedAddress &&
                formattedAddress !== invoice.customerAddress && (
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Repère Maps : {formattedAddress}
                  </p>
                )}
            </div>
            {legSummary && (
              <p className="text-[11px] font-semibold text-[#D9531E]">
                Trajet étape : {formatDistanceMeters(legSummary.distanceMeters)} ·{' '}
                {formatDurationSeconds(legSummary.durationSeconds)}
              </p>
            )}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200 text-xs">
              <span className="font-mono-tabular font-bold">
                {formatFcfa(invoice.totalFcfa, currencyLabel)}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onFocusInvoice}
                  className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded cursor-pointer"
                >
                  Détails
                </button>
                {canLogisticsUpdate &&
                  invoice.status !== 'prete_livree' &&
                  invoice.status !== 'payee' && (
                    <button
                      type="button"
                      onClick={onMarkDelivered}
                      className="px-2 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                    >
                      Livrée
                    </button>
                  )}
              </div>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

interface MapEffectsLayerProps {
  depotPoint: LatLngPoint | null;
  stopPoints: LatLngPoint[];
  encodedPolyline: string;
}

const MapEffectsLayer: React.FC<MapEffectsLayerProps> = ({
  depotPoint,
  stopPoints,
  encodedPolyline,
}) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const coreLib = useMapsLibrary('core');
  const geometryLib = useMapsLibrary('geometry');

  // Render active optimized route polyline
  useEffect(() => {
    if (!map || !mapsLib || !geometryLib || !encodedPolyline) return;

    const decodedPath = geometryLib.encoding.decodePath(encodedPolyline);
    const routePolyline = new mapsLib.Polyline({
      path: decodedPath,
      geodesic: true,
      strokeColor: '#D9531E',
      strokeOpacity: 0.92,
      strokeWeight: 4.5,
      map,
    });

    return () => {
      routePolyline.setMap(null);
    };
  }, [map, mapsLib, geometryLib, encodedPolyline]);

  // Fit viewport to depot + geocoded customer stops
  useEffect(() => {
    if (!map || !coreLib) return;

    const allPoints: LatLngPoint[] = [];
    if (depotPoint) allPoints.push(depotPoint);
    for (const pt of stopPoints) {
      allPoints.push(pt);
    }

    if (allPoints.length === 0) return;

    if (allPoints.length === 1) {
      map.setCenter(allPoints[0]);
      map.setZoom(14);
      return;
    }

    const bounds = new coreLib.LatLngBounds();
    for (const pt of allPoints) {
      bounds.extend(pt);
    }
    map.fitBounds(bounds, 56);
  }, [map, coreLib, depotPoint, stopPoints]);

  return null;
};

export const DeliveryTrackingPanel: React.FC<DeliveryTrackingPanelProps> = ({
  invoices,
  members,
  settings,
  selectedInvoiceId,
  canLogisticsUpdate,
  onSelectInvoice,
  onSaveInvoice,
  onQuickStatus,
}) => {
  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const [isExpanded, setIsExpanded] = useState(true);
  const [scopeFilter, setScopeFilter] = useState<'pending' | 'all' | 'done'>(
    'all'
  );
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [returnToDepot, setReturnToDepot] = useState(true);

  const [depotInput, setDepotInput] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(DEPOT_STORAGE_KEY);
      if (saved && saved.trim()) return saved;
    } catch {
      // ignore storage failure
    }
    return settings.poster.location;
  });
  const [depotCoords, setDepotCoords] = useState<LatLngPoint | null>(null);
  const [depotLabel, setDepotLabel] = useState<string>(settings.poster.location);
  const [depotStatus, setDepotStatus] = useState<
    'idle' | 'loading' | 'resolved' | 'not_found' | 'error'
  >('idle');
  const [depotError, setDepotError] = useState<string | null>(null);

  const [geocodeCache, setGeocodeCache] = useState<
    Record<string, GeocodeCacheEntry>
  >({});

  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [editingAddressDraft, setEditingAddressDraft] = useState<string>('');

  const [optimizedRoute, setOptimizedRoute] =
    useState<OptimizedRouteState | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [activeInfoKey, setActiveInfoKey] = useState<string | null>(null);

  // All local-delivery invoices (non-cancelled)
  const allDeliveryInvoices = useMemo(
    () =>
      invoices.filter(
        (inv) =>
          inv.deliveryMode === 'livraison_locale' && inv.status !== 'annulee'
      ),
    [invoices]
  );

  const availableDrivers = useMemo(() => {
    const seen: Record<string, true> = {};
    const list: string[] = [];
    members
      .filter((m) => m.role === 'chauffeur' && m.active)
      .forEach((m) => {
        if (!seen[m.fullName]) {
          seen[m.fullName] = true;
          list.push(m.fullName);
        }
      });
    allDeliveryInvoices.forEach((inv) => {
      const name = inv.assignedDriverName?.trim();
      if (name && !seen[name]) {
        seen[name] = true;
        list.push(name);
      }
    });
    return list;
  }, [members, allDeliveryInvoices]);

  const filteredDeliveryInvoices = useMemo(() => {
    return allDeliveryInvoices.filter((inv) => {
      const isDone = inv.status === 'prete_livree' || inv.status === 'payee';
      if (scopeFilter === 'pending' && isDone) return false;
      if (scopeFilter === 'done' && !isDone) return false;
      if (
        driverFilter !== 'all' &&
        (inv.assignedDriverName?.trim() || '') !== driverFilter
      ) {
        return false;
      }
      return true;
    });
  }, [allDeliveryInvoices, scopeFilter, driverFilter]);

  const locateDepotByAddress = useCallback(async (address: string) => {
    const trimmed = address.trim();
    if (trimmed.length < 2) {
      setDepotStatus('not_found');
      setDepotError('Veuillez saisir une adresse ou ville de départ.');
      return;
    }

    setDepotStatus('loading');
    setDepotError(null);
    try {
      localStorage.setItem(DEPOT_STORAGE_KEY, trimmed);
    } catch {
      // ignore storage errors
    }

    try {
      const res = await geocodeAddress(trimmed);
      if (res.found && typeof res.lat === 'number' && typeof res.lng === 'number') {
        setDepotCoords({ lat: res.lat, lng: res.lng });
        setDepotLabel(res.formattedAddress || trimmed);
        setDepotStatus('resolved');
      } else {
        setDepotCoords(null);
        setDepotStatus('not_found');
        setDepotError(
          'Point de départ introuvable. Ajoutez la ville/commune (ex: Abidjan, Yopougon) ou utilisez le GPS.'
        );
      }
    } catch (err) {
      setDepotCoords(null);
      setDepotStatus('error');
      setDepotError(
        err instanceof Error ? err.message : 'Erreur de géocodage du dépôt.'
      );
    }
  }, []);

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      setDepotError('La géolocalisation GPS n’est pas supportée par ce navigateur.');
      return;
    }
    setDepotStatus('loading');
    setDepotError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setDepotCoords(coords);
        setDepotLabel('Position GPS actuelle (Départ chauffeur)');
        setDepotStatus('resolved');
        setOptimizedRoute(null);
      },
      () => {
        setDepotStatus('error');
        setDepotError(
          'Impossible d’obtenir la position GPS. Vérifiez les permissions du navigateur.'
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Auto-geocode depot once on expand if not yet resolved
  useEffect(() => {
    if (!isExpanded || !mapsApiKey) return;
    if (depotStatus === 'idle' && depotInput.trim().length >= 3) {
      void locateDepotByAddress(depotInput);
    }
  }, [isExpanded, mapsApiKey, depotStatus, depotInput, locateDepotByAddress]);

  // Auto-geocode customer addresses for visible local deliveries
  useEffect(() => {
    if (!isExpanded || !mapsApiKey) return;
    let cancelled = false;

    const pendingAddresses: string[] = [];
    const seenKeys: Record<string, true> = {};

    for (const inv of filteredDeliveryInvoices) {
      const raw = inv.customerAddress.trim();
      if (raw.length < 3) continue;
      const key = raw.toLowerCase();
      if (seenKeys[key] || geocodeCache[key]) continue;
      seenKeys[key] = true;
      pendingAddresses.push(raw);
    }

    if (pendingAddresses.length === 0) return;

    const runBatch = async () => {
      for (const addr of pendingAddresses) {
        if (cancelled) break;
        const key = addr.toLowerCase();
        setGeocodeCache((prev) => {
          if (prev[key]) return prev;
          return { ...prev, [key]: { status: 'loading' } };
        });
        try {
          const result = await geocodeAddress(addr);
          if (cancelled) break;
          if (
            result.found &&
            typeof result.lat === 'number' &&
            typeof result.lng === 'number'
          ) {
            setGeocodeCache((prev) => ({
              ...prev,
              [key]: {
                status: 'resolved',
                lat: result.lat,
                lng: result.lng,
                formattedAddress: result.formattedAddress || addr,
              },
            }));
          } else {
            setGeocodeCache((prev) => ({
              ...prev,
              [key]: { status: 'not_found' },
            }));
          }
        } catch (err) {
          if (cancelled) break;
          setGeocodeCache((prev) => ({
            ...prev,
            [key]: {
              status: 'error',
              errorMsg:
                err instanceof Error ? err.message : 'Erreur de géocodage',
            },
          }));
        }
      }
    };

    void runBatch();
    return () => {
      cancelled = true;
    };
  }, [isExpanded, mapsApiKey, filteredDeliveryInvoices, geocodeCache]);

  const resolvedStops = useMemo(() => {
    const result: Array<{
      invoice: Invoice;
      coords: LatLngPoint;
      formattedAddress: string;
    }> = [];
    for (const inv of filteredDeliveryInvoices) {
      const key = inv.customerAddress.trim().toLowerCase();
      const entry = geocodeCache[key];
      if (
        entry?.status === 'resolved' &&
        typeof entry.lat === 'number' &&
        typeof entry.lng === 'number'
      ) {
        result.push({
          invoice: inv,
          coords: { lat: entry.lat, lng: entry.lng },
          formattedAddress: entry.formattedAddress || inv.customerAddress,
        });
      }
    }
    return result;
  }, [filteredDeliveryInvoices, geocodeCache]);

  const selectedTourStops = useMemo(
    () =>
      resolvedStops.filter((s) => !excludedIds.includes(s.invoice.id)),
    [resolvedStops, excludedIds]
  );

  const stopPointsForCamera = useMemo(
    () => resolvedStops.map((s) => s.coords),
    [resolvedStops]
  );

  const toggleIncludeStop = (invoiceId: string) => {
    setOptimizedRoute(null);
    setExcludedIds((prev) =>
      prev.includes(invoiceId)
        ? prev.filter((id) => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const handleSaveInlineAddress = (inv: Invoice) => {
    const nextAddress = editingAddressDraft.trim();
    if (!nextAddress) return;
    onSaveInvoice(
      {
        ...inv,
        customerAddress: nextAddress,
        updatedAt: new Date().toISOString(),
      },
      false
    );
    setEditingAddressId(null);
    setEditingAddressDraft('');
    setOptimizedRoute(null);
  };

  const handleOptimizeTour = async () => {
    setRouteError(null);

    if (selectedTourStops.length === 0) {
      setRouteError(
        'Sélectionnez au moins un client dont l’adresse est géolocalisée.'
      );
      return;
    }

    const originPoint = depotCoords ?? selectedTourStops[0].coords;
    const usingDepotAsOrigin = Boolean(depotCoords);

    if (!usingDepotAsOrigin && selectedTourStops.length < 2) {
      setRouteError(
        'Localisez votre point de départ (dépôt ou GPS) ou sélectionnez au moins 2 livraisons pour tracer un itinéraire.'
      );
      return;
    }

    setIsOptimizing(true);
    try {
      if (usingDepotAsOrigin) {
        if (selectedTourStops.length === 1) {
          const singleStop = selectedTourStops[0];
          const dest = returnToDepot ? originPoint : singleStop.coords;
          const intermediates = returnToDepot ? [singleStop.coords] : [];
          const res = await optimizeDeliveryRoute({
            origin: originPoint,
            destination: dest,
            intermediates,
            optimizeWaypointOrder: false,
          });
          setOptimizedRoute({
            orderedInvoiceIds: [singleStop.invoice.id],
            distanceMeters: res.distanceMeters,
            durationSeconds: res.durationSeconds,
            encodedPolyline: res.encodedPolyline,
            legs: res.legs,
            depot: originPoint,
            returnToDepot,
          });
        } else if (returnToDepot) {
          const res = await optimizeDeliveryRoute({
            origin: originPoint,
            destination: originPoint,
            intermediates: selectedTourStops.map((s) => s.coords),
            optimizeWaypointOrder: true,
          });
          const orderIndices =
            res.optimizedIntermediateWaypointIndex.length ===
            selectedTourStops.length
              ? res.optimizedIntermediateWaypointIndex
              : selectedTourStops.map((_, idx) => idx);
          setOptimizedRoute({
            orderedInvoiceIds: orderIndices.map(
              (idx) => selectedTourStops[idx].invoice.id
            ),
            distanceMeters: res.distanceMeters,
            durationSeconds: res.durationSeconds,
            encodedPolyline: res.encodedPolyline,
            legs: res.legs,
            depot: originPoint,
            returnToDepot: true,
          });
        } else {
          // Optimize intermediates while finishing at the last stop selected
          const intermediateStops = selectedTourStops.slice(0, -1);
          const finalStop = selectedTourStops[selectedTourStops.length - 1];
          const res = await optimizeDeliveryRoute({
            origin: originPoint,
            destination: finalStop.coords,
            intermediates: intermediateStops.map((s) => s.coords),
            optimizeWaypointOrder: intermediateStops.length >= 2,
          });
          const orderIndices =
            res.optimizedIntermediateWaypointIndex.length ===
            intermediateStops.length
              ? res.optimizedIntermediateWaypointIndex
              : intermediateStops.map((_, idx) => idx);
          const orderedIds = [
            ...orderIndices.map((idx) => intermediateStops[idx].invoice.id),
            finalStop.invoice.id,
          ];
          setOptimizedRoute({
            orderedInvoiceIds: orderedIds,
            distanceMeters: res.distanceMeters,
            durationSeconds: res.durationSeconds,
            encodedPolyline: res.encodedPolyline,
            legs: res.legs,
            depot: originPoint,
            returnToDepot: false,
          });
        }
      } else {
        // Fallback if depot isn't resolved yet: route between first and last selected stop
        const firstStop = selectedTourStops[0];
        const lastStop = selectedTourStops[selectedTourStops.length - 1];
        const middleStops = selectedTourStops.slice(1, -1);
        const res = await optimizeDeliveryRoute({
          origin: firstStop.coords,
          destination: lastStop.coords,
          intermediates: middleStops.map((s) => s.coords),
          optimizeWaypointOrder: middleStops.length >= 2,
        });
        const orderIndices =
          res.optimizedIntermediateWaypointIndex.length === middleStops.length
            ? res.optimizedIntermediateWaypointIndex
            : middleStops.map((_, idx) => idx);
        const orderedIds = [
          firstStop.invoice.id,
          ...orderIndices.map((idx) => middleStops[idx].invoice.id),
          lastStop.invoice.id,
        ];
        setOptimizedRoute({
          orderedInvoiceIds: orderedIds,
          distanceMeters: res.distanceMeters,
          durationSeconds: res.durationSeconds,
          encodedPolyline: res.encodedPolyline,
          legs: res.legs,
          depot: firstStop.coords,
          returnToDepot: false,
        });
      }
    } catch (err) {
      setRouteError(
        err instanceof Error
          ? err.message
          : 'Impossible d’optimiser la tournée.'
      );
    } finally {
      setIsOptimizing(false);
    }
  };

  // Stop order lookup by invoice ID
  const stopOrderById = useMemo(() => {
    const lookup: Record<string, number> = {};
    if (!optimizedRoute) return lookup;
    optimizedRoute.orderedInvoiceIds.forEach((id, idx) => {
      lookup[id] = idx + 1;
    });
    return lookup;
  }, [optimizedRoute]);

  const orderedStopRows = useMemo(() => {
    if (!optimizedRoute) return [];
    const byId: Record<
      string,
      { invoice: Invoice; coords: LatLngPoint; formattedAddress: string }
    > = {};
    for (const s of resolvedStops) {
      byId[s.invoice.id] = s;
    }
    const rows: Array<{
      stopNumber: number;
      stop: {
        invoice: Invoice;
        coords: LatLngPoint;
        formattedAddress: string;
      };
      leg?: RouteLegSummary;
    }> = [];
    optimizedRoute.orderedInvoiceIds.forEach((id, idx) => {
      const stop = byId[id];
      if (!stop) return;
      rows.push({
        stopNumber: idx + 1,
        stop,
        leg: optimizedRoute.legs[idx],
      });
    });
    return rows;
  }, [optimizedRoute, resolvedStops]);

  const googleMapsNavUrl = useMemo(() => {
    if (!optimizedRoute || orderedStopRows.length === 0) return null;
    const originStr = `${optimizedRoute.depot.lat},${optimizedRoute.depot.lng}`;
    const stopCoordsList = orderedStopRows.map(
      (r) => `${r.stop.coords.lat},${r.stop.coords.lng}`
    );
    const destStr = optimizedRoute.returnToDepot
      ? originStr
      : stopCoordsList[stopCoordsList.length - 1];
    const waypointsList = optimizedRoute.returnToDepot
      ? stopCoordsList
      : stopCoordsList.slice(0, -1);
    const params = new URLSearchParams({
      api: '1',
      origin: originStr,
      destination: destStr,
      travelmode: 'driving',
    });
    if (waypointsList.length > 0) {
      params.set('waypoints', waypointsList.join('|'));
    }
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }, [optimizedRoute, orderedStopRows]);

  const pendingCount = allDeliveryInvoices.filter(
    (inv) => inv.status === 'en_attente' || inv.status === 'en_preparation'
  ).length;

  return (
    <section
      aria-label="Suivi de livraison"
      className="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
    >
      {/* Header Bar */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0F2342] text-white flex items-center justify-center shrink-0">
            <Truck className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                Suivi de livraison
              </h2>
              <span className="px-2 py-0.5 text-[11px] font-mono-tabular font-semibold rounded bg-[#D9531E]/10 text-[#D9531E]">
                {allDeliveryInvoices.length} livraison
                {allDeliveryInvoices.length > 1 ? 's' : ''} ({pendingCount} à livrer)
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visualisation des adresses clients sur Google Maps et optimisation d’itinéraire pour les chauffeurs
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Masquer la carte
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Afficher la carte
            </>
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="p-5 space-y-5">
          {/* Controls: Depot origin + Scope & Driver filters */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <div className="lg:col-span-6 space-y-1.5">
              <label
                htmlFor="depot-origin-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Point de départ chauffeur (Dépôt GIS)
              </label>
              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                <input
                  id="depot-origin-input"
                  type="text"
                  value={depotInput}
                  onChange={(e) => setDepotInput(e.target.value)}
                  placeholder="Ex: Yamoussoukro Gare TSR / Abidjan Yopougon..."
                  className="flex-1 min-w-0 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => void locateDepotByAddress(depotInput)}
                  disabled={depotStatus === 'loading'}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#0F2342] hover:bg-[#1A355E] text-white rounded-lg disabled:opacity-60 cursor-pointer shrink-0"
                >
                  {depotStatus === 'loading' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <MapPin className="w-3.5 h-3.5" />
                  )}
                  Localiser
                </button>
                <button
                  type="button"
                  onClick={handleUseCurrentGps}
                  title="Utiliser ma position GPS actuelle"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer shrink-0"
                >
                  <Compass className="w-3.5 h-3.5 text-[#D9531E]" />
                  GPS
                </button>
              </div>
              {depotStatus === 'resolved' && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Départ repéré : {depotLabel}</span>
                </p>
              )}
              {depotError && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  {depotError}
                </p>
              )}
            </div>

            <div className="lg:col-span-3 space-y-1.5">
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                Statut des livraisons
              </span>
              <div className="flex items-center gap-1 p-1 bg-slate-200/75 dark:bg-slate-800 rounded-lg">
                {(
                  [
                    { id: 'all', label: 'Toutes' },
                    { id: 'pending', label: 'À livrer' },
                    { id: 'done', label: 'Livrées' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setScopeFilter(item.id);
                      setOptimizedRoute(null);
                    }}
                    className={`flex-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      scopeFilter === item.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 space-y-1.5">
              <label
                htmlFor="driver-filter-select"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Chauffeur assigné
              </label>
              <select
                id="driver-filter-select"
                value={driverFilter}
                onChange={(e) => {
                  setDriverFilter(e.target.value);
                  setOptimizedRoute(null);
                }}
                className="w-full px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="all">Tous les chauffeurs</option>
                {availableDrivers.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Main Split: Stop List + Route Optimizer (left) & Interactive Map (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Customer Delivery Queue & Optimization */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={returnToDepot}
                    onChange={(e) => {
                      setReturnToDepot(e.target.checked);
                      setOptimizedRoute(null);
                    }}
                    className="rounded border-slate-300 text-[#D9531E]"
                  />
                  Boucle retour au dépôt
                </label>

                <button
                  type="button"
                  onClick={() => void handleOptimizeTour()}
                  disabled={isOptimizing || selectedTourStops.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#D9531E] hover:bg-[#B84315] rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isOptimizing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RouteIcon className="w-3.5 h-3.5" />
                  )}
                  Optimiser le trajet ({selectedTourStops.length})
                </button>
              </div>

              {routeError && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300">
                  {routeError}
                </div>
              )}

              {/* Optimized Summary Card */}
              {optimizedRoute && (
                <div className="p-4 rounded-xl bg-[#0F2342] text-white space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">
                        Tournée chauffeur optimisée
                      </p>
                      <p className="font-display font-bold text-lg font-mono-tabular mt-0.5">
                        {formatDistanceMeters(optimizedRoute.distanceMeters)} ·{' '}
                        {formatDurationSeconds(optimizedRoute.durationSeconds)}
                      </p>
                    </div>
                    {googleMapsNavUrl && (
                      <a
                        href={googleMapsNavUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#D9531E] hover:bg-[#B84315] text-white rounded-lg shrink-0"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        GPS Maps
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {orderedStopRows.length > 0 && (
                    <ol className="space-y-1.5 pt-2 border-t border-white/15 text-xs">
                      {orderedStopRows.map(({ stopNumber, stop, leg }) => (
                        <li
                          key={stop.invoice.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onSelectInvoice(stop.invoice.id);
                              setActiveInfoKey(`stop-${stop.invoice.id}`);
                            }}
                            className="text-left hover:underline truncate cursor-pointer"
                          >
                            <span className="font-mono-tabular font-bold text-[#FDBA74] mr-1.5">
                              #{stopNumber}
                            </span>
                            {stop.invoice.customerName}
                          </button>
                          {leg && (
                            <span className="font-mono-tabular text-[11px] text-slate-300 shrink-0">
                              {formatDistanceMeters(leg.distanceMeters)} ·{' '}
                              {formatDurationSeconds(leg.durationSeconds)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}

              {/* Delivery List */}
              {filteredDeliveryInvoices.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 dark:text-slate-400">
                  Aucune facture en « Livraison locale » pour ces filtres.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {filteredDeliveryInvoices.map((inv) => {
                    const addrKey = inv.customerAddress.trim().toLowerCase();
                    const geo = addrKey ? geocodeCache[addrKey] : undefined;
                    const isResolved = geo?.status === 'resolved';
                    const isIncluded = !excludedIds.includes(inv.id);
                    const stopNum = stopOrderById[inv.id] ?? null;
                    const isSelected = selectedInvoiceId === inv.id;
                    const isEditing = editingAddressId === inv.id;

                    return (
                      <div
                        key={inv.id}
                        className={`p-3 rounded-xl border transition-colors ${
                          isSelected
                            ? 'border-[#0F2342] dark:border-[#D9531E] bg-slate-50 dark:bg-slate-800/70'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={isIncluded && isResolved}
                            disabled={!isResolved}
                            onChange={() => toggleIncludeStop(inv.id)}
                            aria-label={`Inclure ${inv.code} dans la tournée`}
                            className="mt-1 rounded border-slate-300 text-[#D9531E] cursor-pointer disabled:opacity-40"
                          />

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectInvoice(inv.id);
                                  if (isResolved) {
                                    setActiveInfoKey(`stop-${inv.id}`);
                                  }
                                }}
                                className="text-left flex items-center gap-1.5 min-w-0 cursor-pointer"
                              >
                                {stopNum !== null && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-mono-tabular font-bold rounded bg-[#D9531E] text-white shrink-0">
                                    #{stopNum}
                                  </span>
                                )}
                                <span className="font-mono-tabular font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {inv.code}
                                </span>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                                  · {inv.customerName}
                                </span>
                              </button>

                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                                {getInvoiceStatusLabel(inv.status)}
                              </span>
                            </div>

                            {isEditing ? (
                              <div className="flex gap-1.5 pt-1">
                                <input
                                  type="text"
                                  value={editingAddressDraft}
                                  onChange={(e) =>
                                    setEditingAddressDraft(e.target.value)
                                  }
                                  placeholder="Ex: Quartier Habitat, Yamoussoukro..."
                                  className="flex-1 min-w-0 px-2.5 py-1 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveInlineAddress(inv)}
                                  className="px-2.5 py-1 text-xs font-semibold bg-[#0F2342] text-white rounded-md cursor-pointer"
                                >
                                  OK
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingAddressId(null)}
                                  className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                                >
                                  Annuler
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                                  {inv.customerAddress || 'Adresse manquante'}
                                </p>
                                {canLogisticsUpdate && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingAddressId(inv.id);
                                      setEditingAddressDraft(inv.customerAddress);
                                    }}
                                    title="Préciser l'adresse client"
                                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer shrink-0"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                              {geo?.status === 'loading' && (
                                <span className="text-slate-500 inline-flex items-center gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Géolocalisation...
                                </span>
                              )}
                              {isResolved && (
                                <span className="text-emerald-700 dark:text-emerald-400 truncate max-w-[230px]">
                                  GPS OK · {geo.formattedAddress}
                                </span>
                              )}
                              {(geo?.status === 'not_found' ||
                                !inv.customerAddress.trim()) && (
                                <span className="text-amber-700 dark:text-amber-400">
                                  Adresse à préciser (ajoutez ville / quartier)
                                </span>
                              )}
                              {geo?.status === 'error' && (
                                <span className="text-red-600 dark:text-red-400">
                                  {geo.errorMsg || 'Erreur géocodage'}
                                </span>
                              )}

                              {inv.assignedDriverName && (
                                <span className="text-slate-500 dark:text-slate-400">
                                  {inv.assignedDriverName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Embedded Google Map */}
            <div className="lg:col-span-7 space-y-2">
              {!mapsApiKey ? (
                <div className="h-[460px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-center text-xs text-slate-500">
                  Clé Google Maps Platform manquante dans la configuration de l’environnement.
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
                  <APIProvider
                    apiKey={mapsApiKey}
                    language="fr"
                    region="CI"
                    libraries={['marker', 'geometry']}
                  >
                    <GoogleMap
                      mapId="DEMO_MAP_ID"
                      defaultCenter={{ lat: 0, lng: 0 }}
                      defaultZoom={2}
                      gestureHandling="greedy"
                      internalUsageAttributionIds={[
                        'gmp_mcp_codeassist_v1_aistudio',
                      ]}
                      style={{ width: '100%', height: '460px' }}
                    >
                      <MapEffectsLayer
                        depotPoint={depotCoords}
                        stopPoints={stopPointsForCamera}
                        encodedPolyline={optimizedRoute?.encodedPolyline ?? ''}
                      />

                      {depotCoords && (
                        <DepotMarker
                          position={depotCoords}
                          label={depotLabel}
                          isOpen={activeInfoKey === 'depot'}
                          onOpen={() => setActiveInfoKey('depot')}
                          onClose={() => setActiveInfoKey(null)}
                        />
                      )}

                      {resolvedStops.map((stop) => {
                        const stopNum = stopOrderById[stop.invoice.id] ?? null;
                        const legSummary =
                          stopNum !== null && optimizedRoute
                            ? optimizedRoute.legs[stopNum - 1]
                            : undefined;

                        return (
                          <DeliveryStopMarker
                            key={stop.invoice.id}
                            invoice={stop.invoice}
                            position={stop.coords}
                            formattedAddress={stop.formattedAddress}
                            stopNumber={stopNum}
                            legSummary={legSummary}
                            isSelected={selectedInvoiceId === stop.invoice.id}
                            isInfoOpen={
                              activeInfoKey === `stop-${stop.invoice.id}`
                            }
                            canLogisticsUpdate={canLogisticsUpdate}
                            currencyLabel={settings.currencyLabel}
                            onOpen={() => {
                              setActiveInfoKey(`stop-${stop.invoice.id}`);
                              onSelectInvoice(stop.invoice.id);
                            }}
                            onClose={() => setActiveInfoKey(null)}
                            onFocusInvoice={() => {
                              onSelectInvoice(stop.invoice.id);
                            }}
                            onMarkDelivered={() => {
                              onQuickStatus(stop.invoice, 'prete_livree');
                            }}
                          />
                        );
                      })}
                    </GoogleMap>
                  </APIProvider>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400 px-1">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0F2342] inline-block" />
                    Dépôt (D)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D9531E] inline-block" />
                    Arrêt tournée optimisée
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0369A1] inline-block" />
                    Livraison en attente
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#059669] inline-block" />
                    Livrée / Payée
                  </span>
                </div>
                <span>Cliquez sur un repère pour voir les détails du client</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
