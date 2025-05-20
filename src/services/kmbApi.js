const API_BASE_URL = "https://data.etabus.gov.hk/v1/transport/kmb";

// Helper to process ETA data from API
// Groups ETAs by route, direction, destination, and service_type
// Then picks the first service_type with valid ETAs for each group
// And limits to 3 ETAs
const processRawEtaData = (rawData) => {
  if (!rawData || !rawData.data || rawData.data.length === 0) {
    return [];
  }

  const groupedByRouteDest = rawData.data.reduce((acc, etaEntry) => {
    const key = `${etaEntry.route}-${etaEntry.dir}-${etaEntry.dest_en || etaEntry.dest_tc}`;
    if (!acc[key]) {
      acc[key] = {
        route: etaEntry.route,
        dir: etaEntry.dir,
        dest_en: etaEntry.dest_en,
        dest_tc: etaEntry.dest_tc,
        dest_sc: etaEntry.dest_sc,
        seq: etaEntry.seq, // Keep the stop sequence for this route at this stop
        service_types: {},
      };
    }
    if (!acc[key].service_types[etaEntry.service_type]) {
      acc[key].service_types[etaEntry.service_type] = [];
    }
    acc[key].service_types[etaEntry.service_type].push({
      eta: etaEntry.eta,
      eta_seq: etaEntry.eta_seq,
      rmk_en: etaEntry.rmk_en,
      rmk_tc: etaEntry.rmk_tc,
      rmk_sc: etaEntry.rmk_sc,
    });
    return acc;
  }, {});

  const processedEtas = Object.values(groupedByRouteDest).map(group => {
    let chosenServiceTypeEtas = [];
    // Iterate service types (e.g., '1', '2') and pick the first one with ETAs
    const serviceTypeKeys = Object.keys(group.service_types).sort();

    for (const stKey of serviceTypeKeys) {
      const etasForServiceType = group.service_types[stKey]
        .filter(e => e.eta) // Only consider entries with an ETA timestamp
        .sort((a, b) => new Date(a.eta) - new Date(b.eta)) // Sort by ETA time
        .slice(0, 3); // Take up to 3

      if (etasForServiceType.length > 0) {
        chosenServiceTypeEtas = etasForServiceType;
        break; // Found ETAs for this service type, use them
      }
    }
    
    // If no timed ETAs, check for remarks-only entries (e.g. "No service")
    if (chosenServiceTypeEtas.length === 0) {
        for (const stKey of serviceTypeKeys) {
            const remarksOnlyEtas = group.service_types[stKey]
                .filter(e => !e.eta && (e.rmk_en || e.rmk_tc || e.rmk_sc))
                .slice(0,1); // Take one remark if available
            if (remarksOnlyEtas.length > 0) {
                chosenServiceTypeEtas = remarksOnlyEtas;
                break;
            }
        }
    }


    return {
      ...group,
      etas: chosenServiceTypeEtas, // This now contains up to 3 ETAs from the chosen service type
    };
  }).filter(group => group.etas.length > 0); // Only keep routes that have some ETA or remark

  // Sort routes based on problem description
  // 1. Letter Prefix (A-Z, no prefix first).
  // 2. Length of the main numeric part of the route (shorter first).
  // 3. The main numeric part itself (lexicographical).
  // 4. Suffix (A-Z).
  // 5. Routes with only remarks (no timed ETAs) are pushed to the bottom.
  const parseRouteDetails = (routeStr) => {
    const match = routeStr.match(/^([A-Z]*)(\d+)([A-Z]*)$/i);
    if (match) {
      return { prefix: match[1].toUpperCase(), numStr: match[2], numVal: parseInt(match[2],10), suffix: match[3].toUpperCase() };
    }
    // Fallback for routes like 'N11', 'X42P'
    const prefixMatch = routeStr.match(/^([A-Z]+)/i);
    const suffixMatch = routeStr.match(/([A-Z]+)$/i);
    const numOnlyMatch = routeStr.match(/(\d+)/);

    let prefix = prefixMatch ? prefixMatch[1].toUpperCase() : "";
    let numStr = numOnlyMatch ? numOnlyMatch[1] : routeStr.replace(prefix, "").replace(suffixMatch ? suffixMatch[1].toUpperCase() : "", "");
    let suffix = suffixMatch && suffixMatch.index > (prefixMatch ? prefixMatch[0].length-1 : -1) && suffixMatch.index > (numOnlyMatch ? numOnlyMatch.index + numOnlyMatch[0].length -1 : -1) ? suffixMatch[1].toUpperCase() : "";
    if (prefix && numStr === routeStr.replace(prefix,"")) numStr = routeStr.replace(prefix,"").replace(suffix,"");


    return { prefix, numStr, numVal: parseInt(numStr, 10) || Infinity, suffix };
  };

  processedEtas.sort((a, b) => {
    const aDetails = parseRouteDetails(a.route);
    const bDetails = parseRouteDetails(b.route);

    const aHasTimedEta = a.etas.some(e => e.eta);
    const bHasTimedEta = b.etas.some(e => e.eta);

    if (aHasTimedEta && !bHasTimedEta) return -1;
    if (!aHasTimedEta && bHasTimedEta) return 1;

    if (aDetails.prefix && !bDetails.prefix) return -1;
    if (!aDetails.prefix && bDetails.prefix) return 1;
    if (aDetails.prefix < bDetails.prefix) return -1;
    if (aDetails.prefix > bDetails.prefix) return 1;
    
    if (aDetails.numStr.length < bDetails.numStr.length) return -1;
    if (aDetails.numStr.length > bDetails.numStr.length) return 1;
    
    if (aDetails.numStr < bDetails.numStr) return -1;
    if (aDetails.numStr > bDetails.numStr) return 1;

    if (aDetails.suffix < bDetails.suffix) return -1;
    if (aDetails.suffix > bDetails.suffix) return 1;
    
    return 0;
  });


  return processedEtas;
};


export const fetchStopList = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/stop`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // console.log("Raw Stop List:", data.data.slice(0,5));
    return data.data; // Assuming data is an array of stop objects
  } catch (error) {
    console.error("Failed to fetch stop list:", error);
    throw error; // Re-throw to be caught by caller
  }
};

export const fetchStopEta = async (stopId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/stop-eta/${stopId}`);
    if (!response.ok) {
      // KMB API returns 422 for invalid stop ID, but might also be other errors
      const errorBody = await response.json().catch(() => ({ message: "Unknown API error" }));
      console.error(`HTTP error! status: ${response.status}`, errorBody);
      throw new Error(errorBody.message || `Failed to fetch ETA for stop ${stopId}`);
    }
    const rawData = await response.json();
    // console.log(`Raw ETA for ${stopId}:`, rawData);
    return processRawEtaData(rawData);
  } catch (error) {
    console.error(`Failed to fetch ETA for stop ${stopId}:`, error);
    throw error;
  }
};

// Placeholder for Pak Hung House Stop IDs - REPLACE WITH ACTUAL 16-CHAR KMB IDs
export const PAK_HUNG_HOUSE_STOP_GROUPS = {
  EASTBOUND: [
    { kmb_id: "942E95B4336BDFA7", platform_code: "Wt230", name: "Pak Hung House (Eastbound)" },
    { kmb_id: "29740CCBBD82FC33", platform_code: "Wt231", name: "Pak Hung House (Eastbound)" },
    { kmb_id: "9A16E73DC0B9AF6C", platform_code: "Wt232", name: "Pak Hung House (Eastbound)" },
  ],
  WESTBOUND: [
    { kmb_id: "58611212645F0AB1", platform_code: "Wt614", name: "Pak Hung House (Westbound)" },
    { kmb_id: "3BA9C90738A8600D", platform_code: "Wt615", name: "Pak Hung House (Westbound)" },
  ],
};
// Example (You need to find these for Pak Hung House):
// Sau Mau Ping (Central) Stop ID: A3ADFCDF8487ADB9 (from API docs)
// Laguna City Stop ID: A60AE774B09A5E44 (from API docs)
