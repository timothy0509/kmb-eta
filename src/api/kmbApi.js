const BASE_URL = "https://data.etabus.gov.hk/v1/transport/kmb";

/**
 * fetchStops - returns array of stops (cached in-memory for session)
 * getETAByStopName - returns array of { stop, eta: [...] } (already implemented previously)
 */

let _stopsCache = null;

export async function fetchStops() {
  if (_stopsCache) return _stopsCache;
  const res = await fetch(`${BASE_URL}/stop`);
  const data = await res.json();
  _stopsCache = data.data || [];
  return _stopsCache;
}

export async function fetchStopsRaw() {
  return fetchStops();
}

// This function expected by earlier components: getETAByStopName
export async function getETAByStopName(stopName, routeFilters = []) {
  // simple approach: search stops by partial match in fetched stops,
  // then call stop-eta API for each matching stop and return combined format.
  // But previous code expected a single API that returns combined entries.
  // To keep compatibility with prior code, we'll do this:
  // - search stops via fetchStops()
  // - for each matched stop, call /stop-eta/{stop}
  // - then filter etas by routeFilters if provided
  const stops = await fetchStops();
  const q = (stopName || "").toLowerCase();
  const matched = stops.filter((s) => {
    const nameEn = (s.name_en || "").toLowerCase();
    const nameTc = (s.name_tc || "").toLowerCase();
    const nameSc = (s.name_sc || "").toLowerCase();
    return (
      (!q ||
        nameEn.includes(q) ||
        nameTc.includes(q) ||
        nameSc.includes(q))
    );
  });

  // limit number of stops to avoid too many requests
  const limited = matched.slice(0, 10);
  const result = [];
  for (const s of limited) {
    try {
      const r = await fetch(`${BASE_URL}/stop-eta/${s.stop}`);
      const d = await r.json();
      let etas = d.data || [];
      if (routeFilters && routeFilters.length > 0) {
        const filters = new Set(routeFilters.map((r) => r.toUpperCase()));
        etas = etas.filter((e) => filters.has((e.route || "").toUpperCase()));
      }
      result.push({ stop: s, eta: etas });
    } catch (err) {
      console.error("stop-eta error", err);
    }
  }
  return result;
}