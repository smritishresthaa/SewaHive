// components/UI/LocationPicker.jsx
import React, { useState, useEffect, useRef } from "react";
import { HiMapPin, HiCheckCircle } from "react-icons/hi2";
import toast from "react-hot-toast";

/**
 * LocationPicker Component (InDrive Style)
 * Allows users to choose between:
 * 1. Use current GPS location
 * 2. Enter a different address manually
 */
export default function LocationPicker({
  initialCoords,
  initialAddress,
  initialLandmark,
  onLocationChange,
  label = "Service Location",
}) {
  // Location Mode: 'current' or 'manual'
  const [locationMode, setLocationMode] = useState("manual");
  
  const [coords, setCoords] = useState(initialCoords || [85.3240, 27.7172]);
  const [addressText, setAddressText] = useState(initialAddress || "");
  const [landmark, setLandmark] = useState(initialLandmark || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [currentLocationDetected, setCurrentLocationDetected] = useState(false);
  const searchTimeout = useRef(null);

  // Notify parent whenever location changes
  useEffect(() => {
    if (onLocationChange) {
      onLocationChange({
        coordinates: coords,
        addressText,
        landmark,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords, addressText, landmark]);

  // Search locations using OpenStreetMap Nominatim API
  async function handleSearchLocation(query) {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          new URLSearchParams({
            q: query,
            countrycodes: "np",
            format: "json",
            limit: 8,
          })
      );

      const results = await response.json();
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search locations");
    } finally {
      setIsSearching(false);
    }
  }

  function handleSearchChange(e) {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      handleSearchLocation(query);
    }, 500);
  }

  function handleSelectLocation(result) {
    const newCoords = [parseFloat(result.lon), parseFloat(result.lat)];
    setCoords(newCoords);
    setAddressText(result.display_name);
    setSearchQuery(getShortAddress(result.display_name));
    setSearchResults([]);
    toast.success("Location selected! ✅");
  }

  function handleGetCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported on this device");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords([longitude, latitude]);
        reverseGeocode(latitude, longitude);
        setGettingLocation(false);
        setCurrentLocationDetected(true);
        toast.success("Current location detected! 📍");
      },
      (error) => {
        setGettingLocation(false);
        setCurrentLocationDetected(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error("Location permission denied. Please enable in browser settings.");
        } else {
          toast.error("Unable to get location. Try entering address manually.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  function handleModeChange(mode) {
    setLocationMode(mode);
    if (mode === "current") {
      // Auto-detect location when switching to current mode
      handleGetCurrentLocation();
    } else {
      // Clear current location flag when switching to manual
      setCurrentLocationDetected(false);
    }
  }

  async function reverseGeocode(lat, lng) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
          new URLSearchParams({
            format: "json",
            lat: lat,
            lon: lng,
          })
      );

      const result = await response.json();
      if (result.display_name) {
        setAddressText(result.display_name);
        if (locationMode === "manual") {
          setSearchQuery(getShortAddress(result.display_name));
        }
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
    }
  }

  function getShortAddress(fullAddress) {
    if (!fullAddress) return "";
    const parts = fullAddress.split(",").map((part) => part.trim()).filter(Boolean);
    return parts.slice(0, 2).join(", ");
  }

  return (
    <div className="space-y-4">
      {/* Mode Selection */}
      <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Service Location
        </label>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => handleModeChange("current")}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-semibold transition-all ${
              locationMode === "current"
                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                : "border-gray-300 bg-white text-gray-700 hover:border-emerald-400"
            }`}
          >
            <span>📍</span>
            <span>Use Current Location</span>
            {locationMode === "current" && currentLocationDetected && (
              <HiCheckCircle className="text-emerald-600 text-lg" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleModeChange("manual")}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-semibold transition-all ${
              locationMode === "manual"
                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                : "border-gray-300 bg-white text-gray-700 hover:border-emerald-400"
            }`}
          >
            <span>🏠</span>
            <span>Enter Address</span>
            {locationMode === "manual" && addressText && (
              <HiCheckCircle className="text-emerald-600 text-lg" />
            )}
          </button>
        </div>
      </div>

      {/* Current Location Mode */}
      {locationMode === "current" && (
        <div className="bg-white border border-emerald-200 rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Current Location</p>
              <p className="text-xs text-gray-500">
                {gettingLocation
                  ? "Detecting your location..."
                  : currentLocationDetected
                  ? "Location detected"
                  : "Click detect to use your GPS"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={gettingLocation}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {gettingLocation ? "Detecting..." : "Detect Location"}
            </button>
          </div>

          {currentLocationDetected && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-start gap-3">
                <HiCheckCircle className="text-emerald-600 text-xl flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  {addressText && (
                    <p className="text-sm text-gray-700">{addressText}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {coords[1].toFixed(6)}°N, {coords[0].toFixed(6)}°E
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Address Mode */}
      {locationMode === "manual" && (
        <div className="space-y-3">
          {/* Location Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔍 Search for Location
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search 'Thamel', 'Asan', 'Bhaktapur', etc."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
              />

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
                  {searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectLocation(result)}
                      className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b last:border-b-0 transition"
                    >
                      <p className="font-semibold text-gray-900 text-sm">
                        {result.name || result.display_name.split(",")[0]}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {result.display_name}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {isSearching && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg p-3 text-center shadow-lg z-20">
                  <div className="inline-block animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                  <span className="ml-2 text-sm text-gray-600">Searching...</span>
                </div>
              )}
            </div>
          </div>

          {/* Selected Address Display */}
          {addressText && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-start gap-2">
                <HiMapPin className="text-emerald-600 text-xl flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-emerald-700 font-semibold">Selected Location:</p>
                  <p className="text-sm text-gray-700 mt-1">{addressText}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {coords[1].toFixed(4)}°N • {coords[0].toFixed(4)}°E
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Landmark - Available in Both Modes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          🏢 Landmark (Optional)
        </label>
        <input
          type="text"
          placeholder="e.g., 'Near Bhatbhateni', 'Opposite King's College', 'Red Building'..."
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
        />
        <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
          <span>💡</span>
          <span>Add landmarks to help your provider find the location easily</span>
        </p>
      </div>

      {/* Map Preview */}
      <button
        type="button"
        onClick={() => setShowMap(!showMap)}
        className="w-full px-4 py-2 border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 rounded-lg font-medium transition"
      >
        {showMap ? "🗺️ Hide Map Preview" : "🗺️ Show on Map"}
      </button>

      {showMap && (
        <div className="mt-2 relative rounded-lg overflow-hidden border-2 border-gray-300 shadow-lg">
          <div className="w-full h-64 bg-gray-100">
            <MapPreview coords={coords} />
          </div>
          <p className="text-xs text-gray-500 p-2 bg-gray-50 flex items-center gap-2">
            <HiMapPin className="text-emerald-600" />
            <span>Map preview - Provider will confirm exact location before service</span>
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Map preview using Leaflet
 */
function MapPreview({ coords }) {
  const mapRef = React.useRef(null);
  const mapInstance = React.useRef(null);
  const markerInstance = React.useRef(null);

  React.useEffect(() => {
    if (!window.L) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => initMap();
      document.body.appendChild(script);
    } else {
      initMap();
    }
  }, [coords]);

  function initMap() {
    if (!mapRef.current) return;

    const [lng, lat] = coords;

    if (!mapInstance.current) {
      mapInstance.current = window.L.map(mapRef.current).setView([lat, lng], 15);

      window.L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }
      ).addTo(mapInstance.current);
    }

    mapInstance.current.setView([lat, lng], 15);

    if (markerInstance.current) {
      mapInstance.current.removeLayer(markerInstance.current);
    }

    markerInstance.current = window.L.marker([lat, lng])
      .addTo(mapInstance.current)
      .bindPopup("📍 Service Location");
  }

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
}

