export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface GeocodeResultPayload {
  found: boolean;
  lat?: number;
  lng?: number;
  formattedAddress?: string;
  placeId?: string;
  status: string;
}

export interface RouteLegSummary {
  distanceMeters: number;
  durationSeconds: number;
}

export interface OptimizeRoutePayload {
  found: boolean;
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline: string;
  viewport: {
    low?: { latitude?: number; longitude?: number };
    high?: { latitude?: number; longitude?: number };
  } | null;
  optimizedIntermediateWaypointIndex: number[];
  legs: RouteLegSummary[];
}

function triggerQuotaBannerIfNeeded(
  status: number,
  payload?: { quotaExceeded?: boolean; error?: { status?: string } | string }
) {
  const isQuotaError =
    status === 429 ||
    payload?.quotaExceeded === true ||
    (typeof payload?.error === 'object' &&
      payload.error?.status === 'RESOURCE_EXHAUSTED');
  if (isQuotaError && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
}

export async function geocodeAddress(
  address: string
): Promise<GeocodeResultPayload> {
  const res = await fetch('/api/maps/geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });

  const payload = (await res.json().catch(() => ({}))) as GeocodeResultPayload & {
    error?: string | { status?: string };
    quotaExceeded?: boolean;
  };

  triggerQuotaBannerIfNeeded(res.status, payload);

  if (!res.ok) {
    const errText =
      typeof payload.error === 'string'
        ? payload.error
        : `Erreur géocodage (${res.status})`;
    throw new Error(errText);
  }

  return payload;
}

export async function optimizeDeliveryRoute(params: {
  origin: LatLngPoint;
  destination: LatLngPoint;
  intermediates: LatLngPoint[];
  optimizeWaypointOrder?: boolean;
}): Promise<OptimizeRoutePayload> {
  const res = await fetch('/api/maps/optimize-route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const payload = (await res.json().catch(() => ({}))) as OptimizeRoutePayload & {
    error?: string | { status?: string };
    quotaExceeded?: boolean;
  };

  triggerQuotaBannerIfNeeded(res.status, payload);

  if (!res.ok) {
    const errText =
      typeof payload.error === 'string'
        ? payload.error
        : `Erreur calcul d’itinéraire (${res.status})`;
    throw new Error(errText);
  }

  return payload;
}
