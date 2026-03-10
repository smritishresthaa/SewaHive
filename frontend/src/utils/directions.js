export async function fetchDrivingRoute({ fromLat, fromLng, toLat, toLng, signal }) {
  const hasValidCoords = [fromLat, fromLng, toLat, toLng].every(
    (value) => typeof value === "number" && Number.isFinite(value)
  );

  if (!hasValidCoords) return null;

  const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

  const response = await fetch(url, { signal });
  if (!response.ok) return null;

  const data = await response.json();
  const route = data?.routes?.[0];
  if (!route?.geometry?.coordinates?.length) return null;

  const path = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

  return {
    path,
    distanceMeters: Number(route.distance || 0),
    durationSeconds: Number(route.duration || 0),
  };
}
