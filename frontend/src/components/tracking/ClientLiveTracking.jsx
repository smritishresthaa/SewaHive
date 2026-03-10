import { useEffect, useRef, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import {
  HiSignal,
  HiSignalSlash,
  HiTruck,
} from "react-icons/hi2";
import { fetchDrivingRoute } from "../../utils/directions";

/* ────────────────────────────────────────────
   Custom Leaflet Markers
   ──────────────────────────────────────────── */

const CLIENT_ICON = new L.DivIcon({
  className: "",
  html: `<div style="
    width:36px;height:36px;border-radius:50%;
    background:linear-gradient(135deg,#3b82f6,#1d4ed8);
    border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);
    display:flex;align-items:center;justify-content:center;
  "><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

const PROVIDER_ICON = new L.DivIcon({
  className: "",
  html: `<div style="
    width:42px;height:42px;border-radius:50%;
    background:linear-gradient(135deg,#10b981,#047857);
    border:3px solid #fff;box-shadow:0 3px 12px rgba(0,0,0,.35);
    display:flex;align-items:center;justify-content:center;
    animation: pulse-ring 2s ease-out infinite;
  "><svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg></div>`,
  iconSize: [42, 42],
  iconAnchor: [21, 42],
  popupAnchor: [0, -42],
});

/* ────────────────────────────────────────────
   Smooth marker animation (lerp)
   ──────────────────────────────────────────── */

function AnimatedProviderMarker({ position }) {
  const markerRef = useRef(null);
  const animFrameRef = useRef(null);
  const targetRef = useRef(position);

  useEffect(() => {
    targetRef.current = position;
    if (!markerRef.current) return;

    const marker = markerRef.current;
    const startPos = marker.getLatLng();
    const endPos = L.latLng(position);
    const startTime = performance.now();
    const duration = 1500; // 1.5s smooth transition

    function animate(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3);
      const lat = startPos.lat + (endPos.lat - startPos.lat) * ease;
      const lng = startPos.lng + (endPos.lng - startPos.lng) * ease;
      marker.setLatLng([lat, lng]);

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    }

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [position]);

  return (
    <Marker ref={markerRef} position={position} icon={PROVIDER_ICON}>
      <Popup>
        <p className="font-semibold text-sm text-center">Your Provider</p>
      </Popup>
    </Marker>
  );
}

/* ────────────────────────────────────────────
   Auto-pan to provider
   ──────────────────────────────────────────── */

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    // Invalidate immediately and after a delay to cover layout settling
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 400);

    // Also watch for container resizes
    const container = map.getContainer();
    let ro;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(container);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (ro) ro.disconnect();
    };
  }, [map]);
  return null;
}

function AutoPan({ providerPos, clientPos, autoPan }) {
  const map = useMap();
  const fittedOnce = useRef(false);

  useEffect(() => {
    if (!providerPos || !clientPos) return;

    if (!fittedOnce.current) {
      // First time: fit both markers
      const bounds = L.latLngBounds([providerPos, clientPos]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      fittedOnce.current = true;
    } else if (autoPan) {
      // Subsequent: smoothly pan to keep provider in view
      const bounds = L.latLngBounds([providerPos, clientPos]);
      if (!map.getBounds().contains(providerPos)) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
      }
    }
  }, [providerPos, clientPos, map, autoPan]);

  return null;
}

/* ────────────────────────────────────────────
   Distance / ETA helpers
   ──────────────────────────────────────────── */

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function estimateETA(km, speedKmh) {
  const s = speedKmh && speedKmh > 2 ? speedKmh : 25;
  const minutes = (km / s) * 60;
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `~${Math.round(minutes)} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `~${hrs}h ${mins}m`;
}

/* ────────────────────────────────────────────
   Main Component
   ──────────────────────────────────────────── */

export default function ClientLiveTracking({ booking, providerPos, lastUpdate, isConnected }) {
  // Client location from booking (GeoJSON: [lng, lat])
  const clientLat = booking?.location?.coordinates?.[1];
  const clientLng = booking?.location?.coordinates?.[0];

  const [autoPan, setAutoPan] = useState(true);
  const [routePath, setRoutePath] = useState([]);
  const lastRouteFetchRef = useRef(0);

  /* ── Computed ── */
  const hasClientLocation = clientLat != null && clientLng != null;
  const hasProviderLocation = providerPos?.lat != null && providerPos?.lng != null;

  const distance = useMemo(() => {
    if (!hasClientLocation || !hasProviderLocation) return null;
    return haversineKm(providerPos.lat, providerPos.lng, clientLat, clientLng);
  }, [providerPos?.lat, providerPos?.lng, clientLat, clientLng, hasClientLocation, hasProviderLocation]);

  const isStale = lastUpdate && Date.now() - new Date(lastUpdate).getTime() > 30000; // 30s

  const providerName =
    booking?.providerId?.profile?.name ||
    booking?.providerId?.email ||
    "Provider";

  useEffect(() => {
    if (!hasClientLocation || !hasProviderLocation || booking?.status !== "provider_en_route") {
      setRoutePath([]);
      return;
    }

    const now = Date.now();
    if (now - lastRouteFetchRef.current < 12000) return;
    lastRouteFetchRef.current = now;

    const controller = new AbortController();

    fetchDrivingRoute({
      fromLat: providerPos.lat,
      fromLng: providerPos.lng,
      toLat: clientLat,
      toLng: clientLng,
      signal: controller.signal,
    })
      .then((route) => {
        if (route?.path?.length > 1) {
          setRoutePath(route.path);
        }
      })
      .catch(() => {
        // keep previous route when API fails
      });

    return () => controller.abort();
  }, [
    booking?.status,
    hasClientLocation,
    hasProviderLocation,
    providerPos?.lat,
    providerPos?.lng,
    clientLat,
    clientLng,
  ]);

  // Only show when en route
  if (booking?.status !== "provider_en_route") return null;
  if (!hasClientLocation) return null;

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-4">
      {/* ── Banner ── */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <HiTruck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">
                {providerName} is on the way!
              </h3>
              <p className="text-emerald-100 text-xs mt-0.5">
                {hasProviderLocation && distance != null
                  ? `${formatDistance(distance)} away · ETA: ${estimateETA(distance, providerPos?.speed)}`
                  : "Tracking live location…"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isConnected ? (
              <HiSignal className="h-4 w-4 text-white" title="Connected" />
            ) : (
              <HiSignalSlash className="h-4 w-4 text-white/60" title="Reconnecting…" />
            )}
            {isStale && (
              <span className="text-[10px] bg-white/20 rounded-full px-2 py-0.5 text-white">
                Last update {Math.round((Date.now() - new Date(lastUpdate).getTime()) / 1000)}s ago
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Map ── */}
      <div className="relative" style={{ height: 320 }}>
        <MapContainer
          center={[clientLat, clientLng]}
          zoom={14}
          scrollWheelZoom={false}
          dragging={true}
          touchZoom={true}
          doubleClickZoom={true}
          style={{ height: "100%", width: "100%" }}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          />

          {/* Client marker (your location) */}
          <Marker position={[clientLat, clientLng]} icon={CLIENT_ICON}>
            <Popup>
              <p className="font-semibold text-sm text-center">Your Location</p>
            </Popup>
          </Marker>

          {/* Provider marker (animated) */}
          {hasProviderLocation && (
            <AnimatedProviderMarker
              position={[providerPos.lat, providerPos.lng]}
            />
          )}

          {/* Directions route polyline */}
          {routePath.length > 1 && (
            <Polyline
              positions={routePath}
              pathOptions={{ color: "#0ea5e9", weight: 5, opacity: 0.9 }}
            />
          )}

          {/* Fix tile sizing after mount */}
          <InvalidateSize />

          {/* Auto-pan */}
          {hasProviderLocation && (
            <AutoPan
              providerPos={[providerPos.lat, providerPos.lng]}
              clientPos={[clientLat, clientLng]}
              autoPan={autoPan}
            />
          )}
        </MapContainer>

        {/* Auto-pan toggle */}
        <button
          onClick={() => setAutoPan((prev) => !prev)}
          className={`absolute bottom-3 right-3 z-[1000] rounded-lg px-3 py-1.5 text-xs font-medium shadow-md border transition
            ${autoPan
              ? "bg-emerald-600 text-white border-emerald-700"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
          title={autoPan ? "Auto-follow is on" : "Auto-follow is off"}
        >
          {autoPan ? "📍 Following" : "📍 Follow"}
        </button>
      </div>

      {/* ── No GPS fallback ── */}
      {!hasProviderLocation && (
        <div className="px-5 py-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-lg bg-gray-50 border px-4 py-2.5">
            <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <p className="text-sm text-gray-600">
              Waiting for provider's live location…
            </p>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            The provider may not have shared their location yet
          </p>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="border-t px-5 py-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ background: "linear-gradient(135deg,#3b82f6,#1d4ed8)" }} />
          Your location
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ background: "linear-gradient(135deg,#10b981,#047857)" }} />
          Provider
        </span>
        {distance != null && (
          <span className="ml-auto font-medium text-gray-700">
            {formatDistance(distance)}
          </span>
        )}
      </div>
    </div>
  );
}
