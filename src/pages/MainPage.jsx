import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { fetchStopList, fetchStopEta } from "../services/kmbApi";
import ETATable from "../components/eta/ETATable";
import styles from "./MainPage.module.css";

const MainPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [stopQuery, setStopQuery] = useState(searchParams.get("stop") || "");
  const [routeQuery, setRouteQuery] = useState(searchParams.get("routes") || "");
  const [smartGrouping, setSmartGrouping] = useState(true); // Default to true

  const [allStops, setAllStops] = useState([]);
  const [searchResults, setSearchResults] = useState([]); // [{stopInfo, etas}]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load all stops (cached)
  useEffect(() => {
    const loadStops = async () => {
      try {
        const cachedStops = localStorage.getItem("kmb-all-stops");
        const cacheTime = localStorage.getItem("kmb-all-stops-time");
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;

        if (cachedStops && cacheTime && (Date.now() - parseInt(cacheTime)) < ONE_DAY_MS) {
          setAllStops(JSON.parse(cachedStops));
        } else {
          setLoading(true);
          const stops = await fetchStopList();
          setAllStops(stops);
          localStorage.setItem("kmb-all-stops", JSON.stringify(stops));
          localStorage.setItem("kmb-all-stops-time", Date.now().toString());
          setLoading(false);
        }
      } catch (e) {
        setError("Failed to load bus stop list. Please try refreshing.");
        setLoading(false);
      }
    };
    loadStops();
  }, []);

  const parseQueryFromURL = (qParam) => {
    if (!qParam) return { routes: "", stop: "" };
    const parts = qParam.split("%20@%20");
    if (parts.length === 2) {
      return { routes: decodeURIComponent(parts[0]), stop: decodeURIComponent(parts[1]) };
    } else if (qParam.includes("%20@%20")) { // Only stop name
      return { routes: "", stop: decodeURIComponent(parts[0]) };
    }
    // If no "@" assume it's a stop name or route
    // For simplicity, let's assume it's a stop name if no "@"
    // Or you can try to parse if it's just routes
    if (/^[A-Za-z0-9,]+$/.test(qParam) && !/[\u4e00-\u9fa5]/.test(qParam) && !qParam.includes(" ")) {
        // Likely routes only
        return { routes: decodeURIComponent(qParam), stop: "" };
    }
    return { routes: "", stop: decodeURIComponent(qParam) };
  };


  // Handle URL parameter search
  useEffect(() => {
    const qParam = searchParams.get("q");
    if (qParam) {
      const { routes, stop } = parseQueryFromURL(qParam);
      setRouteQuery(routes);
      setStopQuery(stop);
      if (stop || routes) { // Trigger search if there's something to search
        handleSearch(null, stop, routes);
      }
    }
  }, [searchParams]); // Removed allStops from dependency array to avoid re-triggering search on stop list load


const getSmartGroupNameAndPlatform = (stopNameInput) => {
    if (!stopNameInput) return { groupName: "Unknown Stop", platform: null };
    const stopName = String(stopNameInput); // Ensure it's a string

    // Group by stop name, excluding any words in brackets
    const groupName = stopName.replace(/\s*\(.*?\)\s*/g, "").replace(/\s*（.*?）\s*/g, "").trim();

    // Extract platform from bracketed content if it looks like a platform
    let platform = null;
    const bracketMatch = stopName.match(/\(([^)]+)\)/) || stopName.match(/（([^）]+)）/);
    if (bracketMatch && bracketMatch[1]) {
        const contentInBrackets = bracketMatch[1].toLowerCase();
        // Basic check for platform-like terms
        if (contentInBrackets.includes("platform") || contentInBrackets.includes("plat.") || contentInBrackets.includes("月台") || contentInBrackets.includes("巴士總站") || contentInBrackets.match(/[a-z]\d|\d[a-z]/)) {
            platform = bracketMatch[1].trim();
        }
    }
    // If no specific platform found in brackets, but the original name differs from groupName,
    // it implies the bracketed part was the differentiator.
    if (!platform && stopName.trim() !== groupName) {
        platform = stopName.replace(groupName, "").trim();
    }


    return { groupName: groupName || "Unnamed Stop Group", platform: platform };
  };

  const handleSearch = useCallback(async (event, currentStopQuery = stopQuery, currentRouteQuery = routeQuery) => {
    if (event) event.preventDefault();
    if (!currentStopQuery && !currentRouteQuery) {
      setSearchResults([]);
      setError("Please enter a stop name or route to search.");
      return;
    }
    if (allStops.length === 0 && !loading) { // if allStops is empty and not currently loading them
        setError("Stop list not loaded yet. Please wait or try refreshing.");
        return;
    }


    setLoading(true);
    setError(null);
    setSearchResults([]);

    // Update URL
    const newSearchParams = new URLSearchParams();
    if (currentRouteQuery && currentStopQuery) {
        newSearchParams.set("q", `${encodeURIComponent(currentRouteQuery)}%20@%20${encodeURIComponent(currentStopQuery)}`);
    } else if (currentStopQuery) {
        newSearchParams.set("q", encodeURIComponent(currentStopQuery));
    } else if (currentRouteQuery) {
        newSearchParams.set("q", encodeURIComponent(currentRouteQuery));
    }
    navigate(`?${newSearchParams.toString()}`, { replace: true });


    let filteredStops = allStops;
    if (currentStopQuery) {
        const queryLower = currentStopQuery.toLowerCase();
        filteredStops = allStops.filter(
            (stop) =>
            stop.name_en?.toLowerCase().includes(queryLower) ||
            stop.name_tc?.includes(currentStopQuery) || // TC/SC exact for simplicity here
            stop.name_sc?.includes(currentStopQuery)
        );
    }


    if (filteredStops.length === 0 && currentStopQuery) {
      setError(`No stops found matching "${currentStopQuery}".`);
      setLoading(false);
      return;
    }
    if (filteredStops.length > 20 && currentStopQuery) { // Limit results if too broad
        setError(`Over 20 stops found for "${currentStopQuery}". Please be more specific.`);
        setLoading(false);
        return;
    }


    try {
      const resultsPromises = filteredStops.map(async (stop) => {
        try {
          let etas = await fetchStopEta(stop.stop);
          if (currentRouteQuery) {
            const searchRoutes = currentRouteQuery.split(",").map(r => r.trim().toUpperCase());
            etas = etas.filter(eta => searchRoutes.includes(eta.route.toUpperCase()));
          }
          return { stopInfo: stop, etas: etas };
        } catch (e) {
          console.warn(`Failed to get ETA for stop ${stop.name_en || stop.name_tc} (${stop.stop})`, e);
          return { stopInfo: stop, etas: [], error: e.message }; // Include error for this specific stop
        }
      });

      const resultsWithEtas = (await Promise.all(resultsPromises)).filter(r => r.etas.length > 0 || r.error);
      
      if (smartGrouping && currentStopQuery) { // Only group if there was a stop query
        const groupedResults = {};
        resultsWithEtas.forEach(res => {
            const { groupName, platform } = getSmartGroupNameAndPlatform(res.stopInfo.name_tc || res.stopInfo.name_en);
            if (!groupedResults[groupName]) {
                groupedResults[groupName] = {
                    groupName: groupName,
                    platforms: [],
                    showPlatformCol: false,
                };
            }
            groupedResults[groupName].platforms.push({
                ...res.stopInfo,
                etas: res.etas,
                platform_display_name: platform || res.stopInfo.name_tc || res.stopInfo.name_en, // Use platform or full name
                error: res.error,
            });
        });

        const finalGrouped = Object.values(groupedResults).map(group => {
            // Check if platform column is needed (more than one distinct platform name part)
            const platformNames = new Set(group.platforms.map(p => getSmartGroupNameAndPlatform(p.name_tc || p.name_en).platform));
            group.showPlatformCol = platformNames.size > 1 && Array.from(platformNames).some(p => p !== null); // Only if multiple *distinct* platforms
            return group;
        });
        setSearchResults(finalGrouped);

      } else {
        setSearchResults(resultsWithEtas.map(r => ({ // Adapt to the structure expected by ETATable if not grouping
            groupName: r.stopInfo.name_tc || r.stopInfo.name_en,
            platforms: [{...r.stopInfo, etas: r.etas, error: r.error}],
            showPlatformCol: false,
        })));
      }


    } catch (e) {
      setError("An error occurred while fetching ETAs.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [allStops, stopQuery, routeQuery, smartGrouping, navigate]);


  return (
    <div className={styles.mainPage}>
      <h1>Search KMB Bus ETAs</h1>
      <form onSubmit={(e) => handleSearch(e)} className={`${styles.searchForm} card`}>
        <div className={styles.formGroup}>
          <label htmlFor="stopQuery">Bus Stop Name (EN/TC/SC)</label>
          <input
            type="search"
            id="stopQuery"
            value={stopQuery}
            onChange={(e) => setStopQuery(e.target.value)}
            placeholder="e.g., Mong Kok, 旺角, 彌敦道"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="routeQuery">Route(s) (optional, comma-separated)</label>
          <input
            type="search"
            id="routeQuery"
            value={routeQuery}
            onChange={(e) => setRouteQuery(e.target.value)}
            placeholder="e.g., 1A, 271, N293"
          />
        </div>
        <div className={styles.formActions}>
            <div className={styles.checkboxGroup}>
                <input
                    type="checkbox"
                    id="smartGrouping"
                    checked={smartGrouping}
                    onChange={(e) => setSmartGrouping(e.target.checked)}
                />
                <label htmlFor="smartGrouping">Enable Smart Grouping</label>
            </div>
            <button type="submit" disabled={loading || allStops.length === 0}>
                {loading ? "Searching..." : "Search"}
            </button>
        </div>
      </form>

      {error && <p className={styles.error}>{error}</p>}
      
      <div className={styles.resultsArea}>
        {searchResults.length > 0 && searchResults.map((group, index) => (
            <div key={group.groupName + index} className={styles.groupContainer}>
                {smartGrouping && searchResults.length > 0 && <h2>{group.groupName}</h2>}
                {group.platforms.map((platformStop, pIndex) => (
                    platformStop.error ? 
                    <div key={pIndex} className={`${styles.errorCard} card`}>
                        <h3>{platformStop.name_tc || platformStop.name_en}</h3>
                        <p>Error fetching ETAs: {platformStop.error}</p>
                    </div>
                    :
                    <ETATable
                        key={pIndex}
                        stopName={smartGrouping ? platformStop.platform_display_name : (platformStop.name_tc || platformStop.name_en)}
                        etas={platformStop.etas}
                        showPlatformCol={group.showPlatformCol && smartGrouping}
                        platformCode={group.showPlatformCol && smartGrouping ? (getSmartGroupNameAndPlatform(platformStop.name_tc || platformStop.name_en).platform || '---') : null}
                    />
                ))}
            </div>
        ))}
        {loading && searchResults.length === 0 && <p>Loading results...</p>}
      </div>
    </div>
  );
};

export default MainPage;
