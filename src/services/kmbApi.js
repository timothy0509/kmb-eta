// src/services/kmbApi.js
import { toTitleCase } from '../utils/textFormat'; // Assuming textFormat.js is in src/utils/

const API_BASE_URL = "https://data.etabus.gov.hk/v1/transport/kmb";

async function fetchData(url) {
  // console.log(`Fetching data from: ${url}`); // Uncomment for debugging
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Could not read error body");
      console.error(`HTTP error! Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
      throw new Error(`API Error ${response.status} for ${url}.`);
    }
    const data = await response.json();
    // console.log(`Successfully fetched data from: ${url}`); // Uncomment for debugging
    return data;
  } catch (error) {
      console.error(`Fetch error for URL ${url}:`, error);
      throw error;
  }
}

// Processes individual stop entries from /stop API
function processStopEntry(entry) {
  return {
    ...entry,
    name_en: toTitleCase(entry.name_en),
    // name_tc and name_sc are usually already in their correct form
  };
}

// Processes individual ETA entries from /stop-eta or /route-eta
function processEtaEntry(entry) {
  return {
    ...entry,
    dest_en: toTitleCase(entry.dest_en),
    // Remarks (rmk_en, rmk_tc, rmk_sc) are generally left as is from API
  };
}

export const fetchStopList = async () => {
  const data = await fetchData(`${API_BASE_URL}/stop`);
  if (!data || !Array.isArray(data.data)) {
      console.error("No data received from /stop API or data.data is not an array");
      throw new Error("Failed to fetch stop list: Invalid API response.");
  }
  return data.data.map(processStopEntry); // Apply title case to stop names
};

// Processes raw ETA data from API for a single stop
// Groups ETAs by route, direction, destination, and service_type
// Then picks the first service_type with valid ETAs for each group
// And limits to 3 ETAs
const processRawEtaData = (rawData) => {
  if (!rawData || !Array.isArray(rawData.data)) {
    return [];
  }

  const processedApiData = rawData.data.map(processEtaEntry); // Title case dest_en here

  const groupedByRouteDestService = processedApiData.reduce((acc, etaEntry) => {
    // Using a more stable key that includes service_type initially for grouping
    const key = `${etaEntry.route}-${etaEntry.dir}-${toTitleCase(etaEntry.dest_en)}-${etaEntry.dest_tc}-${etaEntry.service_type}`;
    if (!acc[key]) {
      acc[key] = {
        route: etaEntry.route,
        dir: etaEntry.dir, // 'I' or 'O'
        service_type: etaEntry.service_type,
        dest_en: toTitleCase(etaEntry.dest_en), // Ensure consistent casing
        dest_tc: etaEntry.dest_tc,
        dest_sc: etaEntry.dest_sc,
        seq: etaEntry.seq, // Stop sequence on this route
        // Store original stop ID if needed for platform identification later, though MainPage handles platform grouping
        stop: etaEntry.stop,
        arrivals: [], // To store individual arrival times { eta, eta_seq, rmk_en, rmk_tc, rmk_sc }
      };
    }
    acc[key].arrivals.push({
      eta: etaEntry.eta,
      eta_seq: etaEntry.eta_seq,
      rmk_en: etaEntry.rmk_en,
      rmk_tc: etaEntry.rmk_tc,
      rmk_sc: etaEntry.rmk_sc,
    });
    return acc;
  }, {});


  // Now, consolidate by route & destination, picking the best service_type
  const finalGroupedEtas = {};
  Object.values(groupedByRouteDestService).forEach(group => {
    const routeDestKey = `${group.route}-${group.dir}-${group.dest_en}-${group.dest_tc}`;
    if (!finalGroupedEtas[routeDestKey] ||
        (finalGroupedEtas[routeDestKey].arrivals.length === 0 && group.arrivals.length > 0) ||
        (group.arrivals.some(a => a.eta) && !finalGroupedEtas[routeDestKey].arrivals.some(a => a.eta)) // Prefer service type with timed ETAs
    ) {
        // Sort arrivals within this service_type group by eta_seq then by time
        group.arrivals.sort((a, b) => {
            if (a.eta_seq !== b.eta_seq) return (a.eta_seq || Infinity) - (b.eta_seq || Infinity);
            return new Date(a.eta) - new Date(b.eta);
        });

        finalGroupedEtas[routeDestKey] = {
            route: group.route,
            dir: group.dir,
            dest_en: group.dest_en,
            dest_tc: group.dest_tc,
            dest_sc: group.dest_sc,
            seq: group.seq,
            stop: group.stop, // Keep original stop ID for reference
            // 'etas' will be the final list of up to 3 arrivals for display
            // If no timed ETAs, take the first remark-only entry.
            etas: group.arrivals.filter(a => a.eta).slice(0, 3).length > 0
                  ? group.arrivals.filter(a => a.eta).slice(0, 3)
                  : group.arrivals.filter(a => a.rmk_en || a.rmk_tc || a.rmk_sc).slice(0,1),
            // Keep a general remark if all arrivals are remark-only or if the first timed ETA has no specific remark
            // This logic might need refinement based on desired remark display hierarchy
            rmk_en: group.arrivals[0]?.rmk_en,
            rmk_tc: group.arrivals[0]?.rmk_tc,
            rmk_sc: group.arrivals[0]?.rmk_sc,
        };
    }
  });


  const resultList = Object.values(finalGroupedEtas).filter(group => group.etas.length > 0);

  // Sort routes (from your vanilla JS logic, adapted)
  const parseRouteForSorting = (routeStr) => {
    if (!routeStr) return { prefix: '', mainNumStr: '', mainNumLen: 0, suffix: '', original: '' };
    const upperRoute = routeStr.toUpperCase();
    // More robust regex to capture prefix, number, and suffix
    const match = upperRoute.match(/^([A-Z]*)(\d+)([A-Z]*)$/i) || upperRoute.match(/^([A-Z]+)(\d*)$/i) || upperRoute.match(/^(\d+)([A-Z]*)$/i);
    let prefix = '', mainNumStr = '', suffix = '';

    if (match && match[1] && !isNaN(parseInt(match[1]))) { // Starts with number
        mainNumStr = match[1];
        suffix = match[2] || '';
    } else if (match) {
        prefix = match[1] || '';
        mainNumStr = match[2] || '';
        suffix = match[3] || '';
    } else { // Fallback if no clear numeric part (e.g., special routes)
        prefix = upperRoute;
    }
    return { prefix, mainNumStr, mainNumLen: mainNumStr.length, suffix, original: routeStr };
  };


  resultList.sort((groupA, groupB) => {
    const routeA = parseRouteForSorting(groupA.route);
    const routeB = parseRouteForSorting(groupB.route);

    const hasTimedEtasA = groupA.etas.some(e => e.eta);
    const hasTimedEtasB = groupB.etas.some(e => e.eta);

    if (hasTimedEtasA && !hasTimedEtasB) return -1;
    if (!hasTimedEtasA && hasTimedEtasB) return 1;

    if (routeA.prefix < routeB.prefix) return -1; if (routeA.prefix > routeB.prefix) return 1;
    if (routeA.mainNumLen < routeB.mainNumLen) return -1; if (routeA.mainNumLen > routeB.mainNumLen) return 1;
    if (routeA.mainNumStr < routeB.mainNumStr) return -1; if (routeA.mainNumStr > routeB.mainNumStr) return 1;
    if (routeA.suffix < routeB.suffix) return -1; if (routeA.suffix > routeB.suffix) return 1;
    return 0;
  });

  return resultList;
};


export const fetchStopEta = async (stopId) => {
  const data = await fetchData(`${API_BASE_URL}/stop-eta/${stopId}`);
  return processRawEtaData(data); // processRawEtaData now handles title casing internally
};

// Placeholder for Pak Hung House Stop IDs - REPLACE WITH ACTUAL 16-CHAR KMB IDs
export const PAK_HUNG_HOUSE_STOP_GROUPS = {
  EASTBOUND: [
    { kmb_id: "PLACEHOLDER_ID_WT230", platform_code: "Wt230", name: "Pak Hung House (Eastbound)" },
    { kmb_id: "PLACEHOLDER_ID_WT231", platform_code: "Wt231", name: "Pak Hung House (Eastbound)" },
    { kmb_id: "PLACEHOLDER_ID_WT232", platform_code: "Wt232", name: "Pak Hung House (Eastbound)" },
  ],
  WESTBOUND: [
    { kmb_id: "PLACEHOLDER_ID_WT614", platform_code: "Wt614", name: "Pak Hung House (Westbound)" },
    { kmb_id: "PLACEHOLDER_ID_WT615", platform_code: "Wt615", name: "Pak Hung House (Westbound)" },
  ],
};
