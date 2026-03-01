import { useEffect, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import {
  HiMapPin,
  HiArrowTrendingUp,
  HiSignal,
  HiExclamationTriangle,
  HiXMark,
} from "react-icons/hi2";
import { connectChatSocket, releaseChatSocket } from "../../utils/chatSocket";
import api from "../../utils/axios";
import toast from "react-hot-toast";

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
    width:40px;height:40px;border-radius:50%;
    background:linear-gradient(135deg,#10b981,#047857);
    border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);
    display:flex;align-items:center;justify-content:center;
  "><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

/* ────────────────────────────────────────────
   Map auto-fit helper
   ──────────────────────────────────────────── */

function FitBounds({ providerPos, clientPos }) {
  const map = useMap();
  useEffect(() => {
    if (!providerPos || !clientPos) return;
    const bounds = L.latLngBounds([providerPos, clientPos]);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  }, [providerPos, clientPos, map]);
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 400);
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

/* ────────────────────────────────────────────
   Distance helper (Haversine)
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
  // If we have speed data, use it; otherwise assume 25 km/h (city driving)
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

export default function ProviderNavigationPanel({ booking, onStatusChange }) {
  // Client location from booking (GeoJSON: [lng, lat])
  const clientLat = booking?.location?.coordinates?.[1];
  const clientLng = booking?.location?.coordinates?.[0];

  const [providerPos, setProviderPos] = useState(null); // { lat, lng }
  const [gpsError, setGpsError] = useState("");
  const [gpsPermission, setGpsPermission] = useState("prompt"); // prompt | granted | denied
  const [isEnRoute, setIsEnRoute] = useState(booking?.status === "provider_en_route");
  const [markingEnRoute, setMarkingEnRoute] = useState(false);

  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastEmitRef = useRef(0);
  const isEnRouteRef = useRef(isEnRoute);

  const GPS_EMIT_INTERVAL = 5000; // Emit every 5 seconds

  /* ── Start GPS watch ── */
  const startGpsWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading, speed } = position.coords;
        setProviderPos({ lat: latitude, lng: longitude });
        setGpsError("");
        setGpsPermission("granted");

        // Throttled socket emit — only when en route
        const now = Date.now();
        if (isEnRouteRef.current && now - lastEmitRef.current >= GPS_EMIT_INTERVAL && socketRef.current?.connected) {
          lastEmitRef.current = now;
          socketRef.current.emit("provider_location_update", {
            bookingId: booking._id,
            lat: latitude,
            lng: longitude,
            heading: heading || null,
            speed: speed != null ? (speed * 3.6) : null, // m/s → km/h
          });
        }
      },
      (error) => {
        if (error.code === 1) {
          setGpsPermission("denied");
          setGpsError("Location access denied. Please enable GPS in your browser settings.");
        } else if (error.code === 2) {
          setGpsError("GPS signal unavailable. Move to a better location.");
        } else {
          setGpsError("Unable to retrieve your location.");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      }
    );
  }, [booking?._id]);

  /* ── Stop GPS watch ── */
  const stopGpsWatch = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  /* ── Socket connection ── */
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token || !booking?._id) return;

    const socket = connectChatSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_tracking", { bookingId: booking._id });
    });

    // Handle already-connected socket
    if (socket.connected) {
      socket.emit("join_tracking", { bookingId: booking._id });
    }

    return () => {
      socket.off("connect");
      releaseChatSocket();
      socketRef.current = null;
    };
  }, [booking?._id]);

  /* ── GPS lifecycle ── */
  useEffect(() => {
    startGpsWatch();
    return () => stopGpsWatch();
  }, [startGpsWatch, stopGpsWatch]);

  /* ── Sync isEnRoute when booking prop changes ── */
  useEffect(() => {
    setIsEnRoute(booking?.status === "provider_en_route");
    isEnRouteRef.current = booking?.status === "provider_en_route";
  }, [booking?.status]);

  /* ── Mark as en route ── */
  async function handleMarkEnRoute() {
    try {
      setMarkingEnRoute(true);
      await api.patch(`/bookings/${booking._id}/en-route`);
      setIsEnRoute(true);
      isEnRouteRef.current = true;
      toast.success("You're marked as On The Way!");
      onStatusChange?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to mark en route");
    } finally {
      setMarkingEnRoute(false);
    }
  }

  /* ── Open Google Maps ── */
  function openGoogleMapsNavigation() {
    if (clientLat == null || clientLng == null) {
      toast.error("Client location not available");
      return;
    }
    // Deep links: works on both Android and iOS, opens the native app if installed
    const url = `https://www.google.com/maps/dir/?api=1&destination=${clientLat},${clientLng}&travelmode=driving`;
    window.open(url, "_blank");
  }

  /* ── Computed values ── */
  const hasClientLocation = clientLat != null && clientLng != null;
  const hasProviderLocation = providerPos != null;

  const distance =
    hasClientLocation && hasProviderLocation
      ? haversineKm(providerPos.lat, providerPos.lng, clientLat, clientLng)
      : null;

  const clientAddress =
    booking?.landmark ||
    booking?.addressText ||
    [booking?.address?.area, booking?.address?.city].filter(Boolean).join(", ") ||
    "Client location";

  const clientName =
    booking?.clientId?.profile?.name ||
    booking?.clientId?.email ||
    "Client";

  const showPanel = ["confirmed", "accepted", "provider_en_route"].includes(booking?.status);
  if (!showPanel) return null;

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-4">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <HiMapPin className="text-emerald-600" />
              {isEnRoute ? "Navigating to Client" : "Client Location"}
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">{clientName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{clientAddress}</p>
          </div>
          {distance != null && (
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold text-emerald-700">{formatDistance(distance)}</p>
              <p className="text-xs text-gray-500">
                ETA: {estimateETA(distance, providerPos?.speed || null)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── GPS Permission Warning ── */}
      {gpsPermission === "denied" && (
        <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 flex items-start gap-2">
          <HiExclamationTriangle className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Location Access Denied</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Enable location in your browser settings to share your live position with the client.
              You can still use Google Maps navigation below.
            </p>
          </div>
        </div>
      )}

      {gpsError && gpsPermission !== "denied" && (
        <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {gpsError}
        </div>
      )}

      {/* ── Map ── */}
      {hasClientLocation && (
        <div className="mx-4 mt-3 rounded-xl overflow-hidden border" style={{ height: 280 }}>
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

            {/* Client marker (fixed) */}
            <Marker position={[clientLat, clientLng]} icon={CLIENT_ICON}>
              <Popup>
                <div className="text-center">
                  <p className="font-semibold text-sm">{clientName}</p>
                  <p className="text-xs text-gray-500">{clientAddress}</p>
                </div>
              </Popup>
            </Marker>

            {/* Provider marker (live GPS) */}
            {hasProviderLocation && (
              <Marker position={[providerPos.lat, providerPos.lng]} icon={PROVIDER_ICON}>
                <Popup>
                  <p className="font-semibold text-sm text-center">You (Provider)</p>
                </Popup>
              </Marker>
            )}

            {/* Fix tile sizing after mount */}
            <InvalidateSize />

            {/* Auto-fit bounds when both markers are visible */}
            {hasProviderLocation && (
              <FitBounds
                providerPos={[providerPos.lat, providerPos.lng]}
                clientPos={[clientLat, clientLng]}
              />
            )}
          </MapContainer>
        </div>
      )}

      {/* ── Status indicators ── */}
      {isEnRoute && (
        <div className="mx-4 mt-3 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-sm font-medium text-emerald-800">
            Broadcasting your location to client
          </span>
          {hasProviderLocation && (
            <HiSignal className="text-emerald-600 ml-auto" title="GPS active" />
          )}
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="p-4 space-y-3">
        {/* Mark En Route button */}
        {!isEnRoute && (
          <button
            onClick={handleMarkEnRoute}
            disabled={markingEnRoute}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3.5 text-white font-semibold text-sm
              hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md hover:shadow-lg
              disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <HiArrowTrendingUp className="h-5 w-5" />
            {markingEnRoute ? "Updating…" : "I'm On The Way"}
          </button>
        )}

        {/* Google Maps Navigate button — always visible */}
        {hasClientLocation && (
          <button
            onClick={openGoogleMapsNavigation}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-white font-semibold text-sm
              hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg
              flex items-center justify-center gap-2"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            Start Turn-by-Turn Navigation
          </button>
        )}
      </div>
    </div>
  );
}
