// src/api/kmbApi.js

const BASE_URL = "https://data.etabus.gov.hk/v1/transport/kmb";

/**
 * Fetch all stops
 */
export async function fetchStops() {
  const res = await fetch(`${BASE_URL}/stop`);
  const data = await res.json();
  return data.data || [];
}

/**
 * Search stops by partial name (EN, TC, SC)
 */
export async function searchStops(query) {
  const stops = await fetchStops();
  const q = query.toLowerCase();
  return stops.filter(
    (s) =>
      s.name_en.toLowerCase().includes(q) ||
      s.name_tc.includes(query) ||
      s.name_sc.includes(query)
  );
}

/**
 * Fetch ETA for a stop
 */
export async function fetchStopETA(stopId) {
  const res = await fetch(`${BASE_URL}/stop-eta/${stopId}`);
  const data = await res.json();
  return data.data || [];
}

/**
 * Get ETA for stop by name (with optional route filter)
 */
export async function getETAByStopName(stopName, routeFilters = []) {
  const stops = await searchStops(stopName);
  if (stops.length === 0) return [];

  const results = [];
  for (const stop of stops) {
    const etaData = await fetchStopETA(stop.stop);

    let filtered = etaData;
    if (routeFilters.length > 0) {
      filtered = etaData.filter((e) =>
        routeFilters.includes(e.route.toUpperCase())
      );
    }

    results.push({
      stop,
      eta: filtered,
    });
  }

  return results;
}